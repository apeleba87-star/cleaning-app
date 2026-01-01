import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 고정비 템플릿 수정
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
      throw new ForbiddenError('Only business owners can update recurring expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { category, amount, memo, store_id, is_active } = body

    const supabase = await createServerSupabaseClient()

    // 본인의 회사 고정비인지 확인
    const { data: existing } = await supabase
      .from('recurring_expenses')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      throw new ForbiddenError('Recurring expense not found or access denied')
    }

    // 매장 확인 (store_id가 있는 경우)
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

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (category !== undefined) updateData.category = category
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (memo !== undefined) updateData.memo = memo?.trim() || null
    if (store_id !== undefined) updateData.store_id = (store_id && store_id.trim() !== '') ? store_id : null
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updated, error } = await adminSupabase
      .from('recurring_expenses')
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
      throw new Error(`Failed to update recurring expense: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 고정비 템플릿 삭제
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
      throw new ForbiddenError('Only business owners can delete recurring expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 본인의 회사 고정비인지 확인
    const { data: existing } = await supabase
      .from('recurring_expenses')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      throw new ForbiddenError('Recurring expense not found or access denied')
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

    // Soft delete
    const { error } = await adminSupabase
      .from('recurring_expenses')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to delete recurring expense: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
