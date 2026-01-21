import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RequestsPageClient from './RequestsPageClient'

export default async function BusinessRequestsPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  // 아카이브 기준: 완료 후 30일 경과
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

  // 물품요청: completed가 아닌 것들 + completed인 경우 14일 이내만
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const fourteenDaysAgoISO = fourteenDaysAgo.toISOString().split('T')[0]

  // 병렬 쿼리 실행: stores 먼저 조회 후 requests, supply_requests 동시 조회
  const storesResult = await supabase
    .from('stores')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)

  const storeIds = storesResult.data?.map(s => s.id) || []
  const storeMap = new Map(storesResult.data?.map(s => [s.id, s.name]) || [])

  // storeIds가 없으면 빈 배열 반환
  if (storeIds.length === 0) {
    return (
      <RequestsPageClient
        initialRequests={[]}
        initialSupplyRequests={[]}
        storeMap={storeMap}
      />
    )
  }

  // 병렬 쿼리: requests와 supply_requests 동시 조회 (stores 조인 제거, users만 조인)
  const [requestsResult, nonCompletedSupplyResult, completedSupplyResult] = await Promise.all([
    // 1. 일반 요청 (stores 조인 제거, users만 조인)
    // 아카이브되지 않은 요청만 조회
    // 완료되지 않았거나 완료 후 30일 이내인 요청
    // 두 개의 쿼리로 분리: 완료되지 않은 요청 + 완료 후 30일 이내 요청
    // 1. 일반 요청 (아카이브 필터는 쿼리 결과에서 처리)
    (async () => {
      // 완료되지 않은 요청
      let { data: nonCompleted, error: nonCompletedError } = await supabase
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
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)

      // is_archived 컬럼 관련 에러인 경우 무시 (컬럼이 없을 수 있음)
      if (nonCompletedError?.message?.includes('is_archived') || nonCompletedError?.code === 'PGRST116') {
        // 이미 컬럼 없이 조회했으므로 에러는 다른 원인
        return { data: null, error: nonCompletedError }
      }

      // 완료 후 30일 이내 요청
      let { data: recentCompleted, error: recentCompletedError } = await supabase
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
        .eq('status', 'completed')
        .gte('completed_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(50)

      // is_archived 컬럼 관련 에러인 경우 무시
      if (recentCompletedError?.message?.includes('is_archived') || recentCompletedError?.code === 'PGRST116') {
        return { data: null, error: recentCompletedError }
      }

      if (nonCompletedError || recentCompletedError) {
        return { data: null, error: nonCompletedError || recentCompletedError }
      }

      // is_archived가 false이거나 없는 것만 필터링 (컬럼이 있는 경우)
      const filteredNonCompleted = (nonCompleted || []).filter((r: any) => 
        r.is_archived === false || r.is_archived === undefined || r.is_archived === null
      )
      const filteredRecentCompleted = (recentCompleted || []).filter((r: any) => 
        r.is_archived === false || r.is_archived === undefined || r.is_archived === null
      )

      // 두 결과 합치기 (중복 제거)
      const allRequests = [...filteredNonCompleted, ...filteredRecentCompleted]
      const uniqueRequests = Array.from(
        new Map(allRequests.map(r => [r.id, r])).values()
      )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50)

      return { data: uniqueRequests, error: null }
    })(),
    
    // 2. 물품요청 (completed 제외, 아카이브되지 않은 것만)
    (async () => {
      let { data, error } = await supabase
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
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(50)

      // is_archived 컬럼 관련 에러인 경우 무시 (컬럼이 없을 수 있음)
      if (error?.message?.includes('is_archived') || error?.code === 'PGRST116') {
        // 컬럼 없이 재시도
        const retry = await supabase
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
          .gte('created_at', thirtyDaysAgoISO)
          .order('created_at', { ascending: false })
          .limit(50)
        data = retry.data
        error = retry.error
      } else if (!error && data) {
        // 성공한 경우, is_archived가 false인 것만 필터링 (컬럼이 있는 경우)
        data = data.filter((r: any) => r.is_archived === false || r.is_archived === undefined || r.is_archived === null)
      }

      return { data, error }
    })(),
    
    // 3. 물품요청 (completed, 14일 이내, 아카이브되지 않은 것만)
    (async () => {
      let { data, error } = await supabase
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
        .limit(50)

      // is_archived 컬럼 관련 에러인 경우 무시 (컬럼이 없을 수 있음)
      if (error?.message?.includes('is_archived') || error?.code === 'PGRST116') {
        // 컬럼 없이 재시도
        const retry = await supabase
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
          .limit(50)
        data = retry.data
        error = retry.error
      } else if (!error && data) {
        // 성공한 경우, is_archived가 false인 것만 필터링 (컬럼이 있는 경우)
        data = data.filter((r: any) => r.is_archived === false || r.is_archived === undefined || r.is_archived === null)
      }

      return { data, error }
    })()
  ])

  const requests = requestsResult.data || []
  const nonCompletedRequests = nonCompletedSupplyResult.data || []
  const completedRequests = completedSupplyResult.data || []
  const supplyRequests = [...nonCompletedRequests, ...completedRequests]

  // 에러 처리
  if (requestsResult.error || nonCompletedSupplyResult.error || completedSupplyResult.error) {
    console.error('Error fetching requests:', { 
      requestsError: requestsResult.error, 
      nonCompletedError: nonCompletedSupplyResult.error, 
      completedError: completedSupplyResult.error 
    })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">요청 목록을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  // stores 정보를 requests와 supplyRequests에 추가 (클라이언트 사이드에서 매핑)
  const requestsWithStores = requests.map(r => ({
    ...r,
    stores: { id: r.store_id, name: storeMap.get(r.store_id) || '-' }
  }))

  const supplyRequestsWithStores = supplyRequests.map(r => ({
    ...r,
    stores: { id: r.store_id, name: storeMap.get(r.store_id) || '-' }
  }))

  return (
    <RequestsPageClient
      initialRequests={requestsWithStores}
      initialSupplyRequests={supplyRequestsWithStores}
      storeMap={storeMap}
    />
  )
}
