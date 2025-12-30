import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'staff') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')
    const name = searchParams.get('name')
    const storeId = searchParams.get('store_id')

    if (!storeId) {
      return NextResponse.json(
        { error: '매장 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 매장 배정 확인
    const { data: storeAssignment, error: assignError } = await supabase
      .from('store_assign')
      .select('store_id')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .single()

    if (assignError || !storeAssignment) {
      return NextResponse.json(
        { error: '해당 매장에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }

    let productQuery = supabase
      .from('products')
      .select('id, name, barcode, image_url, category_1, category_2')
      .is('deleted_at', null)

    // 바코드 검색 (DB에 저장된 값에 작은따옴표가 있을 수 있으므로 두 가지 경우 모두 검색)
    if (barcode) {
      // 입력된 바코드에서 작은따옴표 제거 (앞뒤 공백 및 앞의 작은따옴표 제거)
      const cleanBarcode = barcode.trim().replace(/^'/, '')
      
      // 두 가지 경우 모두 검색: cleanBarcode와 'cleanBarcode
      // 각각 별도 쿼리로 실행
      const query1 = supabase
        .from('products')
        .select('id, name, barcode, image_url, category_1, category_2')
        .is('deleted_at', null)
        .eq('barcode', cleanBarcode)
      
      const query2 = supabase
        .from('products')
        .select('id, name, barcode, image_url, category_1, category_2')
        .is('deleted_at', null)
        .eq('barcode', `'${cleanBarcode}`)
      
      const { data: products1, error: error1 } = await query1
      const { data: products2, error: error2 } = await query2
      
      if (error1 && error2) {
        console.error('Error searching products by barcode:', error1 || error2)
        return NextResponse.json(
          { error: `제품 검색에 실패했습니다: ${(error1 || error2).message}` },
          { status: 500 }
        )
      }
      
      // 두 결과를 합치고 중복 제거 (같은 ID를 가진 제품이 있을 수 있음)
      const allProducts = [...(products1 || []), ...(products2 || [])]
      const uniqueProducts = Array.from(
        new Map(allProducts.map((p: any) => [p.id, p])).values()
      )
      
      // 제품이 없으면 빈 배열 반환
      if (uniqueProducts.length === 0) {
        const { count: totalProducts } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)

        return NextResponse.json({
          success: true,
          data: [],
          message: totalProducts === 0 
            ? '데이터베이스에 등록된 제품이 없습니다. 관리자에게 CSV 파일 업로드를 요청해주세요.'
            : '검색 결과가 없습니다. 제품명을 확인해주세요.'
        })
      }
      
      // 위치 정보 조회를 위해 productIds 설정
      const productIds = uniqueProducts.map((p: any) => p.id)
      const { data: locations, error: locationError } = await supabase
        .from('store_product_locations')
        .select('product_id, vending_machine_number, position_number, stock_quantity, is_available')
        .eq('store_id', storeId)
        .in('product_id', productIds)
        .order('vending_machine_number', { ascending: true })
        .order('position_number', { ascending: true })

      if (locationError) {
        console.error('Error fetching locations:', locationError)
        return NextResponse.json(
          { error: '위치 정보 조회에 실패했습니다.' },
          { status: 500 }
        )
      }

      // 제품별로 위치 정보 그룹화
      const locationMap = new Map()
      if (locations) {
        locations.forEach((loc: any) => {
          if (!locationMap.has(loc.product_id)) {
            locationMap.set(loc.product_id, [])
          }
          locationMap.get(loc.product_id).push({
            vending_machine_number: loc.vending_machine_number,
            position_number: loc.position_number,
            stock_quantity: loc.stock_quantity,
            is_available: loc.is_available
          })
        })
      }

      // 결과 조합
      const result = uniqueProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        image_url: product.image_url,
        category_1: product.category_1,
        category_2: product.category_2,
        locations: locationMap.get(product.id) || []
      }))

      return NextResponse.json({
        success: true,
        data: result
      })
    }
    // 제품명 검색
    else if (name) {
      productQuery = productQuery.ilike('name', `%${name}%`)
    } else {
      return NextResponse.json(
        { error: '바코드 또는 제품명을 입력해주세요.' },
        { status: 400 }
      )
    }

    const { data: products, error: productError } = await productQuery

    if (productError) {
      console.error('Error searching products:', productError)
      console.error('Search params:', { barcode, name, storeId })
      return NextResponse.json(
        { error: `제품 검색에 실패했습니다: ${productError.message}` },
        { status: 500 }
      )
    }

    if (!products || products.length === 0) {
      // 전체 제품 수 확인 (데이터가 있는지 체크)
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)

      return NextResponse.json({
        success: true,
        data: [],
        message: totalProducts === 0 
          ? '데이터베이스에 등록된 제품이 없습니다. 관리자에게 CSV 파일 업로드를 요청해주세요.'
          : '검색 결과가 없습니다. 제품명을 확인해주세요.'
      })
    }

    // 각 제품의 위치 정보 조회
    const productIds = products.map(p => p.id)
    const { data: locations, error: locationError } = await supabase
      .from('store_product_locations')
      .select('product_id, vending_machine_number, position_number, stock_quantity, is_available')
      .eq('store_id', storeId)
      .in('product_id', productIds)
      .order('vending_machine_number', { ascending: true })
      .order('position_number', { ascending: true })

    if (locationError) {
      console.error('Error fetching locations:', locationError)
      return NextResponse.json(
        { error: '위치 정보 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 제품별로 위치 정보 그룹화
    const locationMap = new Map()
    if (locations) {
      locations.forEach((loc: any) => {
        if (!locationMap.has(loc.product_id)) {
          locationMap.set(loc.product_id, [])
        }
        locationMap.get(loc.product_id).push({
          vending_machine_number: loc.vending_machine_number,
          position_number: loc.position_number,
          stock_quantity: loc.stock_quantity,
          is_available: loc.is_available
        })
      })
    }

    // 결과 조합
    const result = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      image_url: product.image_url,
      category_1: product.category_1,
      category_2: product.category_2,
      locations: locationMap.get(product.id) || []
    }))

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Error in GET /api/staff/products/search:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

