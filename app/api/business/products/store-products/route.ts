import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 매장별 제품 목록 조회
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

    // 매장별 제품 위치 정보 조회
    let query = supabase
      .from('store_product_locations')
      .select(`
        store_id,
        product_id,
        stores:store_id (
          id,
          name
        ),
        products:product_id (
          id,
          name
        )
      `)

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: locations, error } = await query

    if (error) {
      console.error('Error fetching store products:', error)
      return NextResponse.json(
        { error: '매장별 제품 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 매장별로 그룹화
    const storeMap = new Map<string, {
      store_id: string
      store_name: string
      products: Map<string, {
        product_id: string
        product_name: string
        location_count: number
      }>
    }>()

    locations?.forEach((loc: any) => {
      const storeId = loc.store_id
      const storeName = loc.stores?.name || '알 수 없음'
      const productId = loc.product_id
      const productName = loc.products?.name || '알 수 없음'

      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          store_id: storeId,
          store_name: storeName,
          products: new Map()
        })
      }

      const storeData = storeMap.get(storeId)!
      if (!storeData.products.has(productId)) {
        storeData.products.set(productId, {
          product_id: productId,
          product_name: productName,
          location_count: 0
        })
      }

      const productData = storeData.products.get(productId)!
      productData.location_count++
    })

    // 배열로 변환
    const result = Array.from(storeMap.values()).map(store => ({
      store_id: store.store_id,
      store_name: store.store_name,
      product_count: store.products.size,
      products: Array.from(store.products.values())
    }))

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/products/store-products:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}





