import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { store_ids } = body

    if (!Array.isArray(store_ids)) {
      return NextResponse.json(
        { error: 'store_ids는 배열이어야 합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 기존 배정 삭제
    const { error: deleteError } = await supabase
      .from('store_assign')
      .delete()
      .eq('user_id', params.id)

    if (deleteError) {
      console.error('Error deleting existing store assignments:', deleteError)
      return NextResponse.json(
        { error: '기존 매장 배정 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 새 배정 추가
    if (store_ids.length > 0) {
      const assignments = store_ids.map((storeId: string) => ({
        user_id: params.id,
        store_id: storeId,
      }))

      const { error: insertError } = await supabase
        .from('store_assign')
        .insert(assignments)

      if (insertError) {
        console.error('Error inserting store assignments:', insertError)
        return NextResponse.json(
          { error: '매장 배정에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PUT /api/admin/users/[id]/stores:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


