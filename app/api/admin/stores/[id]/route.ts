import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: '매장명은 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: store, error } = await dataClient
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
      console.error('Error updating store:', error)
      return NextResponse.json(
        { error: '매장 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!store) {
      return NextResponse.json(
        { error: '매장을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ store })
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/stores/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // 소프트 삭제
    const { error } = await dataClient
      .from('stores')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting store:', error)
      return NextResponse.json(
        { error: '매장 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/stores/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

