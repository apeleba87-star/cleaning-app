import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 매장 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create stores')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const {
      head_office_name,
      parent_store_name,
      name,
      address,
      management_days,
      service_amount,
      category,
      contract_start_date,
      contract_end_date,
      service_active,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('매장명은 필수입니다.')
    }

    const supabase = await createServerSupabaseClient()

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        company_id: user.company_id,
        head_office_name: head_office_name?.trim() || '개인',
        parent_store_name: parent_store_name?.trim() || null,
        name: name.trim(),
        address: address?.trim() || null,
        management_days: management_days?.trim() || null,
        service_amount: service_amount ? parseFloat(service_amount) : null,
        category: category?.trim() || null,
        contract_start_date: contract_start_date || null,
        contract_end_date: contract_end_date || null,
        service_active: service_active !== undefined ? service_active : true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create store: ${error.message}`)
    }

    return Response.json({
      success: true,
      store,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}





