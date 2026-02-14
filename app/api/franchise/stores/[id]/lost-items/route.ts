import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
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

    // 매장이 사용자의 프렌차이즈에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, franchise_id, company_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store || store.franchise_id !== userData.franchise_id || store.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
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

    // 분실물 습득 데이터 조회
    const { data: lostItems, error: lostItemsError } = await adminSupabase
      .from('lost_items')
      .select('id, type, description, photo_url, status, storage_location, created_at, updated_at, business_confirmed_at, business_confirmed_by')
      .eq('store_id', params.id)
      .order('created_at', { ascending: false })

    if (lostItemsError) {
      console.error('Error fetching lost items:', lostItemsError)
      return NextResponse.json(
        { error: 'Failed to fetch lost items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: lostItems || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/franchise/stores/[id]/lost-items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

