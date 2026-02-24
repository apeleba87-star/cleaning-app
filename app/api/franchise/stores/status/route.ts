import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { calculateChecklistProgress } from '@/lib/utils/checklist'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST } from '@/lib/utils/date'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'franchise_manager') {
      throw new ForbiddenError('Only franchise managers can view store status')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    
    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      throw new ForbiddenError('Franchise ID is required')
    }

    const userFranchiseId = userData.franchise_id
    
    // RLS 정책 문제로 인해 stores, store_assign, attendance 조회 시 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let adminSupabase: ReturnType<typeof createClient> | null = null
    
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }
    
    const dataClient = adminSupabase || supabase
    const attendanceClient = adminSupabase || supabase

    // 프렌차이즈에 속한 모든 매장 조회 (RLS 우회 - API에서 auth.role, franchise_id 검증 완료)
    const { data: stores, error: storesError } = await dataClient
      .from('stores')
      .select('id, name, address, management_days, updated_at, service_active')
      .eq('franchise_id', userFranchiseId)
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

    // 오늘 날짜 (한국 시간 기준)
    const todayDateKST = getTodayDateKST()
    const now = new Date()
    const todayDateUTC = now.toISOString().split('T')[0]
    
    // 한국 시간 기준 오늘 00:00:00 ~ 23:59:59.999 (서버 타임존 무관하게 KST로 고정)
    const todayStart = new Date(`${todayDateKST}T00:00:00+09:00`)
    const todayEnd = new Date(`${todayDateKST}T23:59:59.999+09:00`)
    
    // 오늘 요일 확인 (한국 시간 기준)
    const kstOffset = 9 * 60
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
    const koreaTime = new Date(utc + (kstOffset * 60 * 1000))
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[koreaTime.getDay()]

    // 각 매장별 상태 조회 (업체관리자 API와 동일한 로직)
    const storeStatuses = await Promise.all(
      stores.map(async (store) => {
        try {
          const isWorkDay = store.management_days
            ? store.management_days.split(',').map((d) => d.trim()).includes(todayDayName)
            : false

          let assignedUserIds: string[] = []
          try {
            const { data: assignedStaff } = await dataClient
              .from('store_assign')
              .select('user_id')
              .eq('store_id', store.id)
            assignedUserIds = assignedStaff?.map(s => s.user_id) || []
          } catch (error) {
            assignedUserIds = []
          }

          // 출근 상태 조회 (업체관리자 앱과 동일한 방식)
          let todayAttendances: any[] = []
          try {
            // 방법 0: 배정된 직원의 user_id로 직접 조회 (직원 앱과 동일한 방식)
            let attendancesByUserId: any[] = []
            if (assignedUserIds.length > 0) {
              const { data: attendancesByUser, error: userError } = await attendanceClient
                .from('attendance')
                .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
                .in('user_id', assignedUserIds)
                .eq('work_date', todayDateKST)
                .order('clock_in_at', { ascending: false })
              
              if (!userError && attendancesByUser) {
                attendancesByUserId = (attendancesByUser || []).filter(a => a.store_id === store.id)
              }
            }

            // 방법 1: work_date로 조회 (KST와 UTC 둘 다 확인)
            const { data: attendancesByWorkDateKST, error: workDateKSTError } = await attendanceClient
              .from('attendance')
              .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
              .eq('store_id', store.id)
              .eq('work_date', todayDateKST)
              .order('clock_in_at', { ascending: false })
            
            const { data: attendancesByWorkDateUTC, error: workDateUTCError } = await attendanceClient
              .from('attendance')
              .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
              .eq('store_id', store.id)
              .eq('work_date', todayDateUTC)
              .order('clock_in_at', { ascending: false })
            
            // 방법 2: clock_in_at 범위로 조회 (가장 신뢰할 수 있는 방법)
            const { data: attendancesByClockIn, error: clockInError } = await attendanceClient
              .from('attendance')
              .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
              .eq('store_id', store.id)
              .gte('clock_in_at', todayStart.toISOString())
              .lte('clock_in_at', todayEnd.toISOString())
              .order('clock_in_at', { ascending: false })

            // 우선순위: user_id 조회 > clock_in_at 범위 조회 > work_date 조회
            if (attendancesByUserId && attendancesByUserId.length > 0) {
              todayAttendances = attendancesByUserId
            } else if (attendancesByClockIn && attendancesByClockIn.length > 0) {
              todayAttendances = attendancesByClockIn
            } else if (attendancesByWorkDateKST && attendancesByWorkDateKST.length > 0) {
              todayAttendances = attendancesByWorkDateKST
            } else if (attendancesByWorkDateUTC && attendancesByWorkDateUTC.length > 0) {
              todayAttendances = attendancesByWorkDateUTC
            } else {
              todayAttendances = []
            }
          } catch (error) {
            console.error(`Store ${store.name}: attendance 조회 중 예외 발생:`, error)
            todayAttendances = []
          }

          let staffName: string | null = null
          const latestAttendance = todayAttendances.length > 0 ? todayAttendances[0] : null
          if (latestAttendance?.user_id) {
            const { data: staff } = await dataClient
              .from('users')
              .select('name')
              .eq('id', latestAttendance.user_id)
              .single()
            staffName = staff?.name || null
          }

          // 최근 30일 문제보고 (매장 문제 보고, 자판기 내부 문제, 분실물)
          // RLS 정책 문제로 인해 서비스 역할 키 사용
          const problemReportsClient = adminSupabase || supabase
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          thirtyDaysAgo.setHours(0, 0, 0, 0)

          const { data: problemReports, error: problemReportsError } = await problemReportsClient
            .from('problem_reports')
            .select('id, category, status, title, created_at')
            .eq('store_id', store.id)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .lte('created_at', todayEnd.toISOString())

          // 분실물 조회 - 최근 30일간 생성되었거나 최근에 업데이트된 모든 분실물
          const { data: lostItems, error: lostItemsError } = await problemReportsClient
            .from('lost_items')
            .select('id, status, created_at, updated_at')
            .eq('store_id', store.id)
            .or(`created_at.gte.${thirtyDaysAgo.toISOString()},updated_at.gte.${thirtyDaysAgo.toISOString()}`)
          
          if (lostItemsError) {
            console.error(`[FRANCHISE] Error fetching lost items for store ${store.id} (${store.name}):`, lostItemsError)
          }
          
          if (problemReportsError) {
            console.error(`[FRANCHISE] Error fetching problem reports for store ${store.id} (${store.name}):`, problemReportsError)
          }

          // 문제보고 카운트 (카테고리별, 상태별)
          // category 값이 정확히 일치하지 않을 수 있으므로 다양한 형식 지원
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

          const unconfirmedVendingProblems = problemReports?.filter((p: any) => {
            const cat = String(p.category || '').toLowerCase().trim()
            const title = String(p.title || '').toLowerCase()
            const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
            const titleMatch = title.includes('제품 걸림') || title.includes('수량 오류') || 
              (title.includes('자판기') && (title.includes('제품') || title.includes('수량')))
            const isVendingProblem = categoryMatch || (titleMatch && !title.includes('자판기 고장') && !title.includes('자판기 오류'))
            return isVendingProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
          }).length || 0
          
          const confirmedVendingProblems = problemReports?.filter((p: any) => {
            const cat = String(p.category || '').toLowerCase().trim()
            const title = String(p.title || '').toLowerCase()
            const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
            const titleMatch = title.includes('제품 걸림') || title.includes('수량 오류') || 
              (title.includes('자판기') && (title.includes('제품') || title.includes('수량')))
            const isVendingProblem = categoryMatch || (titleMatch && !title.includes('자판기 고장') && !title.includes('자판기 오류'))
            return isVendingProblem && p.status === 'completed'
          }).length || 0

          const unconfirmedLostItems = lostItems?.filter((l: any) => l.status !== 'completed').length || 0
          
          const confirmedLostItems = lostItems?.filter((l: any) => l.status === 'completed').length || 0

          // 디버깅 로그
          console.log(`[FRANCHISE] Store ${store.id} (${store.name}): Problem reports summary`)
          console.log(`  - Total problem reports: ${problemReports?.length || 0}`)
          console.log(`  - Total lost items: ${lostItems?.length || 0}`)
          console.log(`  - Store problems: ${storeProblemCount}, Vending problems: ${vendingProblemCount}`)
          console.log(`  - Unprocessed store: ${unprocessedStoreProblems}, Completed store: ${completedStoreProblems}`)
          console.log(`  - Unconfirmed vending: ${unconfirmedVendingProblems}, Confirmed vending: ${confirmedVendingProblems}`)
          console.log(`  - Unconfirmed lost: ${unconfirmedLostItems}, Confirmed lost: ${confirmedLostItems}`)

          // 최근 보관 사진 (store_storage, parcel_locker) - 최대 2개
          // 테이블이 없을 수 있으므로 에러 처리 추가
          // RLS 정책 문제로 인해 서비스 역할 키 사용 (attendance와 동일)
          const productPhotosClient = adminSupabase || supabase
          
          // 오늘 제품 입고 사진 (product_receipt, order_sheet)
          // RLS 정책 문제로 인해 서비스 역할 키 사용
          const { data: todayProductInflow } = await productPhotosClient
            .from('product_photos')
            .select('id')
            .eq('store_id', store.id)
            .eq('type', 'receipt')
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())
          let storagePhotosArray: any[] = []
          try {
            // 당일 보관 사진만 (카드 썸네일)
            const { data: recentStoragePhotosData, error: storageError } = await productPhotosClient
              .from('product_photos')
              .select('id, photo_urls, created_at')
              .eq('store_id', store.id)
              .eq('type', 'storage')
              .gte('created_at', todayStart.toISOString())
              .lte('created_at', todayEnd.toISOString())
              .order('created_at', { ascending: false })
              .limit(1)

            if (storageError) {
              console.error(`Error fetching storage photos for store ${store.id} (${store.name}):`, storageError)
            }

            if (!storageError && recentStoragePhotosData && recentStoragePhotosData.length > 0) {
              // photo_urls 배열에서 첫 번째 사진만 추출
              storagePhotosArray = recentStoragePhotosData.flatMap((item: any) => {
                const urls = Array.isArray(item.photo_urls) ? item.photo_urls : []
                return urls.slice(0, 2).map((url: string, idx: number) => ({
                  id: `${item.id}-${idx}`,
                  photo_url: url,
                }))
              })
            }
          } catch (error) {
            console.error(`Error fetching storage photos for store ${store.id} (${store.name}):`, error)
            // 테이블이 없거나 오류 발생 시 빈 배열 유지
          }

          const { data: recentRequests } = await dataClient
            .from('requests')
            .select('id, title, status, created_at')
            .eq('store_id', store.id)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })

          const receivedRequestCount = recentRequests?.filter((r: any) => r.status === 'received').length || 0
          const inProgressRequestCount = recentRequests?.filter((r: any) => r.status === 'in_progress').length || 0
          const completedRequestCount = recentRequests?.filter((r: any) => r.status === 'completed').length || 0
          const rejectedRequestCount = recentRequests?.filter((r: any) => r.status === 'rejected').length || 0

          // RLS 정책 문제로 인해 서비스 역할 키 사용
          const checklistClient = adminSupabase || supabase
          const cleaningPhotosClient = adminSupabase || supabase
          
          const { data: todayChecklistsKST } = await checklistClient
            .from('checklist')
            .select('items, updated_at, work_date')
            .eq('store_id', store.id)
            .eq('work_date', todayDateKST)

          const { data: todayChecklistsUTC } = await checklistClient
            .from('checklist')
            .select('items, updated_at, work_date')
            .eq('store_id', store.id)
            .eq('work_date', todayDateUTC)

          const todayChecklists = [...(todayChecklistsKST || []), ...(todayChecklistsUTC || [])]

          const { data: todayCleaningPhotos } = await cleaningPhotosClient
            .from('cleaning_photos')
            .select('id, kind, created_at')
            .eq('store_id', store.id)
            .neq('area_category', 'inventory')
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())

          const beforePhotos = todayCleaningPhotos?.filter((p: any) => p.kind === 'before') || []
          const afterPhotos = todayCleaningPhotos?.filter((p: any) => p.kind === 'after') || []

          // 체크리스트에서 관리전후 사진 추출 (중복 제거: area 기준)
          const beforeAfterPhotosMap = new Map<string, { id: string; before_photo_url: string | null; after_photo_url: string | null; area: string }>()
          if (todayChecklists && todayChecklists.length > 0) {
            todayChecklists.forEach((checklist: any) => {
              const items = checklist.items || []
              items.forEach((item: any, index: number) => {
                // 타입 정규화 (하위 호환성)
                let itemType: string = item.type || 'check'
                if (itemType === 'photo') {
                  itemType = 'before_after_photo' // 구버전 호환
                }

                // area가 없는 항목은 제외
                if (!item.area || !item.area.trim()) {
                  return
                }

                const area = item.area.trim()
                
                // 사진 타입 항목만 처리
                if (itemType === 'before_photo' || itemType === 'after_photo' || itemType === 'before_after_photo') {
                  // before_photo_url 또는 after_photo_url이 있는 경우만 추가
                  const hasBeforePhoto = item.before_photo_url && itemType !== 'after_photo'
                  const hasAfterPhoto = item.after_photo_url && itemType !== 'before_photo'
                  
                  if (hasBeforePhoto || hasAfterPhoto) {
                    // 같은 area가 이미 있으면 업데이트 (더 최신 체크리스트의 사진 사용)
                    const existing = beforeAfterPhotosMap.get(area)
                    beforeAfterPhotosMap.set(area, {
                      id: `checklist-${checklist.id}-photo-${index}`,
                      before_photo_url: hasBeforePhoto ? item.before_photo_url : (existing?.before_photo_url || null),
                      after_photo_url: hasAfterPhoto ? item.after_photo_url : (existing?.after_photo_url || null),
                      area: area,
                    })
                  }
                }
              })
            })
          }
          const beforeAfterPhotos = Array.from(beforeAfterPhotosMap.values())

          // 체크리스트 진행률 계산 (calculateChecklistProgress 함수 사용)
          let checklistCompletionRate = 0
          let checklistCompleted = 0
          let checklistTotal = 0

          if (todayChecklists && todayChecklists.length > 0) {
            todayChecklists.forEach((checklist: any) => {
              // calculateChecklistProgress 함수를 사용하여 정확한 진행률 계산
              const progress = calculateChecklistProgress(checklist)
              checklistTotal += progress.totalItems
              checklistCompleted += progress.completedItems
            })

            checklistCompletionRate = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0
          }

          let attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
          let clockInTime: string | null = null
          let clockOutTime: string | null = null

          const todayOnlyAttendances = todayAttendances.filter(a => a.work_date === todayDateKST)

          if (todayOnlyAttendances.length > 0) {
            const clockedInStaff = todayOnlyAttendances.find(a => !a.clock_out_at)
            if (clockedInStaff) {
              attendanceStatus = 'clocked_in'
              clockInTime = clockedInStaff.clock_in_at
            } else {
              const latestClockOut = todayOnlyAttendances
                .filter(a => a.clock_out_at)
                .sort((a, b) => new Date(b.clock_out_at).getTime() - new Date(a.clock_out_at).getTime())[0]
              if (latestClockOut) {
                attendanceStatus = 'clocked_out'
                clockOutTime = latestClockOut.clock_out_at
                clockInTime = latestClockOut.clock_in_at
              }
            }
          }

          // 휴무일일 때는 출퇴근 시간을 표시하지 않음 (업체관리자 API와 동일 로직)
          if (!isWorkDay) {
            clockInTime = null
            clockOutTime = null
            attendanceStatus = 'not_clocked_in'
          }

          return {
            store_id: store.id,
            store_name: store.name,
            store_address: store.address,
            management_days: store.management_days,
            work_day: store.management_days,
            is_work_day: isWorkDay,
            service_active: store.service_active !== false,
            attendance_status: attendanceStatus,
            clock_in_time: clockInTime,
            clock_out_time: clockOutTime,
            staff_name: staffName,
            has_problem: storeProblemCount > 0 || vendingProblemCount > 0 || lostItemCount > 0,
            store_problem_count: storeProblemCount,
            vending_problem_count: vendingProblemCount,
            lost_item_count: lostItemCount,
            unprocessed_store_problems: unprocessedStoreProblems,
            completed_store_problems: completedStoreProblems,
            unconfirmed_vending_problems: unconfirmedVendingProblems,
            confirmed_vending_problems: confirmedVendingProblems,
            unconfirmed_lost_items: unconfirmedLostItems,
            confirmed_lost_items: confirmedLostItems,
            has_product_inflow_today: (todayProductInflow?.length || 0) > 0,
            has_storage_photos: storagePhotosArray.length > 0,
            storage_photos: storagePhotosArray,
            received_request_count: receivedRequestCount,
            in_progress_request_count: inProgressRequestCount,
            completed_request_count: completedRequestCount,
            rejected_request_count: rejectedRequestCount,
            unconfirmed_completed_request_count: completedRequestCount,
            unconfirmed_rejected_request_count: rejectedRequestCount,
            before_photo_count: beforePhotos.length,
            after_photo_count: afterPhotos.length,
            before_after_photos: beforeAfterPhotos, // 체크리스트의 관리전후 사진 데이터
            checklist_completion_rate: checklistCompletionRate,
            checklist_completed: checklistCompleted,
            checklist_total: checklistTotal,
            last_update_time: null,
          }
        } catch (storeError: any) {
          console.error(`Store ${store.name} 처리 중 오류:`, storeError)
          return {
            store_id: store.id,
            store_name: store.name,
            store_address: store.address,
            management_days: store.management_days,
            work_day: store.management_days,
            is_work_day: false,
            service_active: store.service_active !== false,
            attendance_status: 'not_clocked_in' as const,
            clock_in_time: null,
            clock_out_time: null,
            staff_name: null,
            has_problem: false,
            store_problem_count: 0,
            vending_problem_count: 0,
            lost_item_count: 0,
            unprocessed_store_problems: 0,
            completed_store_problems: 0,
            unconfirmed_vending_problems: 0,
            confirmed_vending_problems: 0,
            unconfirmed_lost_items: 0,
            confirmed_lost_items: 0,
            has_product_inflow_today: false,
            has_storage_photos: false,
            storage_photos: [],
            received_request_count: 0,
            in_progress_request_count: 0,
            completed_request_count: 0,
            rejected_request_count: 0,
            unconfirmed_completed_request_count: 0,
            unconfirmed_rejected_request_count: 0,
            before_photo_count: 0,
            after_photo_count: 0,
            before_after_photos: [],
            checklist_completion_rate: 0,
            checklist_completed: 0,
            checklist_total: 0,
            last_update_time: null,
          }
        }
      })
    )

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

