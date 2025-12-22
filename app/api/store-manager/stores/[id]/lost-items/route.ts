import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'store_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 매장관리자가 배정된 매장인지 확인
    const { data: storeAssign } = await supabase
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .single()

    if (!storeAssign) {
      return NextResponse.json({ error: 'Store not found or access denied' }, { status: 404 })
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
    console.error('Error in GET /api/store-manager/stores/[id]/lost-items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





