import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'franchise_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id, company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
    }

    // RLS 정책 문제로 인해 서비스 역할 키 사용
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 분실물 조회 (서비스 역할 키 사용)
    const { data: lostItem, error: fetchError } = await adminSupabase
      .from('lost_items')
      .select('id, store_id, status, updated_at')
      .eq('id', params.id)
      .single()

    if (fetchError || !lostItem) {
      console.error('Lost item fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Lost item not found' },
        { status: 404 }
      )
    }

    // 매장이 사용자의 프렌차이즈에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, franchise_id, company_id')
      .eq('id', lostItem.store_id)
      .single()

    if (storeError || !store || store.franchise_id !== userData.franchise_id || store.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // franchise_confirmed_at 컬럼이 없으므로 status만 업데이트
    // 이미 completed 상태면 이미 확인된 것으로 간주
    if (lostItem.status === 'completed') {
      return NextResponse.json({ 
        success: true, 
        message: 'Already confirmed',
        data: lostItem
      })
    }

    const updatedAt = new Date().toISOString()
    
    // 'completed' 상태로 업데이트 (franchise_confirmed_at 컬럼이 없으므로 status만 사용)
    const { data: updatedItem, error: updateError } = await adminSupabase
      .from('lost_items')
      .update({ 
        status: 'completed',
        updated_at: updatedAt,
      })
      .eq('id', params.id)
      .select('id, status, updated_at, store_id')
      .single()
    
    if (updateError) {
      console.error('Error updating lost item status:', updateError)
      return NextResponse.json(
        { error: `Failed to update status: ${updateError.message || JSON.stringify(updateError)}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      data: updatedItem,
      status: updatedItem?.status || 'completed'
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/franchise/lost-items/[id]/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
