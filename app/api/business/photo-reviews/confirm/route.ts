import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { checklist_id, item_index, photo_type } = body
    if (!checklist_id || typeof item_index !== 'number' || !['before', 'after'].includes(photo_type)) {
      return NextResponse.json({ error: 'checklist_id, item_index, photo_type(before|after) 필요' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }
    const dataClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: checklist, error: fetchError } = await dataClient
      .from('checklist')
      .select('id, store_id, items')
      .eq('id', checklist_id)
      .single()

    if (fetchError || !checklist) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (user.company_id) {
      const { data: store } = await dataClient
        .from('stores')
        .select('company_id')
        .eq('id', checklist.store_id)
        .single()
      if (!store || store.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
    }

    const items = Array.isArray(checklist.items) ? [...(checklist.items as any[])] : []
    if (item_index < 0 || item_index >= items.length) {
      return NextResponse.json({ error: '유효하지 않은 항목 인덱스입니다.' }, { status: 400 })
    }

    const updatedAt = new Date().toISOString()
    if (photo_type === 'before') {
      items[item_index] = { ...items[item_index], before_photo_reviewed_at: updatedAt }
    } else {
      items[item_index] = { ...items[item_index], after_photo_reviewed_at: updatedAt }
    }

    const { error: updateError } = await dataClient
      .from('checklist')
      .update({ items })
      .eq('id', checklist_id)

    if (updateError) {
      console.error('Photo review confirm update error:', updateError)
      return NextResponse.json({ error: '검수 처리에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, reviewed_at: updatedAt })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/photo-reviews/confirm:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
