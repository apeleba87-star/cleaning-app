import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase/server'
import { assertBusinessFeature } from '@/lib/plan-features-server'
import { PlanUpgradeRequiredView } from '@/components/PlanFeatureGuard'
import { redirect } from 'next/navigation'
import FranchiseList from './FranchiseList'

export default async function BusinessFranchisesPage() {
  const user = await getServerUser()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  if (user.role === 'business_owner') {
    const feature = await assertBusinessFeature(user.company_id, 'franchises')
    if (!feature.allowed) {
      return <PlanUpgradeRequiredView />
    }
  }

  // RLS 우회: service role로 본인 회사 프렌차이즈만 조회 (서버에서 company_id로 필터)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const dataClient =
    serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null

  if (!dataClient) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">서버 설정 오류로 목록을 불러올 수 없습니다.</p>
      </div>
    )
  }

  const { data: franchises, error } = await dataClient
    .from('franchises')
    .select('*')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching franchises:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">프렌차이즈 목록을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">프렌차이즈 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <FranchiseList initialFranchises={franchises || []} companyId={user.company_id} />
    </div>
  )
}











