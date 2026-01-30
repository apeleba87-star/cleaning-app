import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { assertBusinessFeature } from '@/lib/plan-features-server'

// 프렌차이즈 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (user.role === 'business_owner' && !user.company_id) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    if (user.role === 'business_owner' && user.company_id) {
      const feature = await assertBusinessFeature(user.company_id, 'franchises')
      if (!feature.allowed) {
        return NextResponse.json({ error: feature.message }, { status: 403 })
      }
    }

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('franchises')
      .select('id, name')
      .is('deleted_at', null)
      .eq('status', 'active')

    if (user.role === 'business_owner') {
      query = query.eq('company_id', user.company_id)
    }

    const { data: franchises, error } = await query.order('name')

    if (error) {
      console.error('Error fetching franchises:', error)
      return NextResponse.json(
        { error: '프렌차이즈 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      franchises: franchises || [] 
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/franchises:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (user.role === 'business_owner' && !user.company_id) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      company_id,
      name,
      business_registration_number,
      address,
      phone,
      email,
      manager_name,
      contract_start_date,
      contract_end_date,
      status,
      notes,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '프렌차이즈명은 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // business_owner는 자신의 회사에만 프렌차이즈 추가 가능
    const targetCompanyId = user.role === 'business_owner' ? user.company_id : (company_id || null)

    if (!targetCompanyId) {
      return NextResponse.json(
        { error: '회사 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const { data: franchise, error } = await supabase
      .from('franchises')
      .insert({
        company_id: targetCompanyId,
        name: name.trim(),
        business_registration_number: business_registration_number?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        manager_name: manager_name?.trim() || null,
        contract_start_date: contract_start_date || null,
        contract_end_date: contract_end_date || null,
        status: status || 'active',
        notes: notes?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating franchise:', error)
      return NextResponse.json(
        { error: `프렌차이즈 등록에 실패했습니다: ${error.message || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ franchise })
  } catch (error: any) {
    console.error('Error in POST /api/business/franchises:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}





