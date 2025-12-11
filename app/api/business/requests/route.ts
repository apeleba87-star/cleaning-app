import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 요청란 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create requests')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { store_id, title, description } = body

    if (!store_id || !title) {
      throw new Error('store_id and title are required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', store_id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (storeError || !store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // 요청란 생성 (업체관리자가 보낸 경우 바로 처리중 상태)
    const { data: request, error } = await supabase
      .from('requests')
      .insert({
        store_id,
        created_by: user.id,
        created_by_role: 'business_owner',
        title: title.trim(),
        description: description?.trim() || null,
        status: 'in_progress', // 업체관리자가 보낸 경우 바로 처리중
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create request: ${error.message}`)
    }

    return Response.json({
      success: true,
      request,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 요청란 목록 조회
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

    const supabase = await createServerSupabaseClient()

    // 회사에 속한 매장 ID 목록
    const { data: companyStores } = await supabase
      .from('stores')
      .select('id')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    const storeIds = companyStores?.map((s) => s.id) || []

    if (storeIds.length === 0) {
      return Response.json({
        success: true,
        data: [],
      })
    }

    // 모든 요청란 조회
    const { data: requests, error } = await supabase
      .from('requests')
      .select(`
        *,
        stores:store_id (
          id,
          name
        ),
        created_by_user:created_by (
          id,
          name
        )
      `)
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch requests: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: requests || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}


