import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// PATCH: 체크리스트 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { store_id, items, note, requires_photos } = body

    if (!store_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'store_id와 items는 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 체크리스트 존재 및 권한 확인
    const { data: existingChecklist, error: fetchError } = await supabase
      .from('checklist')
      .select('store_id, stores!inner(company_id)')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingChecklist) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // business_owner는 자신의 회사 매장만 수정 가능
    if (user.role === 'business_owner') {
      const storeData = existingChecklist.stores as any
      if (storeData.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }

      // 수정하려는 store_id도 자신의 회사 소속인지 확인
      const { data: storeCheck } = await supabase
        .from('stores')
        .select('company_id')
        .eq('id', store_id)
        .single()

      if (!storeCheck || storeCheck.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('checklist')
      .update({
        store_id,
        items,
        note: note || null,
        requires_photos: requires_photos || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating checklist:', error)
      return NextResponse.json({ error: '체크리스트 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ checklist: data })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/checklists/[id]:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE: 체크리스트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // 체크리스트 존재 및 권한 확인
    const { data: existingChecklist, error: fetchError } = await supabase
      .from('checklist')
      .select('store_id, stores!inner(company_id)')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingChecklist) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // business_owner는 자신의 회사 매장만 삭제 가능
    if (user.role === 'business_owner') {
      const storeData = existingChecklist.stores as any
      if (storeData.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('checklist')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting checklist:', error)
      return NextResponse.json({ error: '체크리스트 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/business/checklists/[id]:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


