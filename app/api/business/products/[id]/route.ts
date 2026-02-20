import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 바코드 정규화 함수 (모든 공백, 특수문자 제거, 숫자만 남기기)
function normalizeBarcode(barcode: string | null | undefined): string | null {
  if (!barcode) return null
  // 모든 공백, 작은따옴표, 큰따옴표, 특수문자 제거하고 숫자만 남기기
  const normalized = barcode.replace(/\s+/g, '').replace(/'/g, '').replace(/"/g, '').replace(/[^\d]/g, '')
  return normalized.length > 0 ? normalized : null
}

function getAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// PATCH: 제품 수정 (바코드 포함)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const supabase = getAdminSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: '제품 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 제품 존재 확인 (서비스 역할 사용 - RLS 우회)
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id, name, barcode')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single()

    if (checkError || !existingProduct) {
      return NextResponse.json(
        { error: '제품을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 제품명 중복 확인 (자기 자신 제외)
    if (name.trim() !== existingProduct.name) {
      const { data: duplicateName, error: nameCheckError } = await supabase
        .from('products')
        .select('id')
        .eq('name', name.trim())
        .neq('id', params.id)
        .is('deleted_at', null)
        .single()

      if (duplicateName) {
        return NextResponse.json(
          { error: '이미 존재하는 제품명입니다.' },
          { status: 400 }
        )
      }
    }

    // 바코드 정규화
    const normalizedBarcode = normalizeBarcode(barcode)

    // 바코드 중복 확인 (자기 자신 제외, 정규화된 값으로)
    if (normalizedBarcode && normalizedBarcode !== existingProduct.barcode) {
      const { data: duplicateBarcode, error: barcodeCheckError } = await supabase
        .from('products')
        .select('id')
        .eq('barcode', normalizedBarcode)
        .neq('id', params.id)
        .is('deleted_at', null)
        .single()

      if (duplicateBarcode) {
        return NextResponse.json(
          { error: '이미 존재하는 바코드입니다.' },
          { status: 400 }
        )
      }
    }

    // 제품 업데이트
    const { data: product, error: updateError } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        barcode: normalizedBarcode,
        image_url: image_url?.trim() || null,
        category_1: category_1?.trim() || null,
        category_2: category_2?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating product:', updateError)
      return NextResponse.json(
        { error: '제품 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: product
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/products/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 제품 삭제 (소프트 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = getAdminSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: '제품 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 소프트 삭제
    const { error } = await supabase
      .from('products')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting product:', error)
      return NextResponse.json(
        { error: '제품 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/business/products/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}





