import { NextRequest } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 지출 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can update expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { date, category, amount, memo, store_id } = body

    // Service role key를 사용하여 RLS 우회 (세션/RLS 이슈로 인한 접근 거부 방지)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error: Service role key is required')
    }
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 지출이 회사에 속해있는지 확인 (RLS 우회)
    const { data: existingExpense } = await adminSupabase
      .from('expenses')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingExpense) {
      throw new ForbiddenError('Expense not found or access denied')
    }

    // 매장이 회사에 속해있는지 확인 (store_id가 변경되는 경우)
    if (store_id !== undefined && store_id !== null && store_id !== '' && store_id.trim() !== '') {
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

    const updateData: any = {}
    if (date) updateData.date = date
    if (category) updateData.category = category
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (memo !== undefined) updateData.memo = memo?.trim() || null
    if (store_id !== undefined) {
      updateData.store_id = (store_id && store_id.trim() !== '') ? store_id : null
    }

    const { data: expense, error } = await adminSupabase
      .from('expenses')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update expense: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: expense,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 지출 삭제 (Soft Delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can delete expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    // Service role key를 사용하여 RLS 우회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error: Service role key is required')
    }
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 지출이 회사에 속해있는지 확인 (RLS 우회)
    const { data: existingExpense } = await adminSupabase
      .from('expenses')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingExpense) {
      throw new ForbiddenError('Expense not found or access denied')
    }

    const { error } = await adminSupabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to delete expense: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

