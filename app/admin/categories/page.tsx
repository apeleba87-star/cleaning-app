import { createServerSupabaseClient } from '@/lib/supabase/server'
import CategoryList from './CategoryList'

export default async function CategoriesPage() {
  const supabase = await createServerSupabaseClient()
  
  // 모든 카테고리 조회
  const { data: categories, error: categoriesError } = await supabase
    .from('request_categories')
    .select(`
      *,
      stores:store_id (
        id,
        name
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 모든 매장 조회
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  if (categoriesError || storesError) {
    console.error('Error fetching data:', { categoriesError, storesError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">카테고리 관리</h1>
        <a
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>
      
      <CategoryList 
        initialCategories={categories || []} 
        stores={stores || []}
      />
    </div>
  )
}

