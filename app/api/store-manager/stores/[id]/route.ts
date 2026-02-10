import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 매장 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'store_manager') {
      throw new ForbiddenError('Only store managers can view stores')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 store_manager에게 배정되어 있는지 확인
    const { data: storeAssign, error: storeAssignError } = await supabase
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .maybeSingle()

    if (storeAssignError || !storeAssign) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // 매장 정보 조회
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single()

    if (error || !store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    return Response.json({
      success: true,
      data: store,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 점주 전용: 서비스 진행 여부(활성/비활성)만 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) throw new UnauthorizedError('Authentication required')
    if (user.role !== 'store_manager') throw new ForbiddenError('Only store managers can update store settings')

    const supabase = await createServerSupabaseClient()
    const { data: storeAssign } = await supabase
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .maybeSingle()
    if (!storeAssign) throw new ForbiddenError('Store not found or access denied')

    const body = await request.json()
    const { service_active } = body
    if (service_active === undefined) {
      return Response.json({ error: 'service_active is required' }, { status: 400 })
    }

    const { data: store, error } = await supabase
      .from('stores')
      .update({
        service_active: service_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update store: ${error.message}`)
    return Response.json({ success: true, data: store })
  } catch (error: any) {
    return handleApiError(error)
  }
}







