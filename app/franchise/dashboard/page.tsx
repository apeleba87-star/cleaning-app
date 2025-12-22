import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function FranchiseManagerDashboardPage() {
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

  // franchise_manager의 경우 franchise_id를 별도로 조회
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('franchise_id')
    .eq('id', user.id)
    .single()

  if (userDataError || !userData || !userData.franchise_id) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">프렌차이즈 정보가 없습니다. 관리자에게 문의하세요.</p>
        </div>
      </div>
    )
  }

  const userFranchiseId = userData.franchise_id

  // 프렌차이즈 정보 조회
  const { data: franchise } = await supabase
    .from('franchises')
    .select('*')
    .eq('id', userFranchiseId)
    .single()

  // 프렌차이즈에 속한 매장 ID 조회 (이슈 집계를 위해 배열로 사용)
  const { data: storeRows, error: storeListError } = await supabase
    .from('stores')
    .select('id')
    .eq('franchise_id', userFranchiseId)
    .is('deleted_at', null)

  if (storeListError) {
    console.error('Error loading franchise stores for dashboard:', storeListError)
  }

  const storeIds = storeRows?.map((s) => s.id) || []

  // 통계 조회
  const [storesResult, usersResult, issuesResult] = await Promise.all([
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('franchise_id', userFranchiseId)
      .is('deleted_at', null),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('franchise_id', userFranchiseId),
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

  const sections = [
    { title: '회사 관리', href: '/franchise/company', description: '회사 정보 및 요금제 관리' },
    { title: '매장 관리', href: '/franchise/stores', description: '매장 등록 및 관리' },
    { title: '매장 상태', href: '/franchise/stores/status', description: '전체 매장 상태 확인 및 요청란 보내기' },
    { title: '사용자 관리', href: '/franchise/users', description: '사용자 초대 및 권한 설정' },
    { title: '체크리스트 관리', href: '/franchise/checklists', description: '매장별 체크리스트 생성 및 관리' },
    { title: '공지사항 관리', href: '/franchise/announcements', description: '점주용/직원용 공지사항 작성 및 확인 현황' },
    { title: '리포트', href: '/franchise/reports', description: '월간/주간 리포트 조회' },
    { title: '요청/미흡사항', href: '/franchise/issues', description: '모든 매장의 요청/미흡 조회' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">프렌차이즈 관리자 대시보드</h1>

      {franchise && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">프렌차이즈 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">프렌차이즈명</p>
              <p className="font-medium">{franchise.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">상태</p>
              <p className="font-medium">{franchise.status === 'active' ? '활성' : franchise.status === 'inactive' ? '비활성' : '정지'}</p>
            </div>
            {franchise.business_registration_number && (
              <div>
                <p className="text-sm text-gray-500">사업자등록번호</p>
                <p className="font-medium">{franchise.business_registration_number}</p>
              </div>
            )}
            {franchise.manager_name && (
              <div>
                <p className="text-sm text-gray-500">담당자</p>
                <p className="font-medium">{franchise.manager_name}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
            <p className="text-gray-600 text-sm">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

