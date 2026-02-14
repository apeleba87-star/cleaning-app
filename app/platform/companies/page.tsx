import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import CompanyList from './CompanyList'

export default async function CompaniesPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || user.role !== 'platform_admin') {
    redirect('/platform/dashboard')
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const dataClient = serviceRoleKey && supabaseUrl
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : supabase
  
  const { data: companies, error } = await dataClient
    .from('companies')
    .select(`
      *,
      stores:stores!stores_company_id_fkey (
        id
      ),
      users:users!users_company_id_fkey (
        id
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching companies:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">회사 목록을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  // 통계 계산
  const companiesWithStats = companies?.map(company => ({
    ...company,
    storeCount: Array.isArray(company.stores) ? company.stores.length : 0,
    userCount: Array.isArray(company.users) ? company.users.length : 0,
  })) || []

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">전체 회사 관리</h1>
        <a
          href="/platform/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>
      
      <CompanyList initialCompanies={companiesWithStats} />
    </div>
  )
}

