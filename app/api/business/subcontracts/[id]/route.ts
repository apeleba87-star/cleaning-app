import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 도급 수정 및 삭제
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
      throw new ForbiddenError('Only business owners can update subcontracts')
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.contract_period_start) updateData.contract_period_start = body.contract_period_start
    if (body.contract_period_end !== undefined) updateData.contract_period_end = body.contract_period_end || null
    if (body.monthly_amount) updateData.monthly_amount = parseFloat(body.monthly_amount)
    if (body.tax_rate !== undefined) updateData.tax_rate = parseFloat(body.tax_rate)
    if (body.status) updateData.status = body.status
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name?.trim() || null
    if (body.account_number !== undefined) updateData.account_number = body.account_number?.trim() || null
    if (body.memo !== undefined) updateData.memo = body.memo?.trim() || null

    const supabase = await createServerSupabaseClient()

    // Service role key를 사용하여 RLS 우회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: subcontract, error } = await adminSupabase
      .from('subcontracts')
      .update(updateData)
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .select(`
        *,
        subcontractor:subcontractor_id (
          id,
          name
        ),
        worker:worker_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update subcontract: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: subcontract,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

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
      throw new ForbiddenError('Only business owners can delete subcontracts')
    }

    const supabase = await createServerSupabaseClient()

    // Service role key를 사용하여 RLS 우회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { error } = await adminSupabase
      .from('subcontracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('company_id', user.company_id)

    if (error) {
      throw new Error(`Failed to delete subcontract: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



