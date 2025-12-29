import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 제품 위치 정보 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('store_product_locations')
      .select(`
        id,
        store_id,
        product_id,
        vending_machine_number,
        position_number,
        stock_quantity,
        is_available,
        last_updated_at,
        stores:store_id (
          id,
          name
        ),
        products:product_id (
          id,
          name
        )
      `)
      .order('last_updated_at', { ascending: false })

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: locations, error } = await query

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json(
        { error: '위치 정보 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 데이터 변환
    const formattedLocations = locations?.map((loc: any) => ({
      id: loc.id,
      store_id: loc.store_id,
      store_name: loc.stores?.name || '알 수 없음',
      product_id: loc.product_id,
      product_name: loc.products?.name || '알 수 없음',
      vending_machine_number: loc.vending_machine_number,
      position_number: loc.position_number,
      stock_quantity: loc.stock_quantity,
      is_available: loc.is_available,
      last_updated_at: loc.last_updated_at
    })) || []

    return NextResponse.json({
      success: true,
      data: formattedLocations
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/products/locations:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}




