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










