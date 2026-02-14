import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { SessionReplacedToast } from './SessionReplacedToast'

export default async function PlatformAdminDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const dataClient = serviceRoleKey && supabaseUrl
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : supabase

  // 전체 통계 조회 (dataClient로 RLS 우회)
  const [companiesResult, storesResult, usersResult, issuesResult] = await Promise.all([
    dataClient
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    dataClient
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    dataClient
      .from('users')
      .select('id', { count: 'exact', head: true }),
    dataClient
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
  ])

  const stats = {
    totalCompanies: companiesResult.count || 0,
    totalStores: storesResult.count || 0,
    totalUsers: usersResult.count || 0,
    monthlyIssues: issuesResult.count || 0,
  }

  const sections = [
    { title: '전체 회사 관리', href: '/platform/companies', description: '가입된 모든 회사 리스트 및 관리' },
    { title: '전체 사용자 관리', href: '/platform/users', description: '모든 사용자 조회 및 관리' },
    { title: '전체 매장 관리', href: '/platform/stores', description: '모든 매장 조회 및 관리' },
    { title: '결제 관리', href: '/platform/billing', description: '요금제 생성 및 결제 관리' },
    { title: '랜딩 페이지 관리', href: '/admin/landing', description: '웹사이트 히어로 섹션 및 콘텐츠 관리' },
    { title: '시스템 설정', href: '/platform/settings', description: '정책 및 제한 설정' },
    { title: '모니터링', href: '/platform/monitoring', description: '로그 및 장애 모니터링' },
  ]

  return (
    <>
      <SessionReplacedToast />
      <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">시스템 관리자 대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 회사</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCompanies}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 매장</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalStores}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 사용자</h3>
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
    </>
  )
}

