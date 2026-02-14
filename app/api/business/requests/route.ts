import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { assertStoreActive } from '@/lib/store-active'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('include_archived') === 'true'
    const archivedOnly = searchParams.get('archived_only') === 'true'
    const allPeriod = searchParams.get('all_period') === 'true'

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: companyStores } = await dataClient
      .from('stores')
      .select('id, name')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    const storeIds = companyStores?.map(s => s.id) || []
    const storeMap = new Map(companyStores?.map(s => [s.id, s.name]) || [])

    if (storeIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // 아카이브 기준: 완료 후 30일 경과
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    let requests: any[] = []

    // 아카이브 필터링
    if (archivedOnly) {
      const { data, error } = await dataClient
        .from('requests')
        .select(`
          *,
          storage_location,
          users:created_by (
            id,
            name
          )
        `)
        .in('store_id', storeIds)
        .eq('is_archived', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching archived requests:', error)
        return NextResponse.json(
          { error: 'Failed to fetch archived requests' },
          { status: 500 }
        )
      }
      requests = data || []
    } else if (includeArchived || allPeriod) {
      const { data, error } = await dataClient
        .from('requests')
        .select(`
          *,
          storage_location,
          users:created_by (
            id,
            name
          )
        `)
        .in('store_id', storeIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all requests:', error)
        return NextResponse.json(
          { error: 'Failed to fetch requests' },
          { status: 500 }
        )
      }
      requests = data || []
    } else {
      // 기본: 아카이브되지 않은 것만
      // 완료되지 않은 요청 + 완료 후 30일 이내 요청
      const [nonCompletedResult, recentCompletedResult] = await Promise.all([
        dataClient
          .from('requests')
          .select(`
            *,
            storage_location,
            users:created_by (
              id,
              name
            )
          `)
          .in('store_id', storeIds)
          .eq('is_archived', false)
          .neq('status', 'completed')
          .order('created_at', { ascending: false }),
        dataClient
          .from('requests')
          .select(`
            *,
            storage_location,
            users:created_by (
              id,
              name
            )
          `)
          .in('store_id', storeIds)
          .eq('is_archived', false)
          .eq('status', 'completed')
          .gte('completed_at', thirtyDaysAgoISO)
          .order('created_at', { ascending: false })
      ])

      if (nonCompletedResult.error || recentCompletedResult.error) {
        console.error('Error fetching requests:', {
          nonCompleted: nonCompletedResult.error,
          recentCompleted: recentCompletedResult.error
        })
        return NextResponse.json(
          { error: 'Failed to fetch requests' },
          { status: 500 }
        )
      }

      // 두 결과 합치기 (중복 제거)
      const allRequests = [
        ...(nonCompletedResult.data || []),
        ...(recentCompletedResult.data || [])
      ]
      const uniqueRequests = Array.from(
        new Map(allRequests.map(r => [r.id, r])).values()
      )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      requests = uniqueRequests
    }

    // stores 정보 추가
    const requestsWithStores = requests.map(r => ({
      ...r,
      stores: { id: r.store_id, name: storeMap.get(r.store_id) || '-' }
    }))

    return NextResponse.json({ success: true, data: requestsWithStores })
  } catch (error: any) {
    console.error('Error in GET /api/business/requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 요청 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, category, title, description, photo_urls } = body
    const requestTitle = title || category

    if (!store_id || !requestTitle) {
      return NextResponse.json(
        { error: 'store_id와 제목(title)이 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const { createClient } = await import('@supabase/supabase-js')
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: store, error: storeError } = await dataClient
      .from('stores')
      .select('id, company_id')
      .eq('id', store_id)
      .single()

    if (storeError || !store || store.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }
    await assertStoreActive(dataClient, store_id)

    const insertData = {
      store_id,
      title: requestTitle,
      description: (description ?? '').trim() || null,
      photo_url: photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null,
      status: 'in_progress', // 업체관리자가 작성하면 처리중
      created_by: user.id, // 작성자 ID
    }

    console.log('Creating request with data:', { ...insertData, description: (insertData.description || '').substring(0, 50) + '...' })

    const { data, error } = await dataClient
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
    console.error('Error in POST /api/business/requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
