import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 배치 API: 여러 매장의 completed/rejected 요청을 한 번에 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view requests')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const { searchParams } = new URL(request.url)
    const storeIdsParam = searchParams.get('store_ids')
    
    if (!storeIdsParam) {
      return NextResponse.json({ error: 'store_ids parameter is required' }, { status: 400 })
    }

    const storeIds = storeIdsParam.split(',').filter(id => id.trim())
    
    if (storeIds.length === 0) {
      return NextResponse.json({ data: {} })
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id')
      .eq('company_id', user.company_id)
      .in('id', storeIds)
      .is('deleted_at', null)

    if (storesError) {
      throw new Error(`Failed to verify stores: ${storesError.message}`)
    }

    const validStoreIds = stores?.map(s => s.id) || []

    if (validStoreIds.length === 0) {
      return NextResponse.json({ data: {} })
    }

    // 모든 매장의 completed/rejected 요청을 한 번에 조회
    // completed_by와 rejected_by 컬럼은 존재하지 않을 수 있으므로 제외
    const { data: allRequests, error: requestsError } = await supabase
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
        completion_photo_url,
        completion_description,
        completed_at,
        rejected_at,
        created_by,
        created_by_user:created_by (
          id,
          name,
          role
        )
      `)
      .in('store_id', validStoreIds)
      .in('status', ['completed', 'rejected'])
      .order('created_at', { ascending: false })

    if (requestsError) {
      throw new Error(`Failed to fetch requests: ${requestsError.message}`)
    }

    // 요청 데이터에 사용자 정보 추가 (completed_by, rejected_by 컬럼이 없으므로 null로 설정)
    const requestsWithUsers = (allRequests || []).map((req: any) => ({
      ...req,
      completed_by: null,
      completed_by_user: null,
      rejected_by: null,
      rejected_by_user: null,
    }))

    // 매장별로 그룹화
    const requestsByStore = new Map<string, any[]>()
    
    requestsWithUsers.forEach((req: any) => {
      if (!requestsByStore.has(req.store_id)) {
        requestsByStore.set(req.store_id, [])
      }
      requestsByStore.get(req.store_id)!.push(req)
    })

    // 매장별로 completed와 rejected 분리
    const result: Record<string, { completed: any[]; rejected: any[] }> = {}
    
    validStoreIds.forEach(storeId => {
      const storeRequests = requestsByStore.get(storeId) || []
      result[storeId] = {
        completed: storeRequests.filter((r: any) => r.status === 'completed'),
        rejected: storeRequests.filter((r: any) => r.status === 'rejected'),
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
