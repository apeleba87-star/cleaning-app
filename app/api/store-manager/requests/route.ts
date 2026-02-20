import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { assertStoreActive } from '@/lib/store-active'

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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: store, error: storeError } = await dataClient
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { data: storeAssign } = await dataClient
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .maybeSingle()

    if (!storeAssign) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    await assertStoreActive(dataClient, store_id)

    const trimmedDescription = description.trim()

    // 짧은 시간(5분) 내 동일 접수 유사 중복 방지: 같은 매장·카테고리·작성자·내용이면 1건만 허용
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: existing } = await dataClient
      .from('requests')
      .select('id, store_id, title, description, status, created_at, created_by')
      .eq('store_id', store_id)
      .eq('title', category)
      .eq('created_by', user.id)
      .eq('description', trimmedDescription)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      console.log('Duplicate request prevented, returning existing:', existing.id)
      return NextResponse.json({
        success: true,
        data: existing,
        duplicate: true,
        message: '이미 동일한 요청이 접수되었습니다.',
      })
    }

    const insertData = {
      store_id,
      title: category, // 카테고리를 title로 저장
      description: trimmedDescription,
      photo_url: photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null,
      status: 'received' as const, // 접수 상태로 저장
      created_by: user.id, // 작성자 ID
    }

    console.log('Creating request with data:', { ...insertData, description: insertData.description.substring(0, 50) + '...' })

    const { data, error } = await dataClient
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

