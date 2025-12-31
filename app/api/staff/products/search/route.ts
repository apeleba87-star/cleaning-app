import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 바코드 정규화 함수 (모든 공백, 특수문자 제거, 숫자만 남기기)
function normalizeBarcode(barcode: string | null | undefined): string | null {
  if (!barcode) return null
  // 모든 공백, 작은따옴표, 큰따옴표, 특수문자 제거하고 숫자만 남기기
  const normalized = barcode.replace(/\s+/g, '').replace(/'/g, '').replace(/"/g, '').replace(/[^\d]/g, '')
  return normalized.length > 0 ? normalized : null
}

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

    // 바코드 검색 (정규화된 값으로 검색)
    if (barcode) {
      // 바코드 정규화 (모든 공백, 특수문자 제거, 숫자만 남기기)
      const normalizedBarcode = normalizeBarcode(barcode)
      
      if (!normalizedBarcode) {
        return NextResponse.json({
          success: true,
          data: [],
          message: '유효하지 않은 바코드입니다.'
        })
      }
      
      // 정규화된 바코드로 검색 (DB에 저장된 값도 정규화되어 있으므로 정확 일치 검색)
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, name, barcode, image_url, category_1, category_2')
        .is('deleted_at', null)
        .eq('barcode', normalizedBarcode)
      
      if (productError) {
        console.error('Error searching products by barcode:', productError)
        return NextResponse.json(
          { error: `제품 검색에 실패했습니다: ${productError.message}` },
          { status: 500 }
        )
      }
      
      const uniqueProducts = products || []
      
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
    // 제품명 검색 (띄어쓰기 무시)
    else if (name) {
      // 검색어 정규화: 공백 제거 및 소문자 변환
      const normalizedSearch = name.replace(/\s+/g, '').toLowerCase().trim()
      
      if (!normalizedSearch) {
        return NextResponse.json(
          { error: '검색어를 입력해주세요.' },
          { status: 400 }
        )
      }
      
      // 모든 제품을 가져와서 서버 측에서 필터링 (띄어쓰기 완전 무시)
      // 성능을 위해 검색어의 앞부분(최소 2글자)으로 먼저 필터링
      const searchPrefix = normalizedSearch.length >= 2 
        ? normalizedSearch.substring(0, 2) 
        : normalizedSearch
      
      // 검색어의 앞부분으로 시작하는 제품들을 먼저 가져오기
      const { data: allProducts, error: productError } = await supabase
        .from('products')
        .select('id, name, barcode, image_url, category_1, category_2')
        .is('deleted_at', null)
        .ilike('name', `%${searchPrefix}%`) // 앞부분으로 필터링
      
      if (productError) {
        console.error('Error searching products:', productError)
        return NextResponse.json(
          { error: `제품 검색에 실패했습니다: ${productError.message}` },
          { status: 500 }
        )
      }
      
      // 제품명의 공백을 제거한 값과 검색어의 공백을 제거한 값을 비교하여 필터링
      const filteredProducts = (allProducts || []).filter((product: any) => {
        const productNameNormalized = product.name.replace(/\s+/g, '').toLowerCase()
        return productNameNormalized.includes(normalizedSearch)
      })
      
      // 필터링된 제품이 없으면 빈 배열 반환
      if (filteredProducts.length === 0) {
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
      const productIds = filteredProducts.map((p: any) => p.id)
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
      const result = filteredProducts.map((product: any) => ({
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
    } else {
      return NextResponse.json(
        { error: '바코드 또는 제품명을 입력해주세요.' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error in GET /api/staff/products/search:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

