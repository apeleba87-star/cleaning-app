import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// POST: 출근 시 체크리스트 자동 생성
// 이 API는 출근 시 호출되어 매장에 배정된 체크리스트 템플릿을 오늘 날짜로 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'staff') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { store_id } = body

    if (!store_id) {
      return NextResponse.json({ error: 'store_id는 필수입니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // 1. 해당 매장에 배정된 체크리스트 템플릿 조회 (assigned_user_id가 null이고 work_date가 없는 것)
    // 또는 업체 관리자가 생성한 체크리스트 템플릿
    const { data: templateChecklists, error: templateError } = await supabase
      .from('checklist')
      .select('*')
      .eq('store_id', store_id)
      .is('assigned_user_id', null)
      // work_date가 없거나 오늘이 아닌 템플릿만 조회 (이미 생성된 것은 제외)
      .or(`work_date.is.null,work_date.neq.${today}`)
      .order('created_at', { ascending: false })

    if (templateError) {
      console.error('Error fetching template checklists:', templateError)
      return NextResponse.json({ error: '체크리스트 템플릿 조회 실패' }, { status: 500 })
    }

    if (!templateChecklists || templateChecklists.length === 0) {
      // 템플릿이 없으면 성공 (체크리스트가 없을 수도 있음)
      return NextResponse.json({ success: true, created: 0 })
    }

    // 2. 오늘 날짜로 체크리스트가 이미 생성되었는지 확인
    const { data: existingChecklists, error: existingError } = await supabase
      .from('checklist')
      .select('id, store_id')
      .eq('store_id', store_id)
      .eq('work_date', today)
      .is('assigned_user_id', null)

    if (existingError) {
      console.error('Error checking existing checklists:', existingError)
      return NextResponse.json({ error: '기존 체크리스트 확인 실패' }, { status: 500 })
    }

    // 이미 생성된 템플릿 ID 목록
    const existingTemplateIds = existingChecklists?.map((c: any) => c.id) || []

    // 3. 오늘 날짜로 체크리스트 생성 (템플릿 기반)
    const checklistsToCreate = templateChecklists
      .filter((template: any) => !existingTemplateIds.includes(template.id))
      .map((template: any) => ({
        store_id: template.store_id,
        user_id: template.user_id, // 원본 생성자
        assigned_user_id: user.id, // 출근한 직원에게 배정
        items: template.items,
        note: template.note,
        requires_photos: template.requires_photos || false,
        review_status: 'pending' as const,
        work_date: today, // 오늘 날짜로 설정
      }))

    if (checklistsToCreate.length === 0) {
      return NextResponse.json({ success: true, created: 0, message: '이미 모든 체크리스트가 생성되었습니다.' })
    }

    const { data: createdChecklists, error: createError } = await supabase
      .from('checklist')
      .insert(checklistsToCreate)
      .select()

    if (createError) {
      console.error('Error creating checklists:', createError)
      return NextResponse.json({ error: '체크리스트 생성 실패' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      created: createdChecklists?.length || 0,
      checklists: createdChecklists,
    })
  } catch (error: any) {
    console.error('Error in POST /api/staff/checklists/create-from-attendance:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}



