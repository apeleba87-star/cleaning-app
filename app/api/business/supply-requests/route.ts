import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// 물품요청 목록 조회 (아카이브 필터링 지원)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('include_archived') === 'true'
    const archivedOnly = searchParams.get('archived_only') === 'true'
    const allPeriod = searchParams.get('all_period') === 'true'

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

    // 아카이브 기준: 완료 후 14일 경과 (물품요청은 14일 기준)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const fourteenDaysAgoISO = fourteenDaysAgo.toISOString().split('T')[0]

    let supplyRequests: any[] = []

    // 아카이브 필터링
    if (archivedOnly) {
      // 아카이브된 것만
      const { data, error } = await dataClient
        .from('supply_requests')
        .select(`
          *,
          users:user_id (
            id,
            name
          )
        `)
        .in('store_id', storeIds)
        .eq('is_archived', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching archived supply requests:', error)
        return NextResponse.json(
          { error: 'Failed to fetch archived supply requests' },
          { status: 500 }
        )
      }
      supplyRequests = data || []
    } else if (includeArchived || allPeriod) {
      // 아카이브 포함 (전체 기간 보기)
      const { data, error } = await dataClient
        .from('supply_requests')
        .select(`
          *,
          users:user_id (
            id,
            name
          )
        `)
        .in('store_id', storeIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all supply requests:', error)
        return NextResponse.json(
          { error: 'Failed to fetch supply requests' },
          { status: 500 }
        )
      }
      supplyRequests = data || []
    } else {
      // 기본: 아카이브되지 않은 것만
      // 완료되지 않은 요청 + 완료 후 14일 이내 요청
      const [nonCompletedResult, recentCompletedResult] = await Promise.all([
        dataClient
          .from('supply_requests')
          .select(`
            *,
            users:user_id (
              id,
              name
            )
          `)
          .in('store_id', storeIds)
          .neq('status', 'completed')
          .order('created_at', { ascending: false }),
        dataClient
          .from('supply_requests')
          .select(`
            *,
            users:user_id (
              id,
              name
            )
          `)
          .in('store_id', storeIds)
          .eq('status', 'completed')
          .gte('completed_at', fourteenDaysAgoISO)
          .order('created_at', { ascending: false })
      ])

      if (nonCompletedResult.error || recentCompletedResult.error) {
        console.error('Error fetching supply requests:', {
          nonCompleted: nonCompletedResult.error,
          recentCompleted: recentCompletedResult.error
        })
        return NextResponse.json(
          { error: 'Failed to fetch supply requests' },
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

      supplyRequests = uniqueRequests
    }

    // stores 정보 추가 및 is_archived 필터링 (컬럼이 없는 경우 대비)
    const supplyRequestsWithStores = supplyRequests
      .filter((r: any) => r.is_archived === false || r.is_archived === undefined || r.is_archived === null || includeArchived || allPeriod || archivedOnly)
      .map(r => ({
        ...r,
        stores: { id: r.store_id, name: storeMap.get(r.store_id) || '-' }
      }))

    return NextResponse.json({ success: true, data: supplyRequestsWithStores })
  } catch (error: any) {
    console.error('Error in GET /api/business/supply-requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
