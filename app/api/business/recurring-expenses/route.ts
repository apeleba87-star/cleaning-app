import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 고정비 템플릿 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view recurring expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    const { data: recurringExpenses, error } = await supabase
      .from('recurring_expenses')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch recurring expenses: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: recurringExpenses || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 고정비 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create recurring expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { category, amount, memo, store_id, create_current_month } = body

    if (!category || !amount) {
      throw new Error('category and amount are required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인 (store_id가 있는 경우)
    if (store_id && store_id.trim() !== '') {
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

    // RLS 우회를 위해 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error: Service role key is required')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 고정비 템플릿 생성
    const { data: recurringExpense, error } = await adminSupabase
      .from('recurring_expenses')
      .insert({
        company_id: user.company_id,
        category,
        amount: parseFloat(amount),
        memo: memo?.trim() || null,
        store_id: (store_id && store_id.trim() !== '') ? store_id : null,
        created_by: user.id,
        is_active: true,
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
      throw new Error(`Failed to create recurring expense: ${error.message}`)
    }

    // 현재 월 지출도 함께 생성 (선택사항)
    if (create_current_month) {
      const today = new Date()
      const firstDayOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
      
      await adminSupabase
        .from('expenses')
        .insert({
          company_id: user.company_id,
          date: firstDayOfMonth,
          category,
          amount: parseFloat(amount),
          memo: memo?.trim() || null,
          store_id: (store_id && store_id.trim() !== '') ? store_id : null,
          created_by: user.id,
          recurring_expense_id: recurringExpense.id,
        })
    }

    return Response.json({
      success: true,
      data: recurringExpense,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
