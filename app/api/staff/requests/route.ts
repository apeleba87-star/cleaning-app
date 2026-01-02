import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { getTodayDateKST } from '@/lib/utils/date'

// 직원용 요청란 조회 (출근 중인 매장의 처리중인 요청만)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'staff') {
      throw new ForbiddenError('Only staff can view their requests')
    }

    const supabase = await createServerSupabaseClient()

    // 오늘 날짜
    const today = getTodayDateKST()

    // 배정된 매장 ID 목록 조회
    const { data: storeAssignments, error: assignmentError } = await supabase
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)

    if (assignmentError) {
      throw new Error(`Failed to fetch store assignments: ${assignmentError.message}`)
    }

    // 배정된 매장 ID 목록
    const assignedStoreIds = storeAssignments?.map((a) => a.store_id) || []

    if (assignedStoreIds.length === 0) {
      // 배정된 매장이 없으면 빈 배열 반환
      return Response.json({
        success: true,
        data: [],
      })
    }

    // 오늘 출근 상태 조회 (출근 중인 매장과 퇴근한 매장 구분용)
    const { data: todayAttendances, error: attendanceError } = await supabase
      .from('attendance')
      .select('store_id, clock_out_at')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .in('store_id', assignedStoreIds)

    if (attendanceError) {
      throw new Error(`Failed to fetch attendance: ${attendanceError.message}`)
    }

    // 출근 상태 맵 생성
    const attendanceMap = new Map<string, 'not_clocked_in' | 'clocked_in' | 'clocked_out'>()
    todayAttendances?.forEach((attendance: any) => {
      if (attendance.clock_out_at) {
        attendanceMap.set(attendance.store_id, 'clocked_out')
      } else {
        attendanceMap.set(attendance.store_id, 'clocked_in')
      }
    })

    // 배정된 매장의 처리중인 요청란 조회 (출근 여부와 관계없이)
    const { data: requests, error } = await supabase
      .from('requests')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .in('store_id', assignedStoreIds)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch requests: ${error.message}`)
    }

    // 각 요청에 출근 상태 정보 추가
    const requestsWithAttendance = (requests || []).map((request: any) => {
      const attendanceStatus = attendanceMap.get(request.store_id) || 'not_clocked_in'
      return {
        ...request,
        attendance_status: attendanceStatus,
      }
    })

    // created_by_user 정보를 별도로 조회
    const requestsWithUser = await Promise.all(requestsWithAttendance.map(async (request: any) => {
      if (request.created_by) {
        try {
          console.log(`[API] Fetching user for request ${request.id}, created_by: ${request.created_by}`)
          
          // 먼저 users 테이블에서 조회
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('id', request.created_by)
            .maybeSingle()
          
          if (userError) {
            console.error(`[API] Error fetching user for request ${request.id}:`, {
              error: userError,
              message: userError.message,
              code: userError.code,
              details: userError.details
            })
            return {
              ...request,
              created_by_user: null
            }
          }
          
          if (userData) {
            console.log(`[API] Request ${request.id} (${request.title}):`, {
              created_by: request.created_by,
              userData: userData,
              role: userData.role,
              isStoreManager: userData.role === 'store_manager',
              userDataString: JSON.stringify(userData)
            })
            
            return {
              ...request,
              created_by_user: userData
            }
          } else {
            // users 테이블에 없으면 다른 방법으로 조회 시도
            console.log(`[API] User ${request.created_by} not found in users table, trying alternative methods...`)
            
            // 방법 1: auth_user_id 컬럼이 있는 경우 (컬럼이 없으면 에러 발생하지만 무시)
            try {
              const { data: userByAuthId, error: authError } = await supabase
                .from('users')
                .select('id, name, role')
                .eq('auth_user_id', request.created_by)
                .maybeSingle()
              
              if (!authError && userByAuthId) {
                console.log(`[API] Found user by auth_user_id for request ${request.id}:`, {
                  userData: userByAuthId,
                  role: userByAuthId.role,
                  isStoreManager: userByAuthId.role === 'store_manager'
                })
                
                return {
                  ...request,
                  created_by_user: userByAuthId
                }
              }
            } catch (e) {
              // auth_user_id 컬럼이 없을 수 있으므로 무시
              console.log(`[API] auth_user_id column may not exist, skipping...`)
            }
            
            // 방법 2: Supabase Auth Admin API를 사용하여 사용자 정보 조회 시도
            // 하지만 일반 클라이언트에서는 admin API를 사용할 수 없으므로,
            // 여기서는 users 테이블에 사용자가 없다고 간주
            
            console.warn(`[API] User ${request.created_by} not found in users table for request ${request.id}. This may be a store_manager user that doesn't exist in the users table.`)
            
            // created_by가 있지만 users 테이블에 없는 경우,
            // 점주가 직접 생성한 요청일 가능성이 높으므로
            // 임시로 store_manager 역할로 간주 (하지만 이건 위험할 수 있음)
            // 대신 null을 반환하고 클라이언트에서 처리하도록 함
            return {
              ...request,
              created_by_user: null
            }
          }
        } catch (userError: any) {
          console.error(`[API] Exception fetching user for request ${request.id}:`, {
            error: userError,
            message: userError?.message,
            stack: userError?.stack
          })
          return {
            ...request,
            created_by_user: null
          }
        }
      }
      console.log(`[API] Request ${request.id} has no created_by field`)
      return {
        ...request,
        created_by_user: null
      }
    }))

    return Response.json({
      success: true,
      data: requestsWithUser || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}















