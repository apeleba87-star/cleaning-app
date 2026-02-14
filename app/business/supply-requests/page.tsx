import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import SupplyRequestList from './SupplyRequestList'

export default async function BusinessSupplyRequestsPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const dataClient = serviceRoleKey && supabaseUrl
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : supabase

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  const { data: companyStores } = await dataClient
    .from('stores')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)

  const storeIds = companyStores?.map(s => s.id) || []
  const storeMap = new Map(companyStores?.map(s => [s.id, s.name]) || [])

  // 모든 물품 요청 조회 (completed가 아닌 것들 + completed인 경우 14일 이내만)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const fourteenDaysAgoISO = fourteenDaysAgo.toISOString().split('T')[0] // YYYY-MM-DD 형식
  
  const { data: nonCompletedRequests, error: nonCompletedError } = await dataClient
    .from('supply_requests')
    .select(`
      *,
      users:user_id (
        id,
        name
      ),
      stores:store_id (
        id,
        name
      )
    `)
    .in('store_id', storeIds)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: completedRequests, error: completedError } = await dataClient
    .from('supply_requests')
    .select(`
      *,
      users:user_id (
        id,
        name
      ),
      stores:store_id (
        id,
        name
      )
    `)
    .in('store_id', storeIds)
    .eq('status', 'completed')
    .gte('completed_at', fourteenDaysAgoISO)
    .order('created_at', { ascending: false })
    .limit(100)

  const error = nonCompletedError || completedError
  const supplyRequests = [...(nonCompletedRequests || []), ...(completedRequests || [])]

  if (error) {
    console.error('Error fetching supply requests:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">물품 요청 목록을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">물품 요청 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>
      
      <SupplyRequestList initialSupplyRequests={supplyRequests || []} storeMap={storeMap} />
    </div>
  )
}

