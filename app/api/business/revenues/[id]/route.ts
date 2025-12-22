import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 매출/청구 수정
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
      throw new ForbiddenError('Only business owners can update revenues')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { service_period, amount, due_date, billing_memo } = body

    const supabase = await createServerSupabaseClient()

    // 매출이 회사에 속해있는지 확인
    const { data: existingRevenue } = await supabase
      .from('revenues')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingRevenue) {
      throw new ForbiddenError('Revenue not found or access denied')
    }

    const updateData: any = {}
    if (service_period) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(service_period)) {
        throw new Error('service_period must be in YYYY-MM format')
      }
      updateData.service_period = service_period
    }
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (due_date) updateData.due_date = due_date
    if (billing_memo !== undefined) updateData.billing_memo = billing_memo?.trim() || null

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

    const { data: revenue, error } = await adminSupabase
      .from('revenues')
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
      throw new Error(`Failed to update revenue: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: revenue,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 매출/청구 삭제 (Soft Delete)
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
      throw new ForbiddenError('Only business owners can delete revenues')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 매출이 회사에 속해있는지 확인
    const { data: existingRevenue } = await supabase
      .from('revenues')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingRevenue) {
      throw new ForbiddenError('Revenue not found or access denied')
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

    const { error } = await adminSupabase
      .from('revenues')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to delete revenue: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

