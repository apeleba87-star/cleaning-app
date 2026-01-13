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

  // 최근 30일 데이터만 조회 (초기 로드 최적화)
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
      .gte('created_at', thirtyDaysAgoISO)
      .order('created_at', { ascending: false })
      .limit(50), // 초기 로드: 50개만
    
    // 2. 물품요청 (completed 제외)
    supabase
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
      .limit(50),
    
    // 3. 물품요청 (completed, 14일 이내)
    supabase
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
