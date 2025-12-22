import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// 요청 확인 (처리완료된 요청 확인 처리)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // business_owner, store_manager, franchise_manager만 허용
    if (user.role !== 'business_owner' && user.role !== 'store_manager' && user.role !== 'franchise_manager') {
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

    // 권한 확인
    if (user.role === 'business_owner') {
      // 업체관리자는 자신의 회사 매장 요청만 확인 가능
      if (requestData.stores?.company_id !== user.company_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (user.role === 'store_manager') {
      // 점주는 자신이 배정된 매장의 요청만 확인 가능
      const { data: storeAssign, error: storeAssignError } = await supabase
        .from('store_assign')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', requestData.store_id)
        .maybeSingle()

      if (storeAssignError || !storeAssign) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (user.role === 'franchise_manager') {
      // 프렌차이즈 관리자는 자신의 프렌차이즈 매장 요청만 확인 가능
      // 먼저 사용자의 franchise_id 조회
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('franchise_id, company_id')
        .eq('id', user.id)
        .single()

      if (userDataError || !userData || !userData.franchise_id) {
        return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
      }

      // 매장이 해당 프렌차이즈에 속하는지 확인
      const { data: storeData, error: storeDataError } = await supabase
        .from('stores')
        .select('franchise_id, company_id')
        .eq('id', requestData.store_id)
        .single()

      if (storeDataError || !storeData) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
      }

      if (storeData.franchise_id !== userData.franchise_id || storeData.company_id !== userData.company_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 처리완료 또는 반려처리 상태인 요청만 확인 가능
    if (requestData.status !== 'completed' && requestData.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Only completed or rejected requests can be confirmed' },
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

