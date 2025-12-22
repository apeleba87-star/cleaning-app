import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanyForm from './CompanyForm'

export default async function CompanyPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', user.company_id)
    .single()

  if (error) {
    console.error('Error fetching company:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">회사 정보를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">회사 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <CompanyForm company={company} />
    </div>
  )
}

