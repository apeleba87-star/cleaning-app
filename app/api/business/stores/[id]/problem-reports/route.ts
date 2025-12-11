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

    // 매장 문제 보고
    const { data: storeProblems, error: storeError } = await supabase
      .from('problem_reports')
      .select('id, title, description, photo_url, status, created_at')
      .eq('store_id', storeId)
      .eq('category', 'store_problem')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    // 자판기 내부 문제
    const { data: vendingProblems, error: vendingError } = await supabase
      .from('problem_reports')
      .select('id, title, description, photo_url, status, created_at')
      .eq('store_id', storeId)
      .eq('category', 'vending_machine')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    if (storeError || vendingError) {
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


