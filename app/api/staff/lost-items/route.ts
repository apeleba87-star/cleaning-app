import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, type, description, photo_url, photo_urls, storage_location } = body

    if (!store_id || !storage_location) {
      return NextResponse.json(
        { error: 'store_id and storage_location are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // photo_urls 배열이 있으면 사용, 없으면 photo_url 사용 (하위 호환성)
    const photos = photo_urls && Array.isArray(photo_urls) && photo_urls.length > 0 
      ? photo_urls 
      : (photo_url ? [photo_url] : [])

    // type은 체크 제약 조건이 있어서 허용된 값만 사용
    // 실제 카테고리는 description에 [카테고리: ...] 형식으로 포함됨
    // lost_items 테이블에는 photo_urls 컬럼이 없으므로 첫 번째 사진만 photo_url에 저장
    const insertData = {
      store_id,
      type: type || 'other', // 허용되는 enum 값 사용
      description: description || null,
      photo_url: photos.length > 0 ? photos[0] : null, // 첫 번째 사진만 저장 (하위 호환성)
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

