import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// 요청 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'franchise_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, category, description, photo_urls, status } = body

    if (!store_id || !category || !description) {
      return NextResponse.json(
        { error: 'store_id, category, and description are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id, company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
    }

    // 매장이 사용자의 프렌차이즈에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, franchise_id, company_id')
      .eq('id', store_id)
      .single()

    if (storeError || !store || store.franchise_id !== userData.franchise_id || store.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 프렌차이즈 관리자가 작성하면 접수로 저장 (요청 시 status가 전달되면 그 값을 사용)
    const insertData = {
      store_id,
      title: category, // 카테고리를 title로 저장
      description: description.trim(),
      photo_url: photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null,
      status: status || 'received', // 요청 시 전달된 status를 사용하거나 기본값은 'received'
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
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: `Failed to create request: ${error.message || error.code || JSON.stringify(error)}` },
        { status: 500 }
      )
    }

    console.log('Request created successfully:', data?.id)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in POST /api/franchise/requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

