import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'store_owner' && user.role !== 'store_manager') {
      throw new ForbiddenError('Only store owners/managers can view supply requests')
    }

    const supabase = await createServerSupabaseClient()

    // store_manager의 경우 store_assign 테이블에서 매장 조회
    let storeIds: string[] = []
    if (user.role === 'store_manager') {
      const { data: storeAssigns, error: storeAssignError } = await supabase
        .from('store_assign')
        .select('store_id')
        .eq('user_id', user.id)

      if (storeAssignError) {
        console.error('Error fetching store assignments:', storeAssignError)
        return NextResponse.json(
          { error: '매장 배정 정보를 불러올 수 없습니다.' },
          { status: 500 }
        )
      }

      storeIds = storeAssigns?.map(sa => sa.store_id) || []
      if (storeIds.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
    } else if (user.store_id) {
      // store_owner의 경우 직접 store_id 사용
      storeIds = [user.store_id]
    } else {
      throw new ForbiddenError('Store ID is required')
    }

    // 점주의 매장 물품 요청 조회 (점주 처리중 상태 + 완료된 것은 14일 이내만)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const fourteenDaysAgoISO = fourteenDaysAgo.toISOString().split('T')[0] // YYYY-MM-DD 형식
    
    // manager_in_progress 상태인 요청 조회
    const { data: inProgressRequests, error: inProgressError } = await supabase
      .from('supply_requests')
      .select(`
        *,
        users:user_id (
          id,
          name
        ),
        stores:store_id (
          id,
          name
        )
      `)
      .in('store_id', storeIds)
      .eq('status', 'manager_in_progress')
      .order('created_at', { ascending: false })

    // completed 상태인 요청 중 14일 이내만 조회
    const { data: completedRequests, error: completedError } = await supabase
      .from('supply_requests')
      .select(`
        *,
        users:user_id (
          id,
          name
        ),
        stores:store_id (
          id,
          name
        )
      `)
      .in('store_id', storeIds)
      .eq('status', 'completed')
      .gte('completed_at', fourteenDaysAgoISO)
      .order('created_at', { ascending: false })

    const error = inProgressError || completedError
    const supplyRequests = [...(inProgressRequests || []), ...(completedRequests || [])]

    if (error) {
      console.error('Error fetching supply requests:', error)
      return NextResponse.json(
        { error: '물품 요청 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // users 정보가 없을 경우를 대비하여 user_id로 직접 조회 (RLS 우회)
    // service role key를 사용하여 users 테이블 조회
    let requestsWithUsers = supplyRequests || []
    
    if (requestsWithUsers.some(r => !r.users && r.user_id)) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      
      if (serviceRoleKey && supabaseUrl) {
        const { createClient } = await import('@supabase/supabase-js')
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })

        // user_id 목록 수집
        const userIds = [...new Set(requestsWithUsers.filter(r => !r.users && r.user_id).map(r => r.user_id))]
        
        if (userIds.length > 0) {
          // service role key로 users 정보 조회
          const { data: usersData } = await adminSupabase
            .from('users')
            .select('id, name')
            .in('id', userIds)

          const usersMap = new Map((usersData || []).map(u => [u.id, u]))

          // requestsWithUsers에 users 정보 추가
          requestsWithUsers = requestsWithUsers.map(request => ({
            ...request,
            users: request.users || (request.user_id ? usersMap.get(request.user_id) || null : null)
          }))
        }
      }
    }

    return NextResponse.json({ success: true, data: requestsWithUsers })
  } catch (error: any) {
    return handleApiError(error)
  }
}

