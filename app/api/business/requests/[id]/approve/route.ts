import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can approve requests')
    }

    const supabase = await createServerSupabaseClient()

    // 요청 조회 및 권한 확인
    const { data: requestData, error: fetchError } = await supabase
      .from('requests')
      .select('*, stores:store_id (company_id)')
      .eq('id', params.id)
      .single()

    if (fetchError || !requestData) {
      throw new ForbiddenError('Request not found')
    }

    // 매장이 회사에 속해있는지 확인
    if (requestData.stores?.company_id !== user.company_id) {
      throw new ForbiddenError('Access denied')
    }

    // 접수 상태인 경우만 승인 가능
    if (requestData.status !== 'received') {
      return Response.json(
        { error: 'Only received requests can be approved' },
        { status: 400 }
      )
    }

    // 처리중으로 변경
    const { data: updatedRequest, error: updateError } = await supabase
      .from('requests')
      .update({
        status: 'in_progress',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to approve request: ${updateError.message}`)
    }

    return Response.json({
      success: true,
      data: updatedRequest,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

