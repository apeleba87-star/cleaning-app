import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'franchise_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id, company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
    }

    // 매장이 사용자의 프렌차이즈에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, franchise_id, company_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store || store.franchise_id !== userData.franchise_id || store.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // RLS 정책 문제로 인해 서비스 역할 키 사용
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 모든 problem_reports 조회 (category와 title 확인을 위해)
    const { data: allReports, error: reportsError } = await adminSupabase
      .from('problem_reports')
      .select('id, title, description, photo_url, status, category, vending_machine_number, product_number, created_at, updated_at, business_confirmed_at, business_confirmed_by')
      .eq('store_id', params.id)
      .order('created_at', { ascending: false })

    if (reportsError) {
      console.error('Error fetching problem reports:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch problem reports' },
        { status: 500 }
      )
    }

    // status 목록 API와 동일한 분류 규칙 적용 (카드 건수와 모달 목록 일치)
    const storeProblems: any[] = []
    const vendingProblems: any[] = []

    allReports?.forEach((report) => {
      const category = (report.category || '').toString().toLowerCase().trim()
      const title = (report.title || '').toString().toLowerCase()

      const isStoreProblemByCategory =
        category === 'store_problem' ||
        category === 'store-problem' ||
        category === 'storeproblem'
      const isVendingProblemByCategory =
        category === 'vending_machine' ||
        category === 'vending-machine' ||
        category === 'vendingmachine'

      if (isStoreProblemByCategory) {
        storeProblems.push(report)
        return
      }
      if (isVendingProblemByCategory) {
        vendingProblems.push(report)
        return
      }

      // category가 없거나 'other' 등일 때: status API와 동일하게 title 기준
      // "매장 문제" 등 매장 문제 제목을 먼저 확인 (목록 카드와 동일)
      const storeTitleMatch =
        title.includes('매장 문제') ||
        title.includes('제품 관련') ||
        title.includes('무인택배함') ||
        title.includes('매장 시설') ||
        title.includes('자판기 고장') ||
        title.includes('자판기 오류')
      const vendingTitleMatch =
        title.includes('제품 걸림') ||
        title.includes('수량 오류') ||
        (title.includes('자판기') && (title.includes('제품') || title.includes('수량')))

      if (vendingTitleMatch && !title.includes('자판기 고장') && !title.includes('자판기 오류')) {
        vendingProblems.push(report)
      } else if (storeTitleMatch || !title.includes('자판기')) {
        storeProblems.push(report)
      } else {
        vendingProblems.push(report)
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        store_problems: storeProblems,
        vending_problems: vendingProblems,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/franchise/stores/[id]/problem-reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

