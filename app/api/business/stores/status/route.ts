import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { calculateChecklistProgress } from '@/lib/utils/checklist'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view store status')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 회사에 속한 모든 매장 조회
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, address, management_days, updated_at')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (storesError) {
      throw new Error(`Failed to fetch stores: ${storesError.message}`)
    }

    if (!stores || stores.length === 0) {
      return Response.json({
        success: true,
        data: [],
        last_modified_at: new Date().toISOString(),
      })
    }

    // 오늘 날짜
    const todayDate = new Date().toISOString().split('T')[0]
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // 오늘 요일 확인
    const today = new Date()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[today.getDay()]

    // 각 매장별 상태 조회
    const storeStatuses = await Promise.all(
      stores.map(async (store) => {
        // 오늘이 출근일인지 확인
        const isWorkDay = store.management_days
          ? store.management_days.split(',').map((d) => d.trim()).includes(todayDayName)
          : false

        // 오늘 출근 정보
        const { data: todayAttendance } = await supabase
          .from('attendance')
          .select('clock_in_at, clock_out_at, user_id')
          .eq('store_id', store.id)
          .eq('work_date', todayDate)
          .order('clock_in_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // 출근한 직원 정보 조회
        let staffName: string | null = null
        if (todayAttendance?.user_id) {
          const { data: staff } = await supabase
            .from('users')
            .select('name')
            .eq('id', todayAttendance.user_id)
            .single()
          staffName = staff?.name || null
        }

        // 최근 30일 문제보고 (매장 문제 보고, 자판기 내부 문제, 분실물)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        const { data: problemReports, error: problemReportsError } = await supabase
          .from('problem_reports')
          .select('id, category, status, title, created_at')
          .eq('store_id', store.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .lte('created_at', todayEnd.toISOString())

        // 분실물 조회 - 최근 30일간의 모든 분실물 (상태 업데이트 반영을 위해 날짜 제한 완화)
        const { data: lostItems } = await supabase
          .from('lost_items')
          .select('id, status, created_at, updated_at')
          .eq('store_id', store.id)
          .gte('created_at', thirtyDaysAgo.toISOString())

        // 디버깅: 실제 저장된 category 값 확인
        console.log(`\n=== Store ${store.id} (${store.name}) ===`)
        if (problemReportsError) {
          console.error('Error fetching problem reports:', problemReportsError)
        }
        console.log(`Total problem reports found: ${problemReports?.length || 0}`)
        if (problemReports && problemReports.length > 0) {
          // 모든 고유한 category 값 확인
          const uniqueCategories = [...new Set(problemReports.map((p: any) => p.category))]
          console.log(`Unique category values in DB:`, uniqueCategories)
          
          console.log('All problem reports with raw category values:')
          problemReports.forEach((p: any, index: number) => {
            console.log(`  [${index + 1}] ID: ${p.id}, Category: "${p.category}", Status: ${p.status}, Title: ${p.title?.substring(0, 40)}`)
          })
        } else {
          console.log('No problem reports found for this store')
        }

        // 문제보고 카운트 (카테고리별, 상태별)
        // category 값이 정확히 일치하지 않을 수 있으므로 다양한 형식 지원
        // 실제 저장된 값에 따라 필터링 (title이나 다른 필드로도 판단 가능)
        const storeProblemCount = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          
          // category로 직접 매칭
          const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
          
          // "자판기 고장/오류"는 매장 문제로 분류
          if (title.includes('자판기 고장') || title.includes('자판기 오류')) {
            return true
          }
          
          // "제품 걸림" 또는 "수량 오류"는 자판기 문제이므로 제외
          if (title.includes('제품 걸림') || title.includes('수량 오류')) {
            return false
          }
          
          // title에 "매장 문제"가 포함되어 있으면 매장 문제로 간주
          const titleMatch = title.includes('매장 문제') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          
          const matches = categoryMatch || titleMatch
          
          return matches
        }).length || 0
        
        const vendingProblemCount = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          
          // category로 직접 매칭
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          
          // "자판기 고장/오류"는 매장 문제이므로 제외
          if (title.includes('자판기 고장') || title.includes('자판기 오류')) {
            return false
          }
          
          // "제품 걸림" 또는 "수량 오류"는 자판기 내부 문제로 분류
          const titleMatch = title.includes('제품 걸림') || title.includes('수량 오류') || 
            (title.includes('자판기') && (title.includes('제품') || title.includes('수량')))
          
          const matches = categoryMatch || titleMatch
          
          return matches
        }).length || 0
        
        const lostItemCount = lostItems?.length || 0

        // 미처리/처리 완료 카운트 (매장 문제 보고)
        const unprocessedStoreProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
          const titleMatch = title.includes('매장 문제') || title.includes('자판기 고장') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          const isStoreProblem = categoryMatch || (titleMatch && !title.includes('자판기 수량') && !title.includes('자판기 제품 걸림'))
          return isStoreProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
        }).length || 0
        
        const completedStoreProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
          const titleMatch = title.includes('매장 문제') || title.includes('자판기 고장') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          const isStoreProblem = categoryMatch || (titleMatch && !title.includes('자판기 수량') && !title.includes('자판기 제품 걸림'))
          return isStoreProblem && p.status === 'completed'
        }).length || 0

        // 미확인/확인 카운트 (자판기 내부 문제, 분실물)
        const unconfirmedVendingProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          const titleMatch = (title.includes('자판기 수량') || title.includes('자판기 제품 걸림')) && title.includes('자판기')
          const isVendingProblem = categoryMatch || titleMatch
          return isVendingProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
        }).length || 0
        
        const confirmedVendingProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          const titleMatch = (title.includes('자판기 수량') || title.includes('자판기 제품 걸림')) && title.includes('자판기')
          const isVendingProblem = categoryMatch || titleMatch
          return isVendingProblem && p.status === 'completed'
        }).length || 0

        console.log(`Counts for ${store.name}:`, {
          storeProblemCount,
          vendingProblemCount,
          lostItemCount,
          totalProblemReports: problemReports?.length || 0,
          unprocessedStoreProblems,
          completedStoreProblems,
          unconfirmedVendingProblems,
          confirmedVendingProblems
        })
        console.log(`=== End Store ${store.id} ===\n`)

        // 분실물 상태 디버깅
        if (lostItems && lostItems.length > 0) {
          console.log(`Lost items for ${store.name}:`)
          lostItems.forEach((l: any) => {
            console.log(`  - ID: ${l.id}, Status: "${l.status}"`)
          })
        }

        // 분실물 상태별 카운트 - 'completed', 'confirmed', 'processed' 상태를 확인된 것으로 간주
        const unconfirmedLostItems = lostItems?.filter(
          (l: any) => l.status !== 'completed' && l.status !== 'confirmed' && l.status !== 'processed'
        ).length || 0
        const confirmedLostItems = lostItems?.filter(
          (l: any) => l.status === 'completed' || l.status === 'confirmed' || l.status === 'processed'
        ).length || 0

        console.log(`Lost items counts for ${store.name}: unconfirmed=${unconfirmedLostItems}, confirmed=${confirmedLostItems}`)
        console.log(`Lost items status breakdown:`, lostItems?.map((l: any) => ({ id: l.id, status: l.status })))

        // 오늘 제품 입고 사진 (type = 'receipt')
        // 테이블이 없을 수 있으므로 에러 처리 추가
        let todayProductInflow: any[] = []
        try {
          const { data, error } = await supabase
            .from('product_photos')
            .select('id')
            .eq('store_id', store.id)
            .eq('type', 'receipt')
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())
          
          if (!error && data) {
            todayProductInflow = data
          }
        } catch (error) {
          console.error(`Error fetching product inflow for store ${store.id}:`, error)
          // 테이블이 없거나 오류 발생 시 빈 배열 유지
        }

        // 최근 보관 사진 (type = 'storage') - 최신 사진만 (최대 2개)
        // 테이블이 없을 수 있으므로 에러 처리 추가
        let recentStoragePhotos: any[] = []
        try {
          const { data: recentStoragePhotosData, error: storageError } = await supabase
            .from('product_photos')
            .select('id, photo_urls, created_at')
            .eq('store_id', store.id)
            .eq('type', 'storage')
            .order('created_at', { ascending: false })
            .limit(1)

          if (!storageError && recentStoragePhotosData && recentStoragePhotosData.length > 0) {
            // photo_urls 배열에서 첫 번째 사진만 추출
            recentStoragePhotos = recentStoragePhotosData.flatMap((item: any) => {
              const urls = Array.isArray(item.photo_urls) ? item.photo_urls : []
              return urls.slice(0, 2).map((url: string, idx: number) => ({
                id: `${item.id}-${idx}`,
                photo_url: url,
              }))
            })
          }
        } catch (error) {
          console.error(`Error fetching storage photos for store ${store.id}:`, error)
          // 테이블이 없거나 오류 발생 시 빈 배열 유지
        }

        // 최근 30일 요청란 (접수, 진행중, 완료)
        let receivedRequestCount = 0
        let inProgressRequestCount = 0
        let completedRequestCount = 0
        let unconfirmedCompletedCount = 0

        try {
          const { data: recentRequests, error: requestsError } = await supabase
            .from('requests')
            .select('id, title, status, created_at')
            .eq('store_id', store.id)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })

          if (requestsError) {
            console.error(`Error fetching requests for store ${store.id} (${store.name}):`, requestsError)
            console.error('Requests error details:', JSON.stringify(requestsError, null, 2))
          } else {
            console.log(`Store ${store.id} (${store.name}): Found ${recentRequests?.length || 0} requests in last 30 days`)
            const receivedRequests = recentRequests?.filter((r: any) => r.status === 'received') || []
            const inProgressRequests = recentRequests?.filter((r: any) => r.status === 'in_progress') || []
            const completedRequests = recentRequests?.filter((r: any) => r.status === 'completed') || []
            receivedRequestCount = receivedRequests.length
            inProgressRequestCount = inProgressRequests.length
            completedRequestCount = completedRequests.length
            // confirmed_at 컬럼이 없으므로 completed 상태인 모든 요청을 미확인으로 처리
            unconfirmedCompletedCount = completedRequests.length
            console.log(`Store ${store.id} counts - received: ${receivedRequestCount}, in_progress: ${inProgressRequestCount}, completed: ${completedRequestCount}`)
          }
        } catch (error) {
          console.error(`Error processing requests for store ${store.id}:`, error)
          // 에러 발생 시 기본값 유지 (모두 0)
        }

        // 오늘 체크리스트 수행률
        const { data: todayChecklists } = await supabase
          .from('checklist')
          .select('items, updated_at')
          .eq('store_id', store.id)
          .eq('work_date', todayDate)

        // 오늘 관리전후사진
        const { data: todayCleaningPhotos } = await supabase
          .from('cleaning_photos')
          .select('id, kind, created_at')
          .eq('store_id', store.id)
          .neq('area_category', 'inventory')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())

        const beforePhotos = todayCleaningPhotos?.filter((p: any) => p.kind === 'before') || []
        const afterPhotos = todayCleaningPhotos?.filter((p: any) => p.kind === 'after') || []


        // 체크리스트 진행률 계산
        let checklistCompletionRate = 0
        let checklistCompleted = 0
        let checklistTotal = 0
        let beforePhotoCompleted = 0
        let beforePhotoTotal = 0
        let afterPhotoCompleted = 0
        let afterPhotoTotal = 0

        if (todayChecklists && todayChecklists.length > 0) {
          todayChecklists.forEach((checklist: any) => {
            const items = checklist.items || []
            items.forEach((item: any) => {
              if (item.type === 'check') {
                checklistTotal++
                if (item.checked && (item.status === 'good' || (item.status === 'bad' && item.comment))) {
                  checklistCompleted++
                }
              } else if (item.type === 'photo') {
                checklistTotal++
                beforePhotoTotal++
                afterPhotoTotal++
                if (item.before_photo_url) {
                  beforePhotoCompleted++
                }
                if (item.after_photo_url) {
                  afterPhotoCompleted++
                }
                if (item.before_photo_url && item.after_photo_url) {
                  checklistCompleted++
                }
              }
            })
          })

          const totalCompleted = checklistCompleted + beforePhotoCompleted + afterPhotoCompleted
          const totalItems = checklistTotal + beforePhotoTotal + afterPhotoTotal
          checklistCompletionRate = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
        }

        // 마지막 업데이트 시간
        let lastUpdateTime: string | null = null
        const allUpdates = [
          todayAttendance?.clock_in_at,
          todayAttendance?.clock_out_at,
          todayChecklists?.[0]?.updated_at,
          todayCleaningPhotos?.[0]?.created_at,
        ].filter(Boolean)

        if (allUpdates.length > 0) {
          lastUpdateTime = allUpdates.sort().reverse()[0]
        }

        // 출근 상태 결정
        let attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
        let clockInTime: string | null = null
        let clockOutTime: string | null = null

        if (todayAttendance) {
          if (todayAttendance.clock_out_at) {
            attendanceStatus = 'clocked_out'
            clockOutTime = todayAttendance.clock_out_at
          } else {
            attendanceStatus = 'clocked_in'
          }
          clockInTime = todayAttendance.clock_in_at
        }

        const hasProblem = storeProblemCount > 0 || vendingProblemCount > 0 || lostItemCount > 0

        return {
          store_id: store.id,
          store_name: store.name,
          store_address: store.address,
          management_days: store.management_days,
          work_day: store.management_days, // 정렬을 위해 추가
          is_work_day: isWorkDay,
          attendance_status: attendanceStatus,
          clock_in_time: clockInTime,
          clock_out_time: clockOutTime,
          staff_name: staffName,
          has_problem: hasProblem,
          // 문제 보고 카운트
          store_problem_count: storeProblemCount,
          vending_problem_count: vendingProblemCount,
          lost_item_count: lostItemCount,
          // 상태별 카운트
          unprocessed_store_problems: unprocessedStoreProblems,
          completed_store_problems: completedStoreProblems,
          unconfirmed_vending_problems: unconfirmedVendingProblems,
          confirmed_vending_problems: confirmedVendingProblems,
          unconfirmed_lost_items: unconfirmedLostItems,
          confirmed_lost_items: confirmedLostItems,
          // 제품 입고 및 보관 사진
          has_product_inflow_today: todayProductInflow.length > 0,
          has_storage_photos: recentStoragePhotos.length > 0,
          storage_photos: recentStoragePhotos,
          // 요청란
          received_request_count: receivedRequestCount,
          in_progress_request_count: inProgressRequestCount,
          completed_request_count: completedRequestCount,
          unconfirmed_completed_request_count: unconfirmedCompletedCount,
          // 체크리스트 및 사진
          before_photo_count: beforePhotos.length,
          after_photo_count: afterPhotos.length,
          checklist_completion_rate: checklistCompletionRate,
          checklist_completed: checklistCompleted,
          checklist_total: checklistTotal,
          last_update_time: lastUpdateTime,
        }
      })
    )

    // 마지막 수정 시간 계산
    const allStoreUpdates = stores.map((s) => s.updated_at).filter(Boolean)
    const lastModifiedAt = allStoreUpdates.length > 0 
      ? allStoreUpdates.sort().reverse()[0] 
      : new Date().toISOString()

    return Response.json({
      success: true,
      data: storeStatuses,
      last_modified_at: lastModifiedAt,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

