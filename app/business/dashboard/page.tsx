import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { Suspense } from 'react'
import InitialSetupGuide from './InitialSetupGuide'
import QuickActionsSection from './QuickActionsSection'
import CategoryGroupedSectionsLazy from './CategoryGroupedSectionsLazy'
import DashboardExpandableSections from './DashboardExpandableSections'
import StoreStatusSection from './StoreStatusSection'
import MonthlyGrowthRateCard from './MonthlyGrowthRateCard'
import { FinancialDataProvider } from './FinancialDataContext'
import { SessionReplacedToast } from './SessionReplacedToast'

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

  // 필수 데이터만 먼저 조회 (빠른 초기 렌더링)
  const [companyResult, storesResult, usersResult] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name')
      .eq('id', user.company_id)
      .single(),
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', user.company_id)
      .is('deleted_at', null),
    supabase
      .from('users')
      .select('id, role', { count: 'exact' })
      .eq('company_id', user.company_id),
  ])

  const company = companyResult.data
  const totalStores = storesResult.count || 0
  const totalUsers = usersResult.count || 0

  // 역할별 사용자 카운트 계산 (이미 조회한 데이터 사용)
  const usersByRole = (usersResult.data || []).reduce((acc: Record<string, number>, user: any) => {
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

  // 카테고리별 섹션 정의
  const sections = [
    { title: '매장 관리', href: '/business/stores', description: '매장 등록 및 관리', category: 'store' },
    { title: '매장 상태', href: '/business/stores/status', description: '전체 매장 상태 확인 및 요청란 보내기', category: 'store' },
    { title: '프렌차이즈 관리', href: '/business/franchises', description: '프렌차이즈 등록 및 관리', category: 'store' },
    { title: '사용자 관리', href: '/business/users', description: '사용자 초대 및 권한 설정', category: 'user' },
    { title: '인건비 관리', href: '/business/payrolls', description: '정규 직원 및 일당 근로자 인건비 관리', category: 'financial' },
    { title: '수금/미수금 관리', href: '/business/receivables', description: '매장별 매출(청구) 및 수금 관리', category: 'financial' },
    { title: '재무 현황', href: '/business/financial', description: '매출, 수금, 미수금, 인건비, 지출 통합 관리', category: 'financial' },
    { title: '바코드 제품 등록', href: '/business/products', description: '제품 등록 및 CSV 파일 업로드로 위치 정보 업데이트', category: 'operation' },
    { title: '체크리스트 관리', href: '/business/checklists', description: '매장별 체크리스트 생성 및 관리', category: 'operation' },
    { title: '공지사항 관리', href: '/business/announcements', description: '점주용/직원용 공지사항 작성 및 확인 현황', category: 'operation' },
    { title: '리포트', href: '/business/reports', description: '월간/주간 리포트 조회', category: 'operation' },
    { title: '미관리 매장 확인', href: '/business/attendance-report', description: '어제 오후 1시 기준 매장 출근 현황 리포트', category: 'operation' },
    { title: '회사 관리', href: '/business/company', description: '회사 정보 및 요금제 관리', category: 'settings' },
  ]

  return (
    <>
      <SessionReplacedToast />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">업체 관리자 대시보드</h1>
        {company && (
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm text-gray-500">회사명</p>
            <p className="font-semibold text-sm sm:text-base text-gray-900">{company.name}</p>
          </div>
        )}
      </div>

      {/* 초기 설정 가이드 - 즉시 표시 */}
      <InitialSetupGuide
        hasCompany={!!company}
        storeCount={totalStores}
        userCount={totalUsers}
      />

      {/* 통계 카드 - 즉시 표시 (필수 데이터만) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 관리매장</h3>
          <p className="text-3xl font-bold text-gray-900">{totalStores}곳</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 사용자</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">{totalUsers} 명</p>
          <div className="space-y-1">
            {Object.keys(usersByRole).filter(role => role !== 'business_owner' && role !== 'platform_admin').length > 0 ? (
              Object.entries(usersByRole)
                .filter(([role]) => role !== 'business_owner' && role !== 'platform_admin')
                .sort(([a], [b]) => {
                  if (a === 'staff') return -1
                  if (b === 'staff') return 1
                  if (a === 'franchise_manager') return -1
                  if (b === 'franchise_manager') return 1
                  return a.localeCompare(b)
                })
                .map(([role, count]) => (
                  <p key={role} className="text-sm text-gray-600 pl-2">
                    -{getRoleLabel(role)} {count}명
                  </p>
                ))
            ) : (
              <p className="text-sm text-gray-500 pl-2">-사용자 없음</p>
            )}
          </div>
        </div>
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">월별 성장률</h3>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        }>
          <MonthlyGrowthRateCard companyId={user.company_id} />
        </Suspense>
      </div>

      {/* 매장 상태 현황 - Suspense로 감싸서 독립적으로 로드 */}
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">매장 상태를 불러오는 중...</p>
          </div>
        </div>
      }>
        <StoreStatusSection />
      </Suspense>

      {/* 오늘의 작업 / 재무 현황 - 닫은 상태로 표시, 클릭 시 열리면서 API 호출 */}
      <FinancialDataProvider>
        <DashboardExpandableSections companyId={user.company_id} />
      </FinancialDataProvider>

      {/* 빠른 등록 섹션 - 즉시 표시 */}
      <QuickActionsSection />

      {/* 카테고리별 그룹화된 기능 - Lazy Loading */}
      <Suspense fallback={null}>
        <CategoryGroupedSectionsLazy sections={sections} />
      </Suspense>
    </div>
    </>
  )
}

