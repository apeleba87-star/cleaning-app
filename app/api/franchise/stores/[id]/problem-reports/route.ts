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
      .select('id, title, description, photo_url, status, category, vending_machine_number, product_number, created_at, updated_at')
      .eq('store_id', params.id)
      .order('created_at', { ascending: false })

    if (reportsError) {
      console.error('Error fetching problem reports:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch problem reports' },
        { status: 500 }
      )
    }

    // category를 우선적으로 확인하고, 없으면 title을 확인
    const storeProblems: any[] = []
    const vendingProblems: any[] = []

    allReports?.forEach((report) => {
      const category = report.category?.toLowerCase() || ''
      const title = (report.title || '').toLowerCase()

      // category를 먼저 확인 (가장 정확함)
      const isStoreProblemByCategory =
        category === 'store_problem' ||
        category === 'store-problem' ||
        category === 'storeproblem'

      const isVendingProblemByCategory =
        category === 'vending_machine' ||
        category === 'vending-machine' ||
        category === 'vendingmachine'

      // category가 명확하면 category 기준으로 분류
      if (isStoreProblemByCategory) {
        storeProblems.push(report)
        return
      }
      if (isVendingProblemByCategory) {
        vendingProblems.push(report)
        return
      }

      // category가 'other'이거나 없을 때만 title로 판단
      if (title.includes('제품 걸림') || title.includes('수량 오류') || 
          (title.includes('자판기') && (title.includes('제품') || title.includes('수량')))) {
        vendingProblems.push(report)
      } else if (title.includes('자판기 고장') || title.includes('자판기 오류')) {
        storeProblems.push(report)
      } else if (title.includes('자판기') || title.includes('vending')) {
        vendingProblems.push(report)
      } else {
        storeProblems.push(report)
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

