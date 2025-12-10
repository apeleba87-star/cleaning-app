import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoreList from './StoreList'

export default async function PlatformStoresPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || user.role !== 'platform_admin') {
    redirect('/platform/dashboard')
  }

  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select(`
      *,
      companies:company_id (
        id,
        name
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 모든 회사 조회
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  if (storesError || companiesError) {
    console.error('Error fetching data:', { storesError, companiesError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">전체 매장 관리</h1>
        <a
          href="/platform/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <StoreList initialStores={stores || []} companies={companies || []} />
    </div>
  )
}

