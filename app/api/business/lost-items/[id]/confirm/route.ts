import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner' || !user.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 분실물이 존재하고 사용자의 회사 매장에 속하는지 확인
    const { data: lostItem, error: fetchError } = await supabase
      .from('lost_items')
      .select('id, store_id, stores!inner(company_id)')
      .eq('id', params.id)
      .single()

    if (fetchError || !lostItem) {
      return NextResponse.json(
        { error: 'Lost item not found' },
        { status: 404 }
      )
    }

    // 권한 확인
    if ((lostItem.stores as any).company_id !== user.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // status를 'confirmed'로 업데이트
    const { error: updateError } = await supabase
      .from('lost_items')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/lost-items/[id]/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

