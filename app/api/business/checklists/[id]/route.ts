import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// PATCH: 체크리스트 수정 (업체관리자/플랫폼관리자)
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

    // 기존 체크리스트 조회
    const { data: existingChecklist, error: fetchError } = await supabase
      .from('checklist')
      .select('id, store_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingChecklist) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // business_owner는 자신의 회사 매장만 수정 가능
    if (user.role === 'business_owner') {
      // 체크리스트의 매장이 사용자의 회사에 속하는지 확인
      const { data: existingStore, error: existingStoreError } = await supabase
        .from('stores')
        .select('company_id')
        .eq('id', existingChecklist.store_id)
        .single()

      if (existingStoreError || !existingStore || existingStore.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }

      // 수정하려는 store_id도 권한 확인
      const { data: newStore, error: newStoreError } = await supabase
        .from('stores')
        .select('company_id')
        .eq('id', store_id)
        .single()

      if (newStoreError || !newStore || newStore.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
    }

    // 체크리스트 업데이트
    // 템플릿인 경우 work_date와 assigned_user_id는 변경하지 않음 (템플릿 상태 유지)
    // 템플릿이 아닌 경우에도 업데이트하지 않음 (이미 생성된 체크리스트는 날짜/배정 변경 불가)
    const updateData: any = {
      store_id,
      items,
      note: note || null,
      requires_photos: requires_photos || false,
      // work_date와 assigned_user_id는 업데이트하지 않음 (템플릿 상태 유지 또는 기존 값 유지)
    }
    
    const { data, error } = await supabase
      .from('checklist')
      .update(updateData)
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

// DELETE: 체크리스트 삭제 (업체관리자/플랫폼관리자)
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

    // 기존 체크리스트 조회
    const { data: existingChecklist, error: fetchError } = await supabase
      .from('checklist')
      .select('id, store_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingChecklist) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // business_owner는 자신의 회사 매장만 삭제 가능
    if (user.role === 'business_owner') {
      // 체크리스트의 매장이 사용자의 회사에 속하는지 확인
      const { data: storeCheck, error: storeCheckError } = await supabase
        .from('stores')
        .select('company_id')
        .eq('id', existingChecklist.store_id)
        .single()

      if (storeCheckError || !storeCheck || storeCheck.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
    }

    // 체크리스트 삭제
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

