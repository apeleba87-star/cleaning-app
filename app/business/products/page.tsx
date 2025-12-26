import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProductUploadClient from './ProductUploadClient'
import ProductList from './ProductList'

export default async function ProductsPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
    redirect('/')
  }

  // 매장 목록 조회
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  if (storesError) {
    console.error('Error fetching stores:', storesError)
  }

  // 제품 목록 조회
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, barcode, image_url, category_1, category_2, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 매장별 제품 위치 통계
  const { data: locations, error: locationsError } = await supabase
    .from('store_product_locations')
    .select('store_id, product_id')

  const stats = {
    totalProducts: products?.length || 0,
    totalLocations: locations?.length || 0,
    storesWithProducts: new Set(locations?.map(l => l.store_id) || []).size
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">제품 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">등록된 제품</div>
          <div className="text-2xl font-bold">{stats.totalProducts}개</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">제품 위치 정보</div>
          <div className="text-2xl font-bold">{stats.totalLocations}개</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">제품 등록 매장</div>
          <div className="text-2xl font-bold">{stats.storesWithProducts}개</div>
        </div>
      </div>

      {/* 제품 목록 및 관리 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">제품 마스터 관리</h2>
        <ProductList initialProducts={products || []} />
      </div>

      {/* CSV 파일 업로드 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">CSV 파일 업로드</h2>
        <ProductUploadClient stores={stores || []} />
      </div>
    </div>
  )
}

