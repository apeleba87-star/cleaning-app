import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// 요청 확인 (처리완료된 요청 확인 처리)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 요청 조회
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select(`
        *,
        stores:store_id (
          company_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // 매장이 사용자의 회사에 속하는지 확인
    if (requestData.stores?.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 처리완료 상태인 요청만 확인 가능
    if (requestData.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed requests can be confirmed' },
        { status: 400 }
      )
    }

    // confirmed_at 컬럼이 없으므로 성공만 반환 (클라이언트에서 상태 관리)
    // 필요시 description이나 다른 필드에 확인 정보를 저장할 수 있음
    return NextResponse.json({ 
      success: true, 
      data: {
        ...requestData,
        confirmed_at: new Date().toISOString(), // 클라이언트에서 사용할 수 있도록 반환
      }
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/requests/[id]/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

