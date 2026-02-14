import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const period = searchParams.get('period') // YYYY-MM 형식
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '1000') // 기본값 1000 (페이지네이션 없을 때)
    const offset = (page - 1) * limit

    let query = dataClient
      .from('expenses')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    if (period) {
      // period가 YYYY-MM 형식이면 해당 월의 시작일과 종료일로 필터링
      const startOfMonth = `${period}-01`
      const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10)
      query = query.gte('date', startOfMonth).lte('date', endOfMonth)
    } else {
      if (startDate) {
        query = query.gte('date', startDate)
      }

      if (endDate) {
        query = query.lte('date', endDate)
      }
    }

    // 페이지네이션 적용
    query = query.order('date', { ascending: false })
    if (limit < 1000) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: expenses, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: expenses || [],
      pagination: limit < 1000 ? {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      } : undefined
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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) throw new Error('Server configuration error')
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    if (store_id && store_id.trim() !== '') {
      const { data: store } = await adminSupabase
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

    const { data: expense, error } = await adminSupabase
      .from('expenses')
      .insert({
        date,
        category,
        amount: parseFloat(amount),
        memo: memo?.trim() || null,
        store_id: (store_id && store_id.trim() !== '') ? store_id : null,
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

