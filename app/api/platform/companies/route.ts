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
      id,
      name,
      address,
      business_registration_number,
      subscription_plan,
      subscription_status,
      trial_ends_at,
      basic_units,
      premium_units,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '회사명은 필수입니다.' },
        { status: 400 }
      )
    }

    if (!['free', 'basic', 'premium'].includes(subscription_plan)) {
      return NextResponse.json(
        { error: '유효하지 않은 요금제입니다.' },
        { status: 400 }
      )
    }

    if (!['active', 'suspended', 'cancelled'].includes(subscription_status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태입니다.' },
        { status: 400 }
      )
    }

    // UUID 형식 검증 (제공된 경우)
    if (id && typeof id === 'string' && id.trim().length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id.trim())) {
        return NextResponse.json(
          { error: '회사 ID는 유효한 UUID 형식이어야 합니다.' },
          { status: 400 }
        )
      }
    }

    const supabase = await createServerSupabaseClient()

    const insertData: any = {
      name: name.trim(),
      address: address?.trim() || null,
      business_registration_number: business_registration_number?.trim() || null,
      subscription_plan: subscription_plan,
      subscription_status: subscription_status,
      trial_ends_at: trial_ends_at || null,
      basic_units: typeof basic_units === 'number' ? Math.max(0, basic_units) : 0,
      premium_units: typeof premium_units === 'number' ? Math.max(0, premium_units) : 0,
    }

    // ID가 제공된 경우 추가
    if (id && typeof id === 'string' && id.trim().length > 0) {
      insertData.id = id.trim()
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating company:', error)
      return NextResponse.json(
        { error: '회사 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ company })
  } catch (error: any) {
    console.error('Error in POST /api/platform/companies:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

