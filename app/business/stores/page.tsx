import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import StoreList from './StoreList'

export default async function BusinessStoresPage() {
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

  const [
    { data: companyPlan },
    { data: stores, error: storesError },
  ] = await Promise.all([
    dataClient.from('companies').select('premium_units').eq('id', user.company_id).single(),
    dataClient
      .from('stores')
      .select(`
        *,
        franchises:franchise_id (
          id,
          name
        )
      `)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const premiumUnits = Number(companyPlan?.premium_units ?? 0)
  const storeIds = (stores || []).map((s) => s.id)

  // 매장별 인원 배정(store_assign) 및 체크리스트 템플릿 존재 여부 조회
  let storeAssignees: Record<string, string[]> = {}
  let storeHasChecklist: Record<string, boolean> = {}
  if (storeIds.length > 0) {
    const [assignRes, checklistRes] = await Promise.all([
      dataClient
        .from('store_assign')
        .select('store_id, users:user_id(name)')
        .in('store_id', storeIds),
      dataClient
        .from('checklist')
        .select('store_id')
        .in('store_id', storeIds)
        .eq('work_date', '2000-01-01')
        .is('assigned_user_id', null),
    ])
    const assignList = assignRes.data || []
    assignList.forEach((row: any) => {
      const sid = row.store_id
      const name = row.users?.name
      if (!sid) return
      if (!storeAssignees[sid]) storeAssignees[sid] = []
      if (name) storeAssignees[sid].push(name)
    })
    const checklistStoreIds = new Set((checklistRes.data || []).map((r: any) => r.store_id))
    storeIds.forEach((id) => {
      storeHasChecklist[id] = checklistStoreIds.has(id)
    })
  }

  const { data: franchises, error: franchisesError } = await dataClient
    .from('franchises')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name')

  const { data: categoryTemplates, error: templatesError } = await dataClient
    .from('category_templates')
    .select('id, name, category')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .order('name')

  if (storesError || franchisesError || templatesError) {
    console.error('Error fetching data:', { storesError, franchisesError, templatesError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">매장 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap"
        >
          ← 대시보드로
        </a>
      </div>

      <StoreList 
        initialStores={stores || []} 
        franchises={franchises || []} 
        categoryTemplates={categoryTemplates || []}
        companyId={user.company_id}
        premiumUnits={premiumUnits}
        storeAssignees={storeAssignees}
        storeHasChecklist={storeHasChecklist}
      />
    </div>
  )
}

