import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IssueList from './IssueList'

export default async function BusinessIssuesPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  // 회사 매장 ID 목록
  const { data: companyStores } = await supabase
    .from('stores')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)

  const storeIds = companyStores?.map(s => s.id) || []
  const storeMap = new Map(companyStores?.map(s => [s.id, s.name]) || [])

  // 모든 이슈 조회
  const { data: issues, error } = await supabase
    .from('issues')
    .select(`
      *,
      users:user_id (
        id,
        name
      ),
      request_categories:category_id (
        id,
        name
      )
    `)
    .in('store_id', storeIds)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching issues:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">이슈 목록을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">요청/미흡사항 모니터링</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>
      
      <IssueList initialIssues={issues || []} storeMap={storeMap} />
    </div>
  )
}

