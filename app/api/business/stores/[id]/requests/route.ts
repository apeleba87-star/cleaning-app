import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 사용자의 회사에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store || store.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 처리중인 요청은 날짜 제한 없이 조회, 완료된 요청은 최근 30일만 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // 모든 요청 조회 (날짜 제한 없음) - status 필터링은 클라이언트에서 처리
    // enum 오류를 피하기 위해 모든 요청을 가져온 후 필터링
    // rejection_photo_url은 컬럼이 없을 수 있으므로 별도로 조회
    const { data: allRequestsData, error: allRequestsError } = await supabase
      .from('requests')
      .select(`
        id, 
        title, 
        description, 
        photo_url, 
        status, 
        created_at, 
        updated_at,
        business_confirmed_at,
        business_confirmed_by,
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
      return NextResponse.json(
        { 
          error: 'Failed to fetch requests',
          details: {
            error: allRequestsError.message
          }
        },
        { status: 500 }
      )
    }

    // 업체관리자는 접수건(received)과 처리중인 요청(in_progress) 모두 볼 수 있음
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

    // completed_by 컬럼이 있는지 확인하기 위해 별도로 조회 시도
    // 컬럼이 없으면 에러가 발생하므로, 선택적으로 조회
    let completedRequestsWithDetails = completedRequests
    
    try {
      // completed_by, completion_photo_url, completion_description이 있는지 확인
      const { data: completedDetails, error: detailsError } = await supabase
        .from('requests')
        .select(`
          id,
          completion_photo_url,
          completion_description,
          completed_at
        `)
        .eq('store_id', params.id)
        .eq('status', 'completed')
        .in('id', completedRequests.map(r => r.id))
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (!detailsError && completedDetails) {
        // completed_by는 별도로 조회 (컬럼이 없을 수 있음)
        const detailsMap = new Map(completedDetails.map(d => [d.id, d]))
        completedRequestsWithDetails = completedRequests.map(req => ({
          ...req,
          completion_photo_url: detailsMap.get(req.id)?.completion_photo_url || null,
          completion_description: detailsMap.get(req.id)?.completion_description || null,
          completed_at: detailsMap.get(req.id)?.completed_at || null,
          completed_by: null // 일단 null로 설정, 나중에 별도 조회
        }))
      }
    } catch (detailsError) {
      console.error('Error fetching completion details (may be expected if columns do not exist):', detailsError)
      // 컬럼이 없어도 계속 진행
      completedRequestsWithDetails = completedRequests.map(req => ({
        ...req,
        completion_photo_url: null,
        completion_description: null,
        completed_at: null,
        completed_by: null
      }))
    }

    // completed_by 컬럼이 없을 수 있으므로, 완료된 요청에 completed_by_user는 null로 설정
    const completedRequestsWithUser = completedRequestsWithDetails.map(request => ({
      ...request,
      completed_by_user: null // completed_by 컬럼이 없으므로 null
    }))

    // 반려된 요청 조회 (최근 30일만)
    const rejectedRequests = (allRequestsData || []).filter(r => {
      if (r.status !== 'rejected') return false
      const requestDate = new Date(r.created_at)
      return requestDate >= thirtyDaysAgo
    })

    // 반려된 요청에 대한 상세 정보 조회 시도
    // rejection_photo_url, rejection_description 컬럼이 없을 수 있으므로 try-catch로 처리
    let rejectedRequestsWithDetails = rejectedRequests.map(req => ({
      ...req,
      rejection_photo_url: null,
      rejection_description: null,
      rejected_at: null,
      rejected_by: null
    }))

    // rejection_photo_url과 rejection_description을 별도로 조회 시도
    // (컬럼이 있을 경우를 대비)
    // status 필터는 제거하고 id만으로 조회 (enum 오류 방지)
    try {
      const rejectedIds = rejectedRequests.map(r => r.id)
      if (rejectedIds.length > 0) {
        const { data: rejectedDetails, error: rejectedDetailsError } = await supabase
          .from('requests')
          .select(`
            id,
            rejection_photo_url,
            rejection_description,
            rejected_at
          `)
          .eq('store_id', params.id)
          .in('id', rejectedIds)

        if (!rejectedDetailsError && rejectedDetails) {
          const detailsMap = new Map(rejectedDetails.map((d: any) => [d.id, d]))
          rejectedRequestsWithDetails = rejectedRequests.map(req => {
            const details = detailsMap.get(req.id) as any
            return {
              ...req,
              rejection_photo_url: details?.rejection_photo_url || null,
              rejection_description: details?.rejection_description || null,
              rejected_at: details?.rejected_at || null,
              rejected_by: null
            }
          })
        } else if (rejectedDetailsError) {
          // 컬럼이 없어서 에러가 발생할 수 있음 (정상적인 경우)
          console.log('rejection 컬럼 조회 실패 (컬럼이 없을 수 있음):', rejectedDetailsError.message)
          // 기본값 유지 (null)
        }
      }
    } catch (rejectedDetailsError: any) {
      // 컬럼이 없어서 에러가 발생할 수 있음 (정상적인 경우)
      console.log('rejection 컬럼 조회 중 오류 (컬럼이 없을 수 있음, 무시됨):', rejectedDetailsError?.message || rejectedDetailsError)
      // 기본값 유지 (null)
    }

    // 상태별로 분류
    const received = activeRequests.filter(r => r.status === 'received')
    const inProgress = activeRequests.filter(r => r.status === 'in_progress')
    const completed = completedRequestsWithUser
    const rejected = rejectedRequestsWithDetails

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
    console.error('Error in GET /api/business/stores/[id]/requests:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

