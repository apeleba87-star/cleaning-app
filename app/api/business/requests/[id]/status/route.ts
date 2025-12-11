import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 요청란 상태 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['received', 'in_progress', 'completed'].includes(status)) {
      throw new Error('Invalid status. Must be one of: received, in_progress, completed')
    }

    const supabase = await createServerSupabaseClient()

    // 요청란 조회
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select(`
        *,
        stores:store_id (
          company_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (requestError || !request) {
      throw new ForbiddenError('Request not found')
    }

    // 권한 확인
    let hasPermission = false

    if (user.role === 'business_owner') {
      // 업체관리자는 자신의 회사 매장 요청란만 수정 가능
      if (request.stores?.company_id === user.company_id) {
        hasPermission = true
      }
    } else if (user.role === 'staff') {
      // 직원은 처리중인 요청란을 완료 처리 가능
      if (status === 'completed' && request.status === 'in_progress') {
        // 배정된 매장인지 확인
        const { data: storeAssign } = await supabase
          .from('store_assign')
          .select('id')
          .eq('user_id', user.id)
          .eq('store_id', request.store_id)
          .maybeSingle()

        if (storeAssign) {
          hasPermission = true
        }
      }
    } else if (user.role === 'platform_admin') {
      hasPermission = true
    }

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to update this request')
    }

    // 상태 업데이트
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    // 완료 처리 시 승인 정보 업데이트 (필요한 경우)
    if (status === 'completed' && user.role === 'staff') {
      // 직원이 완료 처리한 경우는 승인 정보가 필요 없음
    }

    const { data: updatedRequest, error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', params.id)
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
      .single()

    if (error) {
      throw new Error(`Failed to update request: ${error.message}`)
    }

    return Response.json({
      success: true,
      request: updatedRequest,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}


