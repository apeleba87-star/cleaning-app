import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// POST: 관리일마다 체크리스트 자동 생성
// 이 API는 매일 실행되어야 함 (cron job 또는 scheduled function)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { store_id, template_items, assigned_user_id, note } = body

    if (!store_id || !Array.isArray(template_items) || template_items.length === 0) {
      return NextResponse.json(
        { error: 'store_id와 template_items는 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 매장 정보 조회 (management_days 확인)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, management_days, company_id')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 })
    }

    // business_owner는 자신의 회사 매장만 생성 가능
    if (user.role === 'business_owner' && store.company_id !== user.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 오늘 요일 확인 (0=일요일, 1=월요일, ..., 6=토요일)
    const today = new Date()
    const dayOfWeek = today.getDay()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[dayOfWeek]

    // management_days에 오늘 요일이 포함되어 있는지 확인
    if (store.management_days && !store.management_days.includes(todayDayName)) {
      return NextResponse.json(
        { 
          error: `오늘(${todayDayName}요일)은 관리일이 아닙니다. 관리 요일: ${store.management_days}`,
          skipped: true 
        },
        { status: 400 }
      )
    }

    // 오늘 날짜로 이미 체크리스트가 있는지 확인
    const todayStr = today.toISOString().slice(0, 10)
    const { data: existingChecklist } = await supabase
      .from('checklist')
      .select('id')
      .eq('store_id', store_id)
      .eq('work_date', todayStr)
      .single()

    if (existingChecklist) {
      return NextResponse.json(
        { 
          error: '오늘 날짜로 이미 체크리스트가 생성되어 있습니다.',
          checklist_id: existingChecklist.id,
          skipped: true 
        },
        { status: 409 }
      )
    }

    // 체크리스트 생성 (템플릿 항목을 복사하여 초기화)
    const initialItems = template_items.map((item: any) => ({
      area: item.area,
      type: item.type || 'check',
      status: item.type === 'check' ? 'good' : undefined,
      checked: false,
      comment: undefined,
      before_photo_url: null,
      after_photo_url: null,
    }))

    const { data, error } = await supabase
      .from('checklist')
      .insert({
        store_id,
        user_id: user.id, // 생성자
        assigned_user_id: assigned_user_id || null,
        items: initialItems,
        note: note || null,
        review_status: 'pending',
        work_date: todayStr,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating checklist:', error)
      return NextResponse.json({ error: '체크리스트 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      checklist: data,
      message: '체크리스트가 성공적으로 생성되었습니다.'
    })
  } catch (error: any) {
    console.error('Error in POST /api/business/checklists/generate-daily:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


