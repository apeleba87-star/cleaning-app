import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 도급 정산 수정
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
      throw new ForbiddenError('Only business owners can update subcontract payments')
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.status) updateData.status = body.status
    if (body.paid_at !== undefined) updateData.paid_at = body.paid_at || null
    if (body.memo !== undefined) updateData.memo = body.memo?.trim() || null
    // 정산금액 수정 (근무 일수 등으로 금액 변경 시)
    if (body.amount !== undefined) updateData.amount = Math.round(Number(body.amount))

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

    const { data: payment, error } = await adminSupabase
      .from('subcontract_payments')
      .update(updateData)
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .select(`
        *,
        subcontract:subcontract_id (
          id,
          subcontract_type,
          worker_name,
          subcontractor:subcontractor_id (
            id,
            name
          ),
          worker:worker_id (
            id,
            name
          )
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update subcontract payment: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: payment,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



