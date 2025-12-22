import { createServerSupabaseClient } from '@/lib/supabase/server'
import UserList from './UserList'

export default async function UsersPage() {
  const supabase = await createServerSupabaseClient()
  
  // 모든 사용자 조회 (admin은 RLS로 전체 조회 가능)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  // 모든 매장 조회
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  // 매장 배정 정보 조회
  const { data: storeAssigns, error: assignsError } = await supabase
    .from('store_assign')
    .select('user_id, store_id')

  if (usersError || storesError || assignsError) {
    console.error('Error fetching data:', { usersError, storesError, assignsError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  // 매장 배정을 맵으로 변환 (빠른 조회용)
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
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>
      
      <UserList 
        initialUsers={users || []} 
        stores={stores || []}
        userStoreMap={userStoreMap}
      />
    </div>
  )
}

