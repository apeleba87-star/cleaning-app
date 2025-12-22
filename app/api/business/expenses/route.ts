import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 지출 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('expenses')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: expenses, error } = await query.order('date', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: expenses || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 지출 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { date, category, amount, memo, store_id } = body

    if (!date || !category || !amount) {
      throw new Error('date, category, and amount are required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인 (store_id가 있는 경우)
    if (store_id) {
      const { data: store } = await supabase
        .from('stores')
        .select('id, company_id')
        .eq('id', store_id)
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
        .single()

      if (!store) {
        throw new ForbiddenError('Store not found or access denied')
      }
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        date,
        category,
        amount: parseFloat(amount),
        memo: memo?.trim() || null,
        store_id: store_id || null,
        company_id: user.company_id,
        created_by: user.id,
      })
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to create expense: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: expense,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

