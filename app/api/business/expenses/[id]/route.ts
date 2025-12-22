import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

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

    const supabase = await createServerSupabaseClient()

    // 지출이 회사에 속해있는지 확인
    const { data: existingExpense } = await supabase
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

    const updateData: any = {}
    if (date) updateData.date = date
    if (category) updateData.category = category
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (memo !== undefined) updateData.memo = memo?.trim() || null
    if (store_id !== undefined) updateData.store_id = store_id || null

    const { data: expense, error } = await supabase
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

    const supabase = await createServerSupabaseClient()

    // 지출이 회사에 속해있는지 확인
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingExpense) {
      throw new ForbiddenError('Expense not found or access denied')
    }

    const { error } = await supabase
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

