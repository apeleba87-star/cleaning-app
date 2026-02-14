import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { deleteStoreData } from '@/lib/store-delete'

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

    // RLS 우회: stores 조회 (API에서 company_id 검증 완료)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = (serviceRoleKey && supabaseUrl)
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: store, error } = await dataClient
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
      franchise_id,
      parent_store_name,
      name,
      address,
      management_days,
      schedule_data,
      service_amount,
      category,
      contract_start_date,
      contract_end_date,
      service_active,
      payment_method,
      settlement_cycle,
      payment_day,
      tax_invoice_required,
      unpaid_tracking_enabled,
      billing_memo,
      special_notes,
      access_info,
      is_night_shift,
      work_start_hour,
      work_end_hour,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('매장명은 필수입니다.')
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = (serviceRoleKey && supabaseUrl)
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // 매장이 회사에 속해있는지 확인 (RLS 우회)
    const { data: existingStore, error: checkError } = await dataClient
      .from('stores')
      .select('id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (checkError || !existingStore) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // franchise_id가 있으면 해당 프렌차이즈가 회사에 속하는지 확인
    if (franchise_id) {
      const { data: franchise } = await dataClient
        .from('franchises')
        .select('company_id')
        .eq('id', franchise_id)
        .single()

      if (!franchise || franchise.company_id !== user.company_id) {
        throw new Error('유효하지 않은 프렌차이즈입니다.')
      }
    }

    // update 데이터 준비
    const updateData: any = {
      franchise_id: franchise_id || null,
      parent_store_name: parent_store_name?.trim() || null,
      name: name.trim(),
      address: address?.trim() || null,
      management_days: management_days?.trim() || null,
      service_amount: service_amount ? parseFloat(service_amount) : null,
      category: category?.trim() || null,
      contract_start_date: contract_start_date || null,
      contract_end_date: contract_end_date || null,
      service_active: service_active !== undefined ? service_active : true,
      payment_method: payment_method || null,
      settlement_cycle: settlement_cycle || null,
      payment_day: payment_day ? parseInt(payment_day) : null,
      tax_invoice_required: tax_invoice_required !== undefined ? tax_invoice_required : false,
      unpaid_tracking_enabled: unpaid_tracking_enabled !== undefined ? unpaid_tracking_enabled : false,
      billing_memo: billing_memo?.trim() || null,
      special_notes: special_notes?.trim() || null,
      access_info: access_info?.trim() || null,
      is_night_shift: is_night_shift !== undefined ? is_night_shift : false,
      work_start_hour: work_start_hour !== undefined && work_start_hour !== null ? parseInt(work_start_hour) : 0,
      work_end_hour: work_end_hour !== undefined && work_end_hour !== null ? parseInt(work_end_hour) : 0,
      updated_at: new Date().toISOString(),
    }

    // schedule_data 컬럼이 있으면 추가 (컬럼이 없어도 에러가 나지 않도록)
    if (schedule_data !== undefined) {
      updateData.schedule_data = schedule_data || null
    }

    const { data: store, error } = await dataClient
      .from('stores')
      .update(updateData)
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

// 매장 삭제: 관련 Storage·DB 정리 후 소프트 삭제 (검증된 storeId만 사용)
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
      throw new ForbiddenError('Only business owners can delete stores')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = (serviceRoleKey && supabaseUrl)
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // 매장이 회사에 속해있는지 확인 후, 이후 모든 작업은 이 storeId만 사용 (RLS 우회)
    const { data: existingStore, error: checkError } = await dataClient
      .from('stores')
      .select('id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (checkError || !existingStore) {
      throw new ForbiddenError('Store not found or access denied')
    }

    const storeId = existingStore.id as string

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error: Service role key is required for store deletion')
    }

    const url = new URL(request.url)
    const dryRun = url.searchParams.get('dryRun') === 'true'

    const result = await deleteStoreData(dataClient, storeId, dryRun)

    if (!result.success) {
      throw new Error(result.error || '매장 삭제에 실패했습니다.')
    }

    if (result.preview) {
      return Response.json({
        success: true,
        dryRun: true,
        preview: result.preview,
      })
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
