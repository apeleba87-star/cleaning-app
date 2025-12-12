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

        const { data: lostItems } = await supabase
          .from('lost_items')
          .select('id, status')
          .eq('store_id', store.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .lte('created_at', todayEnd.toISOString())

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
          
          // title에 "매장 문제"가 포함되어 있으면 매장 문제로 간주
          const titleMatch = title.includes('매장 문제') || title.includes('자판기 고장') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          
          const matches = categoryMatch || (titleMatch && !title.includes('자판기 수량') && !title.includes('자판기 제품 걸림'))
          
          return matches
        }).length || 0
        
        const vendingProblemCount = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          
          // category로 직접 매칭
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          
          // title에 "자판기"가 포함되고 "수량" 또는 "걸림"이 포함되어 있으면 자판기 문제로 간주
          const titleMatch = (title.includes('자판기 수량') || title.includes('자판기 제품 걸림')) && title.includes('자판기')
          
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

        const unconfirmedLostItems = lostItems?.filter(
          (l: any) => l.status === 'pending' || l.status === 'received' || l.status === 'submitted'
        ).length || 0
        const confirmedLostItems = lostItems?.filter(
          (l: any) => l.status === 'completed'
        ).length || 0

        // 오늘 제품 입고 사진 (product_receipt, order_sheet)
        const { data: todayProductInflow } = await supabase
          .from('inventory_photos')
          .select('id')
          .eq('store_id', store.id)
          .in('photo_type', ['product_receipt', 'order_sheet'])
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())

        // 최근 보관 사진 (store_storage, parcel_locker) - 최신 사진만 (최대 2개)
        const { data: recentStoragePhotos } = await supabase
          .from('inventory_photos')
          .select('id, photo_url')
          .eq('store_id', store.id)
          .in('photo_type', ['store_storage', 'parcel_locker'])
          .order('created_at', { ascending: false })
          .limit(2)

        // 최근 30일 요청란 (접수, 진행중, 완료)
        const { data: recentRequests } = await supabase
          .from('requests')
          .select('id, title, status, confirmed_at, created_at')
          .eq('store_id', store.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .order('created_at', { ascending: false })

        const receivedRequests = recentRequests?.filter((r: any) => r.status === 'received') || []
        const inProgressRequests = recentRequests?.filter((r: any) => r.status === 'in_progress') || []
        const completedRequests = recentRequests?.filter((r: any) => r.status === 'completed') || []
        const receivedRequestCount = receivedRequests.length
        const inProgressRequestCount = inProgressRequests.length
        const completedRequestCount = completedRequests.length
        const unconfirmedCompletedCount = completedRequests.filter((r: any) => !r.confirmed_at).length

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
          has_product_inflow_today: (todayProductInflow?.length || 0) > 0,
          has_storage_photos: (recentStoragePhotos?.length || 0) > 0,
          storage_photos: recentStoragePhotos?.map((p: any) => ({ id: p.id, photo_url: p.photo_url })) || [],
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

