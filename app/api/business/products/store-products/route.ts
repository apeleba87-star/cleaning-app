import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET: 매장별 제품 목록 조회 (서비스 역할 사용 — RLS 조인으로 인한 조회 실패 방지)
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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: '매장별 제품 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 회사 소속 매장 ID만 허용 (business_owner인 경우)
    let allowedStoreIds: string[] | null = null
    if (user.role === 'business_owner' && user.company_id) {
      const { data: companyStores } = await adminSupabase
        .from('stores')
        .select('id')
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
      allowedStoreIds = companyStores?.map((s) => s.id) ?? []
    }

    let query = adminSupabase
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

    // business_owner는 본인 회사 매장 데이터만 노출
    const filteredLocations =
      allowedStoreIds !== null && locations?.length
        ? locations.filter((loc: any) => allowedStoreIds!.includes(loc.store_id))
        : locations ?? []

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

    filteredLocations.forEach((loc: any) => {
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





