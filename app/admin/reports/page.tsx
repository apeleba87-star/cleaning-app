import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient()

  // 기본 통계 조회
  const [storesResult, usersResult, attendanceResult, issuesResult] = await Promise.all([
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .gte('work_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]),
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
  ])

  const stats = {
    totalStores: storesResult.count || 0,
    totalUsers: usersResult.count || 0,
    monthlyAttendance: attendanceResult.count || 0,
    monthlyIssues: issuesResult.count || 0,
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">리포트</h1>
        <a
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 매장</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalStores}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 직원</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 출퇴근</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.monthlyAttendance}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 이슈</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.monthlyIssues}</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-yellow-800">개발 예정 기능</h2>
        <ul className="space-y-2 text-sm text-yellow-700">
          <li>• 월간 리포트 상세 통계</li>
          <li>• 매장별 통계 및 비교</li>
          <li>• 직원별 근무 통계</li>
          <li>• 이슈/물품 요청 통계 및 트렌드</li>
          <li>• 리포트 PDF 다운로드</li>
        </ul>
      </div>
    </div>
  )
}

