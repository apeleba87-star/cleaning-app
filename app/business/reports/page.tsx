import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BusinessReportsPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  // 회사 매장 ID 목록
  const { data: companyStores } = await supabase
    .from('stores')
    .select('id')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)

  const storeIds = companyStores?.map(s => s.id) || []

  // 통계 조회
  const [attendanceResult, photosResult, checklistResult, issuesResult] = await Promise.all([
    supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('work_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]),
    supabase
      .from('cleaning_photos')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
    supabase
      .from('checklist')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
  ])

  const stats = {
    monthlyAttendance: attendanceResult.count || 0,
    monthlyPhotos: photosResult.count || 0,
    monthlyChecklists: checklistResult.count || 0,
    monthlyIssues: issuesResult.count || 0,
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">리포트</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 출퇴근</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.monthlyAttendance}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 청소 사진</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.monthlyPhotos}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 체크리스트</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.monthlyChecklists}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">이번 달 이슈</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.monthlyIssues}</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-yellow-800">개발 예정 기능</h2>
        <ul className="space-y-2 text-sm text-yellow-700">
          <li>• 월간 리포트 상세 통계 (매장별, 직원별)</li>
          <li>• 주간 리포트 조회</li>
          <li>• 리포트 PDF 다운로드</li>
          <li>• 고객사에 직접 리포트 전달 기능</li>
          <li>• 리포트 승인/발송 워크플로우</li>
        </ul>
      </div>
    </div>
  )
}

