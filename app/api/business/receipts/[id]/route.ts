import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 수금 수정
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
      throw new ForbiddenError('Only business owners can update receipts')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { received_at, amount, memo } = body

    const supabase = await createServerSupabaseClient()

    // 수금이 회사에 속해있는지 확인
    const { data: existingReceipt } = await supabase
      .from('receipts')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingReceipt) {
      throw new ForbiddenError('Receipt not found or access denied')
    }

    const updateData: any = {}
    if (received_at) updateData.received_at = received_at
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (memo !== undefined) updateData.memo = memo?.trim() || null

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

    const { data: receipt, error } = await adminSupabase
      .from('receipts')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        revenues:revenue_id (
          id,
          store_id,
          service_period,
          amount,
          stores:store_id (
            id,
            name
          )
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update receipt: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: receipt,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 수금 삭제 (Soft Delete)
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
      throw new ForbiddenError('Only business owners can delete receipts')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 수금이 회사에 속해있는지 확인
    const { data: existingReceipt } = await supabase
      .from('receipts')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingReceipt) {
      throw new ForbiddenError('Receipt not found or access denied')
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
      .from('receipts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to delete receipt: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

