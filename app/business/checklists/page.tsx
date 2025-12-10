import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChecklistList from './ChecklistList'

export default async function BusinessChecklistsPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  // 회사 매장 조회
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .order('name')

  // 회사 직원 조회 (체크리스트 배정용)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('company_id', user.company_id)
    .eq('role', 'staff')
    .order('name')

  if (storesError || usersError) {
    console.error('Error fetching data:', { storesError, usersError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">체크리스트 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <ChecklistList 
        stores={stores || []} 
        staffUsers={users || []}
        companyId={user.company_id}
      />
    </div>
  )
}



