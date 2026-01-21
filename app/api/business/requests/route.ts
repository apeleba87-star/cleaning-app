import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// 요청 목록 조회 (아카이브 필터링 지원)
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

    // 회사 매장 ID 목록
    const { data: companyStores } = await supabase
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
      // 아카이브된 것만
      const { data, error } = await supabase
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
      // 아카이브 포함 (전체 기간 보기)
      const { data, error } = await supabase
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
        supabase
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
        supabase
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
    const { store_id, category, description, photo_urls } = body

    if (!store_id || !category || !description) {
      return NextResponse.json(
        { error: 'store_id, category, and description are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 사용자의 회사에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', store_id)
      .single()

    if (storeError || !store || store.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 업체관리자가 작성하면 즉시 처리중으로 저장
    const insertData = {
      store_id,
      title: category, // 카테고리를 title로 저장
      description: description.trim(),
      photo_url: photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null,
      status: 'in_progress', // 업체관리자가 작성하면 처리중
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
    console.error('Error in POST /api/business/requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
