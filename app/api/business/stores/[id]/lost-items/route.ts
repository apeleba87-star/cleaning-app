import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 사용자의 회사에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store || store.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 분실물 습득 데이터 조회
    const { data: lostItems, error: lostItemsError } = await supabase
      .from('lost_items')
      .select('id, type, description, photo_url, status, storage_location, created_at, updated_at')
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
    console.error('Error in GET /api/business/stores/[id]/lost-items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


