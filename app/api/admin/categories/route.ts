import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { store_id, type, name } = body

    if (!store_id || !type || !name) {
      return NextResponse.json(
        { error: '매장, 타입, 카테고리명은 필수입니다.' },
        { status: 400 }
      )
    }

    if (!['issue', 'supply'].includes(type)) {
      return NextResponse.json(
        { error: '유효하지 않은 타입입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: category, error } = await supabase
      .from('request_categories')
      .insert({
        store_id,
        type,
        name: name.trim(),
      })
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json(
        { error: '카테고리 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Error in POST /api/admin/categories:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}



