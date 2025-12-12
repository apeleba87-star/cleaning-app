import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view problem reports')
    }

    const supabase = await createServerSupabaseClient()
    const storeId = params.id

    // 최근 30일
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // 먼저 모든 problem_reports 조회하여 category 값 확인
    // photo_url도 조회 (여러 사진이 있을 수 있으므로)
    // updated_at도 조회하여 처리 완료 시점 확인
    const { data: allProblems, error: allError } = await supabase
      .from('problem_reports')
      .select('id, title, description, status, created_at, updated_at, category, vending_machine_number, product_number, photo_url')
      .eq('store_id', storeId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    console.log('All problem reports for store:', storeId, allProblems)

    // 매장 문제 보고 필터링 (category 또는 title 기반)
    const storeProblems = allProblems?.filter((p: any) => {
      const cat = String(p.category || '').toLowerCase().trim()
      const title = String(p.title || '').toLowerCase()
      
      // category로 직접 매칭
      const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
      
      // title에 "매장 문제" 관련 키워드가 포함되어 있으면 매장 문제로 간주
      const titleMatch = title.includes('매장 문제') || 
                        title.includes('자판기 고장') || 
                        title.includes('제품 관련') || 
                        title.includes('무인택배함') || 
                        title.includes('매장 시설') ||
                        title.includes('기타')
      
      // 자판기 내부 문제가 아닌 경우만
      const isNotVending = !title.includes('자판기 수량') && !title.includes('자판기 제품 걸림')
      
      return categoryMatch || (titleMatch && isNotVending)
    }) || []
    
    // 자판기 내부 문제 필터링 (category 또는 title 기반)
    const vendingProblems = allProblems?.filter((p: any) => {
      const cat = String(p.category || '').toLowerCase().trim()
      const title = String(p.title || '').toLowerCase()
      
      // category로 직접 매칭
      const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
      
      // title에 "자판기 수량" 또는 "자판기 제품 걸림"이 포함되어 있으면 자판기 문제로 간주
      const titleMatch = (title.includes('자판기 수량') || title.includes('자판기 제품 걸림')) && title.includes('자판기')
      
      return categoryMatch || titleMatch
    }) || []

    const storeError = allError
    const vendingError = null

    console.log('Store problems query result:', { count: storeProblems?.length || 0, data: storeProblems, error: storeError })
    console.log('Vending problems query result:', { count: vendingProblems?.length || 0, data: vendingProblems, error: vendingError })

    if (storeError || vendingError) {
      console.error('Error fetching problem reports:', { storeError, vendingError })
      throw new Error(`Failed to fetch problem reports: ${storeError?.message || vendingError?.message}`)
    }

    return Response.json({
      success: true,
      data: {
        store_problems: storeProblems || [],
        vending_problems: vendingProblems || [],
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



