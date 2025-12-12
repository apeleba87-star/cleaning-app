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
      throw new ForbiddenError('Only business owners can update requests')
    }

    const body = await request.json()
    const { title, description, photo_urls } = body

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

    // 접수 상태인 경우만 수정 가능
    if (requestData.status !== 'received') {
      return Response.json(
        { error: 'Only received requests can be updated' },
        { status: 400 }
      )
    }

    // 업데이트 데이터 준비
    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (photo_urls !== undefined) {
      updateData.photo_url = photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null
    }

    // 요청 수정
    const { data: updatedRequest, error: updateError } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update request: ${updateError.message}`)
    }

    return Response.json({
      success: true,
      data: updatedRequest,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

