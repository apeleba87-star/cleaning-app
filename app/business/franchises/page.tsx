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
    <div className="w-full max-w-[96vw] sm:max-w-6xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">프렌차이즈 등록·관리</h1>
        <a
          href="/business/dashboard"
          className="text-sm lg:text-base text-blue-600 hover:text-blue-800 whitespace-nowrap"
        >
          ← 대시보드로
        </a>
      </div>

      <FranchiseList initialFranchises={franchises || []} companyId={user.company_id} />
    </div>
  )
}











