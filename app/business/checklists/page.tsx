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

  // 회사 매장 목록 조회
  const { data: stores, error: storesError } = await supabase
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

  // 회사 직원 목록 조회 (staff 역할만)
  const { data: staffUsers, error: usersError } = await supabase
    .from('users')
    .select('id, name, phone, role')
    .eq('company_id', user.company_id)
    .eq('role', 'staff')

  if (usersError) {
    console.error('Error fetching staff users:', usersError)
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
        staffUsers={staffUsers || []}
        companyId={user.company_id}
      />
    </div>
  )
}










