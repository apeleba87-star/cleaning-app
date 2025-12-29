import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { getTodayDateKST } from '@/lib/utils/date'

// GET: 매장관리자가 배정된 매장의 체크리스트 조회 (당일 기준)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'store_manager') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const todayDateKST = getTodayDateKST()
    const todayDateUTC = new Date().toISOString().split('T')[0]

    // 매장이 배정된 매장인지 확인
    const { data: storeAssign } = await supabase
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .maybeSingle()

    if (!storeAssign) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 오늘 날짜 체크리스트 조회
    const { data: todayChecklistsKST } = await supabase
      .from('checklist')
      .select('id, items, updated_at, created_at, work_date')
      .eq('store_id', params.id)
      .eq('work_date', todayDateKST)

    const { data: todayChecklistsUTC } = await supabase
      .from('checklist')
      .select('id, items, updated_at, created_at, work_date')
      .eq('store_id', params.id)
      .eq('work_date', todayDateUTC)

    // 템플릿 체크리스트도 조회 (직원이 출근하지 않아서 복사되지 않은 경우)
    const { data: templateChecklists } = await supabase
      .from('checklist')
      .select('id, items, updated_at, created_at, work_date')
      .eq('store_id', params.id)
      .eq('work_date', '2000-01-01')
      .is('assigned_user_id', null)

    const todayChecklists = [...(todayChecklistsKST || []), ...(todayChecklistsUTC || [])]
    const hasTodayChecklists = todayChecklists.length > 0
    const checklistsToUse = hasTodayChecklists ? todayChecklists : (templateChecklists || [])

    return NextResponse.json({ data: checklistsToUse })
  } catch (error: any) {
    console.error('Error fetching checklists:', error)
    return NextResponse.json({ error: '체크리스트 조회에 실패했습니다.' }, { status: 500 })
  }
}










