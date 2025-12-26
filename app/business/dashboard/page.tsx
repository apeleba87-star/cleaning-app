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

  // 월별 성장률 계산을 위한 날짜 계산 (KST 기준)
  const now = new Date()
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const currentYear = koreaTime.getFullYear()
  const currentMonth = koreaTime.getMonth()
  const currentMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0)
  const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
  const previousMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0)
  const previousMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)

  // 통계 조회
  const [storesResult, usersResult, issuesResult, usersByRoleResult, currentMonthReceipts, previousMonthReceipts] = await Promise.all([
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
    supabase
      .from('users')
      .select('role')
      .eq('company_id', user.company_id),
    supabase
      .from('receipts')
      .select('amount')
      .eq('company_id', user.company_id)
      .gte('received_at', currentMonthStart.toISOString())
      .lte('received_at', currentMonthEnd.toISOString())
      .is('deleted_at', null),
    supabase
      .from('receipts')
      .select('amount')
      .eq('company_id', user.company_id)
      .gte('received_at', previousMonthStart.toISOString())
      .lte('received_at', previousMonthEnd.toISOString())
      .is('deleted_at', null),
  ])

  // 월별 성장률 계산
  const currentMonthRevenue = currentMonthReceipts.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  const previousMonthRevenue = previousMonthReceipts.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  
  let monthlyGrowthRate: number | null = null
  if (previousMonthRevenue > 0) {
    monthlyGrowthRate = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
  } else if (currentMonthRevenue > 0) {
    monthlyGrowthRate = null // 신규 (전월 데이터 없음)
  }

  // 역할별 사용자 카운트 계산
  const usersByRole = (usersByRoleResult.data || []).reduce((acc: Record<string, number>, user: any) => {
    const role = user.role || 'unknown'
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {})

  // 역할 레이블 함수
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'staff':
        return '직원'
      case 'franchise_manager':
        return '프렌차이즈 관리자'
      case 'manager':
        return '매니저'
      case 'store_manager':
        return '매장 관리자'
      case 'business_owner':
        return '업체 관리자'
      case 'subcontract_individual':
        return '도급(개인)'
      case 'subcontract_company':
        return '도급(업체)'
      default:
        return role
    }
  }

  const stats = {
    totalStores: storesResult.count || 0,
    totalUsers: usersResult.count || 0,
    monthlyIssues: issuesResult.count || 0,
    usersByRole,
    getRoleLabel,
    monthlyGrowthRate,
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
    { title: '제품 관리', href: '/business/products', description: '제품 등록 및 CSV 파일 업로드로 위치 정보 업데이트', category: 'operation' },
    { title: '체크리스트 관리', href: '/business/checklists', description: '매장별 체크리스트 생성 및 관리', category: 'operation' },
    { title: '공지사항 관리', href: '/business/announcements', description: '점주용/직원용 공지사항 작성 및 확인 현황', category: 'operation' },
    { title: '리포트', href: '/business/reports', description: '월간/주간 리포트 조회', category: 'operation' },
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
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 관리매장</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalStores}곳</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 사용자</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">{stats.totalUsers} 명</p>
          <div className="space-y-1">
            {Object.keys(stats.usersByRole).filter(role => role !== 'business_owner' && role !== 'platform_admin').length > 0 ? (
              Object.entries(stats.usersByRole)
                .filter(([role]) => role !== 'business_owner' && role !== 'platform_admin')
                .sort(([a], [b]) => {
                  // 직원을 먼저, 그 다음 프렌차이즈 관리자, 나머지는 알파벳 순
                  if (a === 'staff') return -1
                  if (b === 'staff') return 1
                  if (a === 'franchise_manager') return -1
                  if (b === 'franchise_manager') return 1
                  return a.localeCompare(b)
                })
                .map(([role, count]) => (
                  <p key={role} className="text-sm text-gray-600 pl-2">
                    -{stats.getRoleLabel(role)} {count}명
                  </p>
                ))
            ) : (
              <p className="text-sm text-gray-500 pl-2">-사용자 없음</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">월별 성장률</h3>
          {stats.monthlyGrowthRate !== null ? (
            <p className={`text-3xl font-bold ${stats.monthlyGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.monthlyGrowthRate >= 0 ? '+' : ''}{stats.monthlyGrowthRate.toFixed(1)}%
            </p>
          ) : (
            <p className="text-3xl font-bold text-gray-600">신규</p>
          )}
        </div>
      </div>

      {/* 카테고리별 그룹화된 기능 */}
      <CategoryGroupedSections sections={sections} />
    </div>
  )
}

