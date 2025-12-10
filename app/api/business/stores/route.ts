import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { company_id, name, ...storeData } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '매장명은 필수입니다.' },
        { status: 400 }
      )
    }

    // business_owner는 자신의 회사만 추가 가능
    const finalCompanyId = user.role === 'business_owner' ? user.company_id : company_id
    if (!finalCompanyId) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        company_id: finalCompanyId,
        name: name.trim(),
        ...storeData,
      })
      .select()
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
    console.error('Error in POST /api/business/stores:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


