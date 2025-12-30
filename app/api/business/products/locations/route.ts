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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '500', 10)
    
    // limit 최대값 제한 (500개)
    const safeLimit = Math.min(limit, 500)
    const offset = (page - 1) * safeLimit

    const supabase = await createServerSupabaseClient()

    // 업체관리자인 경우 자신의 회사 매장만 조회
    let companyStoreIds: string[] | null = null
    if (user.role === 'business_owner' && user.company_id) {
      const { data: companyStores } = await supabase
        .from('stores')
        .select('id')
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
      
      companyStoreIds = companyStores?.map(s => s.id) || []
      
      // 업체관리자인데 매장이 없으면 빈 배열 반환
      if (companyStoreIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: []
        })
      }
    }

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

    // 업체관리자인 경우 자신의 회사 매장만 필터링
    if (companyStoreIds && companyStoreIds.length > 0) {
      query = query.in('store_id', companyStoreIds)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    // 자판기 번호, 위치 번호 순서로 정렬
    query = query
      .order('vending_machine_number', { ascending: true })
      .order('position_number', { ascending: true })

    // 전체 개수 조회 (페이지네이션을 위한 총 개수) - 별도 쿼리 사용
    let countQuery = supabase
      .from('store_product_locations')
      .select('*', { count: 'exact', head: true })
    
    if (companyStoreIds && companyStoreIds.length > 0) {
      countQuery = countQuery.in('store_id', companyStoreIds)
    }
    
    if (storeId) {
      countQuery = countQuery.eq('store_id', storeId)
    }
    
    const { count, error: countError } = await countQuery
    
    if (countError) {
      console.error('Error counting locations:', countError)
      return NextResponse.json(
        { error: '위치 정보 개수 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 페이지네이션된 데이터 조회
    const { data: locations, error: locationsError } = await query
      .range(offset, offset + safeLimit - 1)
    
    if (locationsError) {
      console.error('Error fetching locations:', locationsError)
      return NextResponse.json(
        { error: '위치 정보 조회에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    const allLocations = locations || []

    // 데이터 변환
    const formattedLocations = allLocations.map((loc: any) => ({
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
    }))

    const totalPages = Math.ceil((count || 0) / safeLimit)

    return NextResponse.json({
      success: true,
      data: formattedLocations,
      pagination: {
        page,
        limit: safeLimit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/products/locations:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}





