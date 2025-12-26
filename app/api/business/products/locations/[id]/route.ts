import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH: 제품 위치 정보 수정
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
    const { stock_quantity, is_available } = body

    const supabase = await createServerSupabaseClient()

    const updateData: {
      stock_quantity?: number
      is_available?: boolean
      last_updated_at?: string
    } = {}

    if (stock_quantity !== undefined) {
      updateData.stock_quantity = parseInt(stock_quantity) || 0
    }

    if (is_available !== undefined) {
      updateData.is_available = Boolean(is_available)
    }

    updateData.last_updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('store_product_locations')
      .update(updateData)
      .eq('id', params.id)

    if (error) {
      console.error('Error updating location:', error)
      return NextResponse.json(
        { error: '위치 정보 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/products/locations/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 제품 위치 정보 삭제
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

    const supabase = await createServerSupabaseClient()

    // 위치 정보 삭제
    const { error } = await supabase
      .from('store_product_locations')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting location:', error)
      return NextResponse.json(
        { error: '위치 정보 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/business/products/locations/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

