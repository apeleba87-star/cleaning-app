import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 매장 목록 조회
export async function GET(request: NextRequest) {
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

    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, service_amount, payment_method, payment_day')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch stores: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: stores || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

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

    // franchise_id가 있으면 해당 프렌차이즈가 회사에 속하는지 확인
    if (franchise_id) {
      const { data: franchise } = await supabase
        .from('franchises')
        .select('company_id')
        .eq('id', franchise_id)
        .single()

      if (!franchise || franchise.company_id !== user.company_id) {
        throw new Error('유효하지 않은 프렌차이즈입니다.')
      }
    }

    // insert 데이터 준비
    const insertData: any = {
      company_id: user.company_id,
      franchise_id: franchise_id || null,
      head_office_name: '개인', // 기본값으로 설정
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
    }

    // schedule_data 컬럼이 있으면 추가 (컬럼이 없어도 에러가 나지 않도록)
    if (schedule_data) {
      insertData.schedule_data = schedule_data
    }

    const { data: store, error } = await supabase
      .from('stores')
      .insert(insertData)
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













