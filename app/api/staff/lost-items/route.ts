import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, type, description, photo_url, storage_location } = body

    if (!store_id || !storage_location) {
      return NextResponse.json(
        { error: 'store_id and storage_location are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // type은 체크 제약 조건이 있어서 허용된 값만 사용
    // 실제 카테고리는 description에 [카테고리: ...] 형식으로 포함됨
    const insertData: any = {
      store_id,
      type: type || 'other', // 허용되는 enum 값 사용
      description: description || null,
      photo_url: photo_url || null,
      storage_location: storage_location.trim(),
      status: 'submitted',
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('lost_items')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating lost item:', error)
      console.error('Insert data:', insertData)
      return NextResponse.json(
        { error: `Failed to create lost item: ${error.message || error.code || JSON.stringify(error)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in POST /api/staff/lost-items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

