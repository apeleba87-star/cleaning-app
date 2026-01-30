import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { assertBusinessFeature } from '@/lib/plan-features-server'
import { NextRequest, NextResponse } from 'next/server'

// 바코드 정규화 함수 (모든 공백, 특수문자 제거, 숫자만 남기기)
function normalizeBarcode(barcode: string | null | undefined): string | null {
  if (!barcode) return null
  // 모든 공백, 작은따옴표, 큰따옴표, 특수문자 제거하고 숫자만 남기기
  const normalized = barcode.replace(/\s+/g, '').replace(/'/g, '').replace(/"/g, '').replace(/[^\d]/g, '')
  return normalized.length > 0 ? normalized : null
}

// GET: 제품 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (user.role === 'business_owner' && user.company_id) {
      const feature = await assertBusinessFeature(user.company_id, 'products')
      if (!feature.allowed) {
        return NextResponse.json({ error: feature.message }, { status: 403 })
      }
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = supabase
      .from('products')
      .select('id, name, barcode, image_url, category_1, category_2, created_at, updated_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // 검색어가 있으면 제품명으로 필터링
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: '제품 목록 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: products || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/products:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 제품 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, barcode, image_url, category_1, category_2 } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '제품명은 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 제품명 중복 확인
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('name', name.trim())
      .is('deleted_at', null)
      .single()

    if (existingProduct) {
      return NextResponse.json(
        { error: '이미 존재하는 제품명입니다.' },
        { status: 400 }
      )
    }

    // 바코드 정규화
    const normalizedBarcode = normalizeBarcode(barcode)

    // 바코드가 있으면 중복 확인 (정규화된 값으로)
    if (normalizedBarcode) {
      const { data: existingBarcode, error: barcodeCheckError } = await supabase
        .from('products')
        .select('id')
        .eq('barcode', normalizedBarcode)
        .is('deleted_at', null)
        .single()

      if (existingBarcode) {
        return NextResponse.json(
          { error: '이미 존재하는 바코드입니다.' },
          { status: 400 }
        )
      }
    }

    // 제품 생성
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        barcode: normalizedBarcode,
        image_url: image_url?.trim() || null,
        category_1: category_1?.trim() || null,
        category_2: category_2?.trim() || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating product:', insertError)
      return NextResponse.json(
        { error: `제품 생성에 실패했습니다: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: product
    })
  } catch (error: any) {
    console.error('Error in POST /api/business/products:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

