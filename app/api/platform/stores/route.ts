import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      company_id,
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

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        company_id: company_id || null,
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
      .select(`
        *,
        companies:company_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating store:', error)
      return NextResponse.json(
        { error: '매장 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ store })
  } catch (error: any) {
    console.error('Error in POST /api/platform/stores:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}





















