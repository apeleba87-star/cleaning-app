import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

    if (user.role !== 'franchise_manager') {
      throw new ForbiddenError('Only franchise managers can view stores')
    }

    const supabase = await createServerSupabaseClient()

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      throw new ForbiddenError('Franchise ID is required')
    }

    const userFranchiseId = userData.franchise_id

    // RLS 우회: stores 조회 (API에서 franchise_id 검증 완료)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = (serviceRoleKey && supabaseUrl)
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: store, error } = await dataClient
      .from('stores')
      .select('*')
      .eq('id', params.id)
      .eq('franchise_id', userFranchiseId)
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

// 매장 수정 (프렌차이즈관리자, service_active 포함)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) throw new UnauthorizedError('Authentication required')
    if (user.role !== 'franchise_manager') throw new ForbiddenError('Only franchise managers can update stores')

    const supabase = await createServerSupabaseClient()
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()
    if (userDataError || !userData?.franchise_id) throw new ForbiddenError('Franchise ID is required')
    const userFranchiseId = userData.franchise_id

    const { data: existingStore, error: checkError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', params.id)
      .eq('franchise_id', userFranchiseId)
      .is('deleted_at', null)
      .single()
    if (checkError || !existingStore) throw new ForbiddenError('Store not found or access denied')

    const body = await request.json()
    const {
      name,
      address,
      management_days,
      schedule_data,
      service_amount,
      category,
      contract_start_date,
      contract_end_date,
      service_active,
      is_night_shift,
      work_start_hour,
      work_end_hour,
    } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = typeof name === 'string' ? name.trim() : null
    if (address !== undefined) updateData.address = typeof address === 'string' ? address.trim() : null
    if (management_days !== undefined) updateData.management_days = management_days?.trim() ?? null
    if (schedule_data !== undefined) updateData.schedule_data = schedule_data ?? null
    if (service_amount !== undefined) updateData.service_amount = service_amount != null ? parseFloat(service_amount) : null
    if (category !== undefined) updateData.category = category?.trim() ?? null
    if (contract_start_date !== undefined) updateData.contract_start_date = contract_start_date ?? null
    if (contract_end_date !== undefined) updateData.contract_end_date = contract_end_date ?? null
    if (service_active !== undefined) updateData.service_active = service_active !== false
    if (is_night_shift !== undefined) updateData.is_night_shift = !!is_night_shift
    if (work_start_hour !== undefined) updateData.work_start_hour = work_start_hour != null ? parseInt(work_start_hour) : 0
    if (work_end_hour !== undefined) updateData.work_end_hour = work_end_hour != null ? parseInt(work_end_hour) : 0

    const { data: store, error } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update store: ${error.message}`)
    return Response.json({ success: true, store })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 매장 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'franchise_manager') {
      throw new ForbiddenError('Only franchise managers can delete stores')
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      throw new ForbiddenError('Franchise ID is required')
    }

    const userFranchiseId = userData.franchise_id

    // 매장이 프렌차이즈에 속해있는지 확인
    const { data: existingStore, error: checkError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', params.id)
      .eq('franchise_id', userFranchiseId)
      .is('deleted_at', null)
      .single()

    if (checkError || !existingStore) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // Soft delete
    const { error } = await supabase
      .from('stores')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to delete store: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

