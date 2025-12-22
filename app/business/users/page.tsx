import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserList from './UserList'

export default async function BusinessUsersPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  // 회사 직원 조회
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })

  // 회사 매장 조회
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .order('name')

  // 회사 프렌차이즈 조회
  const { data: franchises, error: franchisesError } = await supabase
    .from('franchises')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name')

  // 매장 배정 정보 조회
  const { data: storeAssigns, error: assignsError } = await supabase
    .from('store_assign')
    .select('user_id, store_id')

  if (usersError || storesError || franchisesError || assignsError) {
    console.error('Error fetching data:', { usersError, storesError, franchisesError, assignsError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  // 매장 배정을 맵으로 변환
  const userStoreMap = new Map<string, string[]>()
  storeAssigns?.forEach((assign) => {
    if (!userStoreMap.has(assign.user_id)) {
      userStoreMap.set(assign.user_id, [])
    }
    userStoreMap.get(assign.user_id)?.push(assign.store_id)
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>
      
      <UserList 
        initialUsers={users || []} 
        stores={stores || []}
        franchises={franchises || []}
        userStoreMap={userStoreMap}
        companyId={user.company_id}
        currentUserRole={user.role}
      />
    </div>
  )
}

