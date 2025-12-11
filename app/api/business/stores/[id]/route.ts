import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 매장 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view stores')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (error || !store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    return Response.json({
      success: true,
      data: store,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 매장 수정
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
      throw new ForbiddenError('Only business owners can update stores')
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

    // 매장이 회사에 속해있는지 확인
    const { data: existingStore, error: checkError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (checkError || !existingStore) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // 매장 수정
    const { data: store, error } = await supabase
      .from('stores')
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update store: ${error.message}`)
    }

    if (!store) {
      throw new Error('Store not found')
    }

    return Response.json({
      store,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

