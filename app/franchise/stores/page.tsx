import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoreList from '@/app/business/stores/StoreList'

export default async function FranchiseStoresPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/franchise/dashboard')
  }

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

  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('*')
    .eq('franchise_id', userFranchiseId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 회사 프렌차이즈 조회 (선택용)
  const { data: franchises, error: franchisesError } = await supabase
    .from('franchises')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name')

  // 카테고리 템플릿 조회
  const { data: categoryTemplates, error: categoryTemplatesError } = await supabase
    .from('category_templates')
    .select('*')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .order('name')

  if (storesError || franchisesError || categoryTemplatesError) {
    console.error('Error fetching data:', { storesError, franchisesError, categoryTemplatesError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">매장 관리</h1>
        <a
          href="/franchise/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <StoreList 
        initialStores={stores || []} 
        franchises={franchises || []} 
        companyId={user.company_id}
        basePath="/franchise"
        categoryTemplates={categoryTemplates || []}
      />
    </div>
  )
}

