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

    if (user.role !== 'store_manager') {
      throw new ForbiddenError('Only store managers can view store status')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    
    // 매장관리자가 배정된 매장 조회
    console.log(`[Store Manager API] User ID: ${user.id}, Role: ${user.role}, Company ID: ${user.company_id}`)
    
    const { data: storeAssigns, error: storeAssignError } = await supabase
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)

    if (storeAssignError) {
      console.error('[Store Manager API] Error fetching store_assign:', storeAssignError)
      return Response.json({
        success: false,
        error: `매장 배정 조회 실패: ${storeAssignError.message}`,
        data: [],
        last_modified_at: new Date().toISOString(),
      }, { status: 500 })
    }

    console.log(`[Store Manager API] Found ${storeAssigns?.length || 0} store assignments:`, storeAssigns)

    const storeIds = storeAssigns?.map(sa => sa.store_id) || []

    if (storeIds.length === 0) {
      console.log('[Store Manager API] No stores assigned to user')
      return Response.json({
        success: true,
        data: [],
        last_modified_at: new Date().toISOString(),
        message: '배정된 매장이 없습니다.',
      })
    }

    console.log(`[Store Manager API] Store IDs: ${storeIds.join(', ')}`)

    // 배정된 매장 정보 조회
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, address, management_days, updated_at')
      .in('id', storeIds)
      .is('deleted_at', null)

    if (storesError) {
      console.error('[Store Manager API] Error fetching stores:', storesError)
      throw new Error(`Failed to fetch stores: ${storesError.message}`)
    }

    console.log(`[Store Manager API] Found ${stores?.length || 0} stores`)

    if (!stores || stores.length === 0) {
      console.log('[Store Manager API] No stores found (may be deleted or RLS issue)')
      return Response.json({
        success: true,
        data: [],
        last_modified_at: new Date().toISOString(),
        message: '매장 정보를 찾을 수 없습니다.',
      })
    }

    // RLS 정책 문제로 인해 attendance 조회 시 서비스 역할 키 사용
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
    
    const attendanceClient = adminSupabase || supabase

    // 오늘 날짜 (한국 시간 기준)
    const todayDateKST = getTodayDateKST()
    const todayDateUTC = new Date().toISOString().split('T')[0]
    const koreaTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const todayStartKST = new Date(koreaTime)
    todayStartKST.setHours(0, 0, 0, 0)
    const todayEndKST = new Date(koreaTime)
    todayEndKST.setHours(23, 59, 59, 999)
    const todayStart = new Date(todayStartKST.toISOString())
    const todayEnd = new Date(todayEndKST.toISOString())
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[koreaTime.getDay()]

    // 각 매장별 상태 조회 (업체관리자 API와 동일한 로직)
    const storeStatuses = await Promise.all(
      stores.map(async (store) => {
        try {
          const isWorkDay = store.management_days
            ? store.management_days.split(',').map((d) => d.trim()).includes(todayDayName)
            : false

          // 매장에 배정된 모든 사용자 조회 (출근 기록 확인용)
          const { data: assignedStaff } = await supabase
            .from('store_assign')
            .select('user_id')
            .eq('store_id', store.id)

          const assignedUserIds = assignedStaff?.map(s => s.user_id) || []
          
          // 디버깅: 배정된 사용자들의 역할 확인
          if (assignedUserIds.length > 0) {
            const { data: users } = await supabase
              .from('users')
              .select('id, role')
              .in('id', assignedUserIds)
            
            const roleCounts = users?.reduce((acc, u) => {
              acc[u.role] = (acc[u.role] || 0) + 1
              return acc
            }, {} as Record<string, number>) || {}
            
            console.log(`[Store Manager API] Store ${store.name}: Checking attendance for ${assignedUserIds.length} assigned users. Role breakdown:`, roleCounts)
          }

          // 오늘 출근 정보 조회
          // 매장에 배정된 사용자의 출근 기록뿐만 아니라, 해당 매장의 모든 출근 기록도 확인
          let todayAttendances: any[] = []
          
          // 방법 1: 배정된 사용자의 출근 기록 조회
          if (assignedUserIds.length > 0) {
            console.log(`[Store Manager API] Store ${store.name}: Checking attendance for ${assignedUserIds.length} assigned users (IDs: ${assignedUserIds.join(', ')})`)
            console.log(`[Store Manager API] Store ${store.name}: Looking for work_date = ${todayDateKST} or ${todayDateUTC}`)
            
            // 먼저 모든 출근 기록 조회 (디버깅용)
            const { data: allAttendances, error: allAttendancesError } = await attendanceClient
              .from('attendance')
              .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
              .in('user_id', assignedUserIds)
              .order('clock_in_at', { ascending: false })
              .limit(10) // 최근 10개만 조회

            if (allAttendancesError) {
              console.error(`[Store Manager API] Error fetching all attendances:`, allAttendancesError)
            } else {
              console.log(`[Store Manager API] Store ${store.name}: Found ${allAttendances?.length || 0} total attendance records for assigned users (recent 10)`)
              if (allAttendances && allAttendances.length > 0) {
                console.log(`[Store Manager API] Recent attendance work_dates:`, allAttendances.map(a => ({
                  work_date: a.work_date,
                  store_id: a.store_id,
                  clock_in_at: a.clock_in_at,
                  clock_out_at: a.clock_out_at,
                })))
              }
            }

            // 오늘 날짜 범위로 조회 (KST와 UTC 모두 시도)
            const { data: attendancesByUser, error: attendanceError } = await attendanceClient
              .from('attendance')
              .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
              .in('user_id', assignedUserIds)
              .or(`work_date.eq.${todayDateKST},work_date.eq.${todayDateUTC}`)
              .order('clock_in_at', { ascending: false })

            if (attendanceError) {
              console.error(`[Store Manager API] Error fetching attendance for store ${store.id}:`, attendanceError)
            } else {
              console.log(`[Store Manager API] Store ${store.name}: Raw query returned ${attendancesByUser?.length || 0} records`)
            }

            // 매장별로 필터링하고, 날짜도 다시 확인
            todayAttendances = (attendancesByUser || [])
              .filter(a => {
                const isStoreMatch = a.store_id === store.id
                const workDate = a.work_date || ''
                const isDateMatch = workDate === todayDateKST || workDate === todayDateUTC
                if (!isStoreMatch) {
                  console.log(`[Store Manager API] Store ${store.name}: Attendance record filtered out (store mismatch: ${a.store_id} vs ${store.id})`)
                }
                if (!isDateMatch) {
                  console.log(`[Store Manager API] Store ${store.name}: Attendance record filtered out (date mismatch: ${workDate} vs ${todayDateKST}/${todayDateUTC})`)
                }
                return isStoreMatch && isDateMatch
              })
          }
          
          // 방법 2: 매장의 모든 출근 기록 조회 (배정된 사용자가 아닌 경우도 포함)
          // 만약 배정된 사용자의 출근 기록이 없다면, 매장의 모든 출근 기록을 확인
          if (todayAttendances.length === 0) {
            console.log(`[Store Manager API] Store ${store.name}: No attendance found for assigned users, checking all attendance for this store`)
            
            const { data: allStoreAttendances, error: allStoreAttendancesError } = await attendanceClient
              .from('attendance')
              .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
              .eq('store_id', store.id)
              .or(`work_date.eq.${todayDateKST},work_date.eq.${todayDateUTC}`)
              .order('clock_in_at', { ascending: false })

            if (allStoreAttendancesError) {
              console.error(`[Store Manager API] Error fetching all store attendances:`, allStoreAttendancesError)
            } else {
              console.log(`[Store Manager API] Store ${store.name}: Found ${allStoreAttendances?.length || 0} attendance records for this store (all users)`)
              if (allStoreAttendances && allStoreAttendances.length > 0) {
                console.log(`[Store Manager API] Store attendance details:`, allStoreAttendances.map(a => ({
                  user_id: a.user_id,
                  work_date: a.work_date,
                  clock_in_at: a.clock_in_at,
                  clock_out_at: a.clock_out_at,
                })))
                todayAttendances = allStoreAttendances
              }
            }
          }
          
          console.log(`[Store Manager API] Store ${store.name} (${store.id}): Final result - Found ${todayAttendances.length} attendance records for today (${todayDateKST} or ${todayDateUTC})`)
          if (todayAttendances.length > 0) {
            console.log(`[Store Manager API] Final attendance details:`, todayAttendances.map(a => ({
              user_id: a.user_id,
              work_date: a.work_date,
              clock_in_at: a.clock_in_at,
              clock_out_at: a.clock_out_at,
            })))
          }

          // 출근한 직원 정보
          let staffName: string | null = null
          const latestAttendance = todayAttendances.length > 0 ? todayAttendances[0] : null
          if (latestAttendance?.user_id) {
            const { data: staff } = await supabase
              .from('users')
              .select('name')
              .eq('id', latestAttendance.user_id)
              .single()
            staffName = staff?.name || null
          }

          // 최근 30일 문제보고
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          thirtyDaysAgo.setHours(0, 0, 0, 0)

          const { data: problemReports } = await supabase
            .from('problem_reports')
            .select('id, category, status, title, created_at')
            .eq('store_id', store.id)
            .gte('created_at', thirtyDaysAgo.toISOString())

          const { data: lostItems } = await supabase
            .from('lost_items')
            .select('id, status, created_at, updated_at')
            .eq('store_id', store.id)
            .or(`created_at.gte.${thirtyDaysAgo.toISOString()},updated_at.gte.${thirtyDaysAgo.toISOString()}`)

          // 문제보고 카운트
          const storeProblemCount = problemReports?.filter((p: any) => {
            const cat = String(p.category || '').toLowerCase().trim()
            const title = String(p.title || '').toLowerCase()
            return cat === 'store_problem' || title.includes('매장 문제') || title.includes('자판기 고장')
          }).length || 0

          const vendingProblemCount = problemReports?.filter((p: any) => {
            const cat = String(p.category || '').toLowerCase().trim()
            const title = String(p.title || '').toLowerCase()
            return cat === 'vending_machine' || (title.includes('제품 걸림') || title.includes('수량 오류'))
          }).length || 0

          const lostItemCount = lostItems?.length || 0

          // 상태별 카운트
          const unprocessedStoreProblems = problemReports?.filter((p: any) => {
            const cat = String(p.category || '').toLowerCase().trim()
            const title = String(p.title || '').toLowerCase()
            const isStoreProblem = cat === 'store_problem' || title.includes('매장 문제') || title.includes('자판기 고장')
            return isStoreProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
          }).length || 0

          const unconfirmedVendingProblems = problemReports?.filter((p: any) => {
            const cat = String(p.category || '').toLowerCase().trim()
            const title = String(p.title || '').toLowerCase()
            const isVendingProblem = cat === 'vending_machine' || (title.includes('제품 걸림') || title.includes('수량 오류'))
            return isVendingProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
          }).length || 0

          const unconfirmedLostItems = lostItems?.filter((l: any) => l.status !== 'completed').length || 0

          // 최근 30일 요청란
          const { data: recentRequests } = await supabase
            .from('requests')
            .select('id, title, status, created_at')
            .eq('store_id', store.id)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })

          const receivedRequestCount = recentRequests?.filter((r: any) => r.status === 'received').length || 0
          const inProgressRequestCount = recentRequests?.filter((r: any) => r.status === 'in_progress').length || 0
          const completedRequestCount = recentRequests?.filter((r: any) => r.status === 'completed').length || 0
          const rejectedRequestCount = recentRequests?.filter((r: any) => r.status === 'rejected').length || 0

          // 오늘 체크리스트 (오늘 날짜로 복사된 체크리스트)
          const { data: todayChecklistsKST } = await supabase
            .from('checklist')
            .select('items, updated_at, work_date')
            .eq('store_id', store.id)
            .eq('work_date', todayDateKST)

          const { data: todayChecklistsUTC } = await supabase
            .from('checklist')
            .select('items, updated_at, work_date')
            .eq('store_id', store.id)
            .eq('work_date', todayDateUTC)

          // 템플릿 체크리스트도 조회 (직원이 출근하지 않아서 복사되지 않은 경우)
          const { data: templateChecklists } = await supabase
            .from('checklist')
            .select('items, updated_at, work_date')
            .eq('store_id', store.id)
            .eq('work_date', '2000-01-01') // 템플릿 날짜
            .is('assigned_user_id', null) // 템플릿은 배정되지 않음

          // 오늘 날짜 체크리스트와 템플릿 체크리스트를 합침
          // 템플릿은 오늘 날짜 체크리스트가 없을 때만 사용
          const todayChecklists = [...(todayChecklistsKST || []), ...(todayChecklistsUTC || [])]
          const hasTodayChecklists = todayChecklists.length > 0
          
          // 오늘 날짜 체크리스트가 없으면 템플릿 체크리스트 사용
          const checklistsToUse = hasTodayChecklists ? todayChecklists : (templateChecklists || [])

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

          if (checklistsToUse && checklistsToUse.length > 0) {
            checklistsToUse.forEach((checklist: any) => {
              const items = checklist.items || []
              items.forEach((item: any) => {
                if (item.type === 'check') {
                  checklistTotal++
                  // 템플릿 체크리스트는 아직 시작하지 않았으므로 완료되지 않은 것으로 간주
                  if (hasTodayChecklists && item.checked && (item.status === 'good' || (item.status === 'bad' && item.comment))) {
                    checklistCompleted++
                  }
                } else if (item.type === 'photo') {
                  checklistTotal++
                  // 템플릿 체크리스트는 아직 시작하지 않았으므로 완료되지 않은 것으로 간주
                  if (hasTodayChecklists && item.before_photo_url && item.after_photo_url) {
                    checklistCompleted++
                  }
                }
              })
            })

            checklistCompletionRate = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0
          }

          // 출근 상태 결정
          let attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
          let clockInTime: string | null = null
          let clockOutTime: string | null = null

          // 이미 필터링된 todayAttendances 사용
          console.log(`[Store Manager API] Store ${store.name}: Processing ${todayAttendances.length} attendance records`)

          if (todayAttendances.length > 0) {
            // 먼저 출근 중인 직원 확인 (퇴근하지 않은 경우)
            const clockedInStaff = todayAttendances.find(a => !a.clock_out_at)
            if (clockedInStaff) {
              attendanceStatus = 'clocked_in'
              clockInTime = clockedInStaff.clock_in_at
              console.log(`[Store Manager API] Store ${store.name}: Found clocked_in staff (no clock_out)`)
            } else {
              // 모든 직원이 퇴근한 경우, 가장 최근 퇴근 기록 사용
              const clockedOutStaff = todayAttendances
                .filter(a => a.clock_out_at)
                .sort((a, b) => {
                  const timeA = a.clock_out_at ? new Date(a.clock_out_at).getTime() : 0
                  const timeB = b.clock_out_at ? new Date(b.clock_out_at).getTime() : 0
                  return timeB - timeA
                })[0]
              
              if (clockedOutStaff) {
                attendanceStatus = 'clocked_out'
                clockOutTime = clockedOutStaff.clock_out_at
                clockInTime = clockedOutStaff.clock_in_at
                console.log(`[Store Manager API] Store ${store.name}: Found clocked_out staff (clock_out_at: ${clockOutTime})`)
              }
            }
          } else {
            console.log(`[Store Manager API] Store ${store.name}: No attendance records for today (${todayDateKST} or ${todayDateUTC})`)
            // 디버깅: 할당된 직원이 있는지 확인
            if (assignedUserIds.length > 0) {
              console.log(`[Store Manager API] Store ${store.name}: Has ${assignedUserIds.length} assigned users but no attendance records`)
            } else {
              console.log(`[Store Manager API] Store ${store.name}: No assigned users`)
            }
          }

          console.log(`[Store Manager API] Store ${store.name}: Final attendance_status = ${attendanceStatus}`)

          return {
            store_id: store.id,
            store_name: store.name,
            store_address: store.address,
            management_days: store.management_days,
            work_day: store.management_days,
            is_work_day: isWorkDay,
            attendance_status: attendanceStatus,
            clock_in_time: clockInTime,
            clock_out_time: clockOutTime,
            staff_name: staffName,
            has_problem: storeProblemCount > 0 || vendingProblemCount > 0 || lostItemCount > 0,
            store_problem_count: storeProblemCount,
            vending_problem_count: vendingProblemCount,
            lost_item_count: lostItemCount,
            unprocessed_store_problems: unprocessedStoreProblems,
            completed_store_problems: 0,
            unconfirmed_vending_problems: unconfirmedVendingProblems,
            confirmed_vending_problems: 0,
            unconfirmed_lost_items: unconfirmedLostItems,
            confirmed_lost_items: 0,
            has_product_inflow_today: false,
            has_storage_photos: false,
            storage_photos: [],
            received_request_count: receivedRequestCount,
            in_progress_request_count: inProgressRequestCount,
            completed_request_count: completedRequestCount,
            rejected_request_count: rejectedRequestCount,
            unconfirmed_completed_request_count: 0,
            unconfirmed_rejected_request_count: 0,
            before_photo_count: beforePhotos.length,
            after_photo_count: afterPhotos.length,
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

