import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'store_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 매장관리자가 배정된 매장인지 확인
    const { data: storeAssign } = await supabase
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .single()

    if (!storeAssign) {
      return NextResponse.json({ error: 'Store not found or access denied' }, { status: 404 })
    }

    // 문제보고 조회
    const { data: allReports, error: reportsError } = await supabase
      .from('problem_reports')
      .select('id, title, description, photo_url, status, category, created_at, updated_at')
      .eq('store_id', params.id)
      .order('created_at', { ascending: false })

    if (reportsError) {
      console.error('Error fetching problem reports:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch problem reports' },
        { status: 500 }
      )
    }

    // category와 title로 분류
    const storeProblems: any[] = []
    const vendingProblems: any[] = []

    allReports?.forEach((report) => {
      const category = report.category?.toLowerCase() || ''
      const title = (report.title || '').toLowerCase()

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
    console.error('Error in GET /api/store-manager/stores/[id]/problem-reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





