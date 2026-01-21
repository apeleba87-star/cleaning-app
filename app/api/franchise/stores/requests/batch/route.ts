import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'franchise_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id, company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
    }

    // 프렌차이즈에 속한 모든 매장 조회
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('franchise_id', userData.franchise_id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        data: {},
      })
    }

    const storeIds = stores.map(s => s.id)
    const storeMap = new Map(stores.map(s => [s.id, s.name]))

    // 처리중인 요청은 날짜 제한 없이 조회, 완료된 요청은 최근 30일만 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // 모든 매장의 요청을 한 번에 조회
    const { data: allRequestsData, error: allRequestsError } = await supabase
      .from('requests')
      .select(`
        id, 
        store_id,
        title, 
        description, 
        photo_url, 
        status, 
        created_at, 
        updated_at,
        created_by_user:created_by (
          id,
          name,
          role
        )
      `)
      .in('store_id', storeIds)
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

    // 완료/반려 요청의 상세 정보 조회 (컬럼이 있을 수 있으므로 시도)
    const completedRequestIds: string[] = []
    const rejectedRequestIds: string[] = []
    
    const requestsArray = Array.isArray(allRequestsData) ? allRequestsData : []
    requestsArray.forEach((r: any) => {
      if (r.status === 'completed') {
        const requestDate = new Date(r.created_at)
        if (requestDate >= thirtyDaysAgo) {
          completedRequestIds.push(r.id)
        }
      } else if (r.status === 'rejected') {
        const requestDate = new Date(r.created_at)
        if (requestDate >= thirtyDaysAgo) {
          rejectedRequestIds.push(r.id)
        }
      }
    })

    // 완료된 요청 상세 정보 조회
    let completedDetailsMap = new Map<string, any>()
    if (completedRequestIds.length > 0) {
      try {
        const { data: completedDetails, error: detailsError } = await supabase
          .from('requests')
          .select(`
            id,
            completion_photo_url,
            completion_description,
            storage_location,
            completed_at
          `)
          .in('id', completedRequestIds)

        if (!detailsError && completedDetails) {
          completedDetails.forEach(d => {
            completedDetailsMap.set(d.id, d)
          })
        }
      } catch (detailsError) {
        console.error('Error fetching completion details (may be expected if columns do not exist):', detailsError)
      }
    }

    // 반려된 요청 상세 정보 조회
    let rejectedDetailsMap = new Map<string, any>()
    if (rejectedRequestIds.length > 0) {
      try {
        const { data: rejectedDetails, error: rejectedDetailsError } = await supabase
          .from('requests')
          .select(`
            id,
            rejection_photo_url,
            rejection_description,
            rejected_at
          `)
          .in('id', rejectedRequestIds)

        if (!rejectedDetailsError && rejectedDetails) {
          rejectedDetails.forEach((d: any) => {
            rejectedDetailsMap.set(d.id, d)
          })
        }
      } catch (rejectedDetailsError: any) {
        console.log('rejection 컬럼 조회 중 오류 (컬럼이 없을 수 있음, 무시됨):', rejectedDetailsError?.message || rejectedDetailsError)
      }
    }

    // 매장별로 요청 분류
    const requestsByStore = new Map<string, {
      received: any[]
      in_progress: any[]
      completed: any[]
      rejected: any[]
    }>()

    // 초기화
    storeIds.forEach(storeId => {
      requestsByStore.set(storeId, {
        received: [],
        in_progress: [],
        completed: [],
        rejected: [],
      })
    })

    // 요청 분류
    requestsArray.forEach((request: any) => {
      const storeId = request.store_id
      if (!requestsByStore.has(storeId)) {
        return
      }

      const storeRequests = requestsByStore.get(storeId)!

      if (request.status === 'received') {
        storeRequests.received.push({
          ...request,
          store_name: storeMap.get(storeId),
        })
      } else if (request.status === 'in_progress') {
        storeRequests.in_progress.push({
          ...request,
          store_name: storeMap.get(storeId),
        })
      } else if (request.status === 'completed') {
        const requestDate = new Date(request.created_at)
        if (requestDate >= thirtyDaysAgo) {
          const details = completedDetailsMap.get(request.id)
          storeRequests.completed.push({
            ...request,
            store_name: storeMap.get(storeId),
            completion_photo_url: details?.completion_photo_url || null,
            completion_description: details?.completion_description || null,
            storage_location: details?.storage_location || null,
            completed_at: details?.completed_at || null,
            completed_by: null,
            completed_by_user: null,
          })
        }
      } else if (request.status === 'rejected') {
        const requestDate = new Date(request.created_at)
        if (requestDate >= thirtyDaysAgo) {
          const details = rejectedDetailsMap.get(request.id)
          storeRequests.rejected.push({
            ...request,
            store_name: storeMap.get(storeId),
            rejection_photo_url: details?.rejection_photo_url || null,
            rejection_description: details?.rejection_description || null,
            rejected_at: details?.rejected_at || null,
            rejected_by: null,
            rejected_by_user: null,
          })
        }
      }
    })

    // Map을 객체로 변환
    const result: Record<string, {
      received: any[]
      in_progress: any[]
      completed: any[]
      rejected: any[]
    }> = {}
    
    requestsByStore.forEach((requests, storeId) => {
      result[storeId] = requests
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Error in GET /api/franchise/stores/requests/batch:', error)
    console.error('Error stack:', error.stack)
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
