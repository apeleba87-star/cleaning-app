import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'store_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // 매장이 store_manager에게 배정되어 있는지 확인
    const { data: storeAssign, error: storeAssignError } = await dataClient
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .maybeSingle()

    if (storeAssignError || !storeAssign) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 처리중인 요청은 날짜 제한 없이 조회, 완료된 요청은 최근 30일만 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // 모든 요청 조회 (dataClient로 RLS 우회)
    const { data: allRequestsData, error: allRequestsError } = await dataClient
      .from('requests')
      .select(`
        id, 
        title, 
        description, 
        photo_url, 
        status, 
        created_at, 
        updated_at,
        completion_photo_url,
        completion_description,
        storage_location,
        completed_at,
        rejection_photo_url,
        rejection_description,
        rejected_at,
        created_by_user:created_by (
          id,
          name,
          role
        )
      `)
      .eq('store_id', params.id)
      .order('created_at', { ascending: false })

    if (allRequestsError) {
      console.error('Error fetching all requests:', allRequestsError)
      // enum 오류인 경우 빈 배열 반환
      if (allRequestsError.message?.includes('enum') || allRequestsError.code === 'PGRST116') {
        console.log('Enum error detected, returning empty array')
        return NextResponse.json({
          success: true,
          data: {
            received: [],
            in_progress: [],
            completed: [],
            rejected: [],
          },
        })
      }
      return NextResponse.json(
        { 
          error: 'Failed to fetch requests',
          details: {
            error: allRequestsError.message,
            code: allRequestsError.code
          }
        },
        { status: 500 }
      )
    }

    // 점주는 접수건(received)과 처리중인 요청(in_progress) 모두 볼 수 있음
    // 처리중인 요청 필터링 (received, in_progress)
    const activeRequests = (allRequestsData || []).filter(r => 
      r.status === 'received' || r.status === 'in_progress'
    )

    // 완료된 요청 필터링 (최근 30일만)
    const completedRequests = (allRequestsData || []).filter(r => {
      if (r.status !== 'completed') return false
      const requestDate = new Date(r.created_at)
      return requestDate >= thirtyDaysAgo
    })

    // 반려된 요청 조회 (최근 30일만)
    const rejectedRequests = (allRequestsData || []).filter(r => {
      if (r.status !== 'rejected') return false
      const requestDate = new Date(r.created_at)
      return requestDate >= thirtyDaysAgo
    })

    // 상태별로 분류
    const received = activeRequests.filter(r => r.status === 'received')
    const inProgress = activeRequests.filter(r => r.status === 'in_progress')
    const completed = completedRequests
    const rejected = rejectedRequests

    return NextResponse.json({
      success: true,
      data: {
        received,
        in_progress: inProgress,
        completed,
        rejected,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/store-manager/stores/[id]/requests:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

