import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ChecklistList from './ChecklistList'

export default async function BusinessChecklistsPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  // RLS 우회: 서비스 역할로 stores, users 조회
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let adminSupabase: ReturnType<typeof createClient> | null = null
  if (serviceRoleKey && supabaseUrl) {
    adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  const dataClient = adminSupabase || supabase

  // 회사 매장 목록 조회
  const { data: stores, error: storesError } = await dataClient
    .from('stores')
    .select('*')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .order('name')

  if (storesError) {
    console.error('Error fetching stores:', storesError)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">매장 목록을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  const storeIds = (stores || []).map((s) => s.id)
  let storeHasChecklist: Record<string, boolean> = {}
  if (storeIds.length > 0) {
    const { data: checklistStores } = await dataClient
      .from('checklist')
      .select('store_id')
      .in('store_id', storeIds)
      .eq('work_date', '2000-01-01')
      .is('assigned_user_id', null)
    const hasSet = new Set((checklistStores || []).map((r: { store_id: string }) => r.store_id))
    storeIds.forEach((id) => {
      storeHasChecklist[id] = hasSet.has(id)
    })
  }

  // 회사 직원 목록 조회 (staff 역할만)
  const { data: staffUsers, error: usersError } = await dataClient
    .from('users')
    .select('id, name, phone, role')
    .eq('company_id', user.company_id)
    .eq('role', 'staff')

  if (usersError) {
    console.error('Error fetching staff users:', usersError)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">체크리스트 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <ChecklistList 
        stores={stores || []} 
        staffUsers={staffUsers || []}
        companyId={user.company_id}
        storeHasChecklist={storeHasChecklist}
      />
    </div>
  )
}










