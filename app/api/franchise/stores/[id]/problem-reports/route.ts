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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // franchise_id 조회 (업체 API와 동일하게 사용자 정보는 세션 기반)
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
    }

    // 매장 조회·검증은 업체 API와 동일하게 dataClient(서비스 역할) 사용 (RLS 우회)
    const { data: store, error: storeError } = await dataClient
      .from('stores')
      .select('id, franchise_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store || store.franchise_id !== userData.franchise_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 모든 problem_reports 조회 (업체 API와 동일하게 dataClient 사용)
    const { data: allReports, error: reportsError } = await dataClient
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

    // 업체 API와 동일한 분류 규칙 (category 우선, 없으면 title)
    const storeProblems: any[] = []
    const vendingProblems: any[] = []

    allReports?.forEach((report) => {
      const category = (report.category || '').toLowerCase()
      const title = (report.title || '').toLowerCase()

      const isStoreProblemByCategory =
        category === 'store_problem' || category === 'store-problem' || category === 'storeproblem'
      const isVendingProblemByCategory =
        category === 'vending_machine' || category === 'vending-machine' || category === 'vendingmachine'

      if (isStoreProblemByCategory) {
        storeProblems.push(report)
        return
      }
      if (isVendingProblemByCategory) {
        vendingProblems.push(report)
        return
      }

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

