import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// 요청 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { category, description, photo_urls } = body

    const supabase = await createServerSupabaseClient()

    // 요청 조회
    const { data: existingRequest, error: requestError } = await supabase
      .from('requests')
      .select(`
        *,
        stores:store_id (
          company_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (requestError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // 매장이 사용자의 회사에 속하는지 확인
    if (existingRequest.stores?.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 접수 상태인 요청만 수정 가능
    if (existingRequest.status !== 'received') {
      return NextResponse.json(
        { error: 'Only received requests can be edited' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (category) updateData.title = category
    if (description !== undefined) updateData.description = description.trim()
    if (photo_urls !== undefined) {
      updateData.photo_url = photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating request:', updateError)
      return NextResponse.json(
        { error: `Failed to update request: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: updatedRequest })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/requests/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}











