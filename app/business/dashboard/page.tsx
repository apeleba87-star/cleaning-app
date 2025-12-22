import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import FinancialSummarySection from './FinancialSummarySection'
import InitialSetupGuide from './InitialSetupGuide'
import QuickActionsSection from './QuickActionsSection'
import CategoryGroupedSections from './CategoryGroupedSections'
import TodayTasksWrapperClient from './TodayTasksWrapperClient'
import StoreStatusSection from './StoreStatusSection'

export default async function BusinessOwnerDashboardPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">회사 정보가 없습니다. 관리자에게 문의하세요.</p>
        </div>
      </div>
    )
  }

  // 회사 정보 조회
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', user.company_id)
    .single()

  // 회사에 속한 매장 ID 조회 (이슈 집계를 위해 배열로 사용)
  const { data: storeRows, error: storeListError } = await supabase
    .from('stores')
    .select('id')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)

  if (storeListError) {
    console.error('Error loading company stores for dashboard:', storeListError)
  }

  const storeIds = storeRows?.map((s) => s.id) || []

  // 통계 조회
  const [storesResult, usersResult, issuesResult] = await Promise.all([
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', user.company_id)
      .is('deleted_at', null),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', user.company_id),
    storeIds.length === 0
      ? { count: 0 }
      : await supabase
          .from('issues')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
  ])

  const stats = {
    totalStores: storesResult.count || 0,
    totalUsers: usersResult.count || 0,
    monthlyIssues: issuesResult.count || 0,
  }

  // 카테고리별 섹션 정의
  const sections = [
    { title: '매장 관리', href: '/business/stores', description: '매장 등록 및 관리', category: 'store' },
    { title: '매장 상태', href: '/business/stores/status', description: '전체 매장 상태 확인 및 요청란 보내기', category: 'store' },
    { title: '프렌차이즈 관리', href: '/business/franchises', description: '프렌차이즈 등록 및 관리', category: 'store' },
    { title: '사용자 관리', href: '/business/users', description: '사용자 초대 및 권한 설정', category: 'user' },
    { title: '인건비 관리', href: '/business/payrolls', description: '정규 직원 및 일당 근로자 인건비 관리', category: 'financial' },
    { title: '수금/미수금 관리', href: '/business/receivables', description: '매장별 매출(청구) 및 수금 관리', category: 'financial' },
    { title: '재무 현황', href: '/business/financial', description: '매출, 수금, 미수금, 인건비, 지출 통합 관리', category: 'financial' },
    { title: '체크리스트 관리', href: '/business/checklists', description: '매장별 체크리스트 생성 및 관리', category: 'operation' },
    { title: '공지사항 관리', href: '/business/announcements', description: '점주용/직원용 공지사항 작성 및 확인 현황', category: 'operation' },
    { title: '리포트', href: '/business/reports', description: '월간/주간 리포트 조회', category: 'operation' },
    { title: '요청/미흡사항', href: '/business/issues', description: '모든 매장의 요청/미흡 조회', category: 'operation' },
    { title: '회사 관리', href: '/business/company', description: '회사 정보 및 요금제 관리', category: 'settings' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">업체 관리자 대시보드</h1>
        {company && (
          <div className="text-right">
            <p className="text-sm text-gray-500">회사명</p>
            <p className="font-semibold text-gray-900">{company.name}</p>
          </div>
        )}
      </div>

      {/* 초기 설정 가이드 */}
      <InitialSetupGuide
        hasCompany={!!company}
        storeCount={stats.totalStores}
        userCount={stats.totalUsers}
      />

      {/* 매장 상태 현황 */}
      <StoreStatusSection />

      {/* 오늘의 작업 섹션 - 클라이언트 컴포넌트로 전달 */}
      <TodayTasksWrapperClient companyId={user.company_id} />

      {/* 빠른 등록 섹션 */}
      <QuickActionsSection />

      {/* 재무 지표 섹션 */}
      <FinancialSummarySection companyId={user.company_id} />

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 매장</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalStores}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 직원</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 이슈</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.monthlyIssues}</p>
        </div>
      </div>

      {/* 카테고리별 그룹화된 기능 */}
      <CategoryGroupedSections sections={sections} />
    </div>
  )
}

