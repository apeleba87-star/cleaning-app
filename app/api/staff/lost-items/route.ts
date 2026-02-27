import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!user || !allowedRoles.includes(user.role)) {
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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient =
      serviceRoleKey && supabaseUrl
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase

    const { data: storeAssign } = await dataClient
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .maybeSingle()
    if (!storeAssign) {
      return NextResponse.json({ error: '해당 매장에 대한 권한이 없습니다.' }, { status: 403 })
    }

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

    const { data, error } = await dataClient
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

