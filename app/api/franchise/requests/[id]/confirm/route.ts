import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

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

    // franchise_manager만 허용
    if (user.role !== 'franchise_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await dataClient
      .from('users')
      .select('franchise_id, company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
    }

    // 요청 조회 (dataClient로 RLS 우회)
    const { data: requestData, error: requestError } = await dataClient
      .from('requests')
      .select(`
        *,
        stores:store_id (
          franchise_id,
          company_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // 권한 확인 - 매장이 해당 프렌차이즈에 속하는지 확인
    if (requestData.stores?.franchise_id !== userData.franchise_id || requestData.stores?.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 처리완료 또는 반려처리 상태인 요청만 확인 가능
    if (requestData.status !== 'completed' && requestData.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Only completed or rejected requests can be confirmed' },
        { status: 400 }
      )
    }

    // 이미 확인 처리된 경우
    if (requestData.business_confirmed_at) {
      return NextResponse.json({ 
        success: true, 
        data: requestData,
        message: 'Already confirmed'
      })
    }

    // DB에 확인 처리 정보 저장 (dataClient로 RLS 우회)
    const { data: updatedRequest, error: updateError } = await dataClient
      .from('requests')
      .update({
        business_confirmed_at: new Date().toISOString(),
        business_confirmed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError || !updatedRequest) {
      console.error('Error updating request confirmation:', updateError)
      return NextResponse.json(
        { error: 'Failed to confirm request' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedRequest
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/franchise/requests/[id]/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



