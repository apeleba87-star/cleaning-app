import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { assertBusinessFeature } from '@/lib/plan-features-server'

// GET: 회사 내 매장별 체크리스트 목록
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (user.role === 'business_owner' && user.company_id) {
      const feature = await assertBusinessFeature(user.company_id, 'checklists')
      if (feature.allowed === false) {
        return NextResponse.json({ error: feature.message }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')

    const supabase = await createServerSupabaseClient()

    // business_owner인 경우 자신의 회사 매장만 조회
    if (user.role === 'business_owner' && storeId) {
      const { data: storeCheck } = await supabase
        .from('stores')
        .select('company_id')
        .eq('id', storeId)
        .single()

      if (!storeCheck || storeCheck.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
    }

    // 업체 관리자 앱에서는 템플릿 체크리스트만 조회
    // 템플릿: work_date가 '2000-01-01'이고 assigned_user_id가 null
    let query = supabase
      .from('checklist')
      .select('*')
      .eq('work_date', '2000-01-01') // 템플릿 날짜
      .is('assigned_user_id', null) // 템플릿은 배정되지 않음
      .order('created_at', { ascending: false })

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching checklists:', error)
      return NextResponse.json({ error: '체크리스트 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ checklists: data || [] })
  } catch (error: any) {
    console.error('Error in GET /api/business/checklists:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: 매장별 체크리스트 생성 (업체관리자/플랫폼관리자)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (user.role === 'business_owner' && user.company_id) {
      const feature = await assertBusinessFeature(user.company_id, 'checklists')
      if (feature.allowed === false) {
        return NextResponse.json({ error: feature.message }, { status: 403 })
      }
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

    // business_owner는 자신의 회사 매장만 생성 가능
    if (user.role === 'business_owner') {
      const { data: storeCheck } = await supabase
        .from('stores')
        .select('company_id')
        .eq('id', store_id)
        .single()

      if (!storeCheck || storeCheck.company_id !== user.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
    }

    // 템플릿 체크리스트 생성: work_date를 과거 날짜로 설정하여 템플릿임을 표시
    // 출근 시 이 템플릿을 복사하여 오늘 날짜로 생성
    const templateDate = '2000-01-01' // 템플릿임을 나타내는 과거 날짜
    
    const { data, error } = await supabase
      .from('checklist')
      .insert({
        store_id,
        user_id: user.id, // 생성자
        assigned_user_id: null, // null로 두면 템플릿으로 인식
        items,
        note: note || null,
        requires_photos: requires_photos || false,
        review_status: 'pending',
        work_date: templateDate, // 템플릿 날짜로 설정 (출근 시 오늘 날짜로 복사됨)
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating checklist:', error)
      return NextResponse.json({ error: '체크리스트 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ checklist: data })
  } catch (error: any) {
    console.error('Error in POST /api/business/checklists:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

