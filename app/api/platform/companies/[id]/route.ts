import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      name,
      address,
      business_registration_number,
      subscription_plan,
      subscription_status,
      trial_ends_at,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '회사명은 필수입니다.' },
        { status: 400 }
      )
    }

    if (subscription_plan && !['free', 'basic', 'premium'].includes(subscription_plan)) {
      return NextResponse.json(
        { error: '유효하지 않은 요금제입니다.' },
        { status: 400 }
      )
    }

    if (subscription_status && !['active', 'suspended', 'cancelled'].includes(subscription_status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: company, error } = await supabase
      .from('companies')
      .update({
        name: name.trim(),
        address: address?.trim() || null,
        business_registration_number: business_registration_number?.trim() || null,
        subscription_plan: subscription_plan || undefined,
        subscription_status: subscription_status || undefined,
        trial_ends_at: trial_ends_at || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating company:', error)
      return NextResponse.json(
        { error: '회사 정보 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!company) {
      return NextResponse.json(
        { error: '회사를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ company })
  } catch (error: any) {
    console.error('Error in PATCH /api/platform/companies/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


