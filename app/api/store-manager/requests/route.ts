import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// 점주용 요청 생성 (접수 상태로 생성)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'store_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, category, description, photo_urls } = body

    if (!store_id || !category || !description) {
      return NextResponse.json(
        { error: 'store_id, category, and description are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 사용자의 매장인지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 점주가 작성하면 접수 상태로 저장
    const insertData = {
      store_id,
      title: category, // 카테고리를 title로 저장
      description: description.trim(),
      photo_url: photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null,
      status: 'received' as const, // 접수 상태로 저장
      created_by: user.id, // 작성자 ID
    }

    console.log('Creating request with data:', { ...insertData, description: insertData.description.substring(0, 50) + '...' })

    const { data, error } = await supabase
      .from('requests')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating request:', error)
      return NextResponse.json(
        { error: `Failed to create request: ${error.message || error.code || JSON.stringify(error)}` },
        { status: 500 }
      )
    }

    console.log('Request created successfully:', data?.id)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in POST /api/store-manager/requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

