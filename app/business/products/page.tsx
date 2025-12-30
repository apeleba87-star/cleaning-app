import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProductUploadClient from './ProductUploadClient'
import ProductMasterSection from './ProductMasterSection'
import ProductLocationSection from './ProductLocationSection'
import StoreProductSection from './StoreProductSection'

export default async function ProductsPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
    redirect('/')
  }

  // 매장 목록 조회 (업체관리자는 자신의 회사 매장만)
  let storesQuery = supabase
    .from('stores')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  if (user.role === 'business_owner' && user.company_id) {
    storesQuery = storesQuery.eq('company_id', user.company_id)
  }

  const { data: stores, error: storesError } = await storesQuery

  if (storesError) {
    console.error('Error fetching stores:', storesError)
  }

  // 제품 목록 조회 (모든 제품, limit 없음 - 중복 제거는 DB UNIQUE 제약으로 처리)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, barcode, image_url, category_1, category_2, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  
  // 제품 중복 확인 (디버깅용 - 나중에 제거 가능)
  if (products && products.length > 0) {
    const productNames = products.map(p => p.name)
    const uniqueNames = new Set(productNames)
    if (productNames.length !== uniqueNames.size) {
      console.warn(`중복 제품 감지: 총 ${productNames.length}개, 고유 ${uniqueNames.size}개`)
    }
  }

  // 매장별 제품 위치 정보 조회 (업체관리자는 자신의 회사 매장만)
  let locations: any[] = []
  let locationsError: any = null
  
  let locationsQuery = supabase
    .from('store_product_locations')
    .select(`
      id,
      store_id,
      product_id,
      vending_machine_number,
      position_number,
      stock_quantity,
      is_available,
      last_updated_at,
      stores:store_id (
        id,
        name,
        company_id
      ),
      products:product_id (
        id,
        name
      )
    `)
    .order('last_updated_at', { ascending: false })

  // 업체관리자인 경우 자신의 회사 매장만 조회
  let companyStoreIds: string[] = []
  if (user.role === 'business_owner' && user.company_id) {
    // 먼저 회사 매장 ID 목록 가져오기
    const { data: companyStores } = await supabase
      .from('stores')
      .select('id')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
    
    companyStoreIds = companyStores?.map(s => s.id) || []
    if (companyStoreIds.length > 0) {
      // 배치로 나누어 처리 (IN 절 제한 대비)
      const STORE_BATCH_SIZE = 1000
      const allLocations: any[] = []
      
      for (let i = 0; i < companyStoreIds.length; i += STORE_BATCH_SIZE) {
        const batch = companyStoreIds.slice(i, i + STORE_BATCH_SIZE)
        
        // Supabase 기본 limit 1000개 제한을 해결하기 위해 range 사용 (limit을 1000으로 설정)
        let offset = 0
        const limit = 1000 // Supabase 최대 반환 개수
        let hasMore = true
        
        while (hasMore) {
          const { data: batchLocations, error: batchError } = await supabase
            .from('store_product_locations')
            .select(`
              id,
              store_id,
              product_id,
              vending_machine_number,
              position_number,
              stock_quantity,
              is_available,
              last_updated_at,
              stores:store_id (
                id,
                name,
                company_id
              ),
              products:product_id (
                id,
                name
              )
            `)
            .in('store_id', batch)
            .order('last_updated_at', { ascending: false })
            .range(offset, offset + limit - 1)
          
          if (batchError) {
            console.error(`위치 정보 조회 오류 (배치 ${i / STORE_BATCH_SIZE + 1}, offset ${offset}):`, batchError)
            break
          }
          
          if (batchLocations && batchLocations.length > 0) {
            allLocations.push(...batchLocations)
            offset += limit
            
            // 가져온 개수가 limit보다 적으면 더 이상 없음
            if (batchLocations.length < limit) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }
      }
      
      locations = allLocations
      locationsError = null
    } else {
      locations = []
      locationsError = null
    }
  } else {
    // Supabase 기본 limit 1000개 제한을 해결하기 위해 range 사용 (limit을 1000으로 설정)
    let offset = 0
    const limit = 1000 // Supabase 최대 반환 개수
    const allLocations: any[] = []
    let hasMore = true
    
    while (hasMore) {
      const { data: batchLocations, error: batchError } = await supabase
        .from('store_product_locations')
        .select(`
          id,
          store_id,
          product_id,
          vending_machine_number,
          position_number,
          stock_quantity,
          is_available,
          last_updated_at,
          stores:store_id (
            id,
            name,
            company_id
          ),
          products:product_id (
            id,
            name
          )
        `)
        .order('last_updated_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (batchError) {
        locationsError = batchError
        locations = []
        break
      }
      
      if (batchLocations && batchLocations.length > 0) {
        allLocations.push(...batchLocations)
        offset += limit
        
        if (batchLocations.length < limit) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    locations = allLocations
    locationsError = null
  }

  // 통계를 COUNT 쿼리로 별도 계산 (정확한 통계 보장)
  let totalLocationsCount = 0
  let storesWithProductsCount = 0
  
  if (user.role === 'business_owner' && user.company_id && companyStoreIds.length > 0) {
    // 제품 위치 정보 총 개수
    const { count: locationsCount } = await supabase
      .from('store_product_locations')
      .select('*', { count: 'exact', head: true })
      .in('store_id', companyStoreIds)
    
    totalLocationsCount = locationsCount || 0
    
    // DISTINCT store_id 개수를 직접 쿼리 (배치로 나누어 처리)
    const STORE_BATCH_SIZE_FOR_COUNT = 1000
    const allDistinctStoreIds = new Set<string>()
    
    for (let i = 0; i < companyStoreIds.length; i += STORE_BATCH_SIZE_FOR_COUNT) {
      const batch = companyStoreIds.slice(i, i + STORE_BATCH_SIZE_FOR_COUNT)
      const { data: distinctStores } = await supabase
        .from('store_product_locations')
        .select('store_id')
        .in('store_id', batch)
      
      if (distinctStores) {
        distinctStores.forEach(s => allDistinctStoreIds.add(s.store_id))
      }
    }
    
    storesWithProductsCount = allDistinctStoreIds.size
  } else if (user.role !== 'business_owner') {
    // 플랫폼 관리자는 모든 데이터
    const { count: locationsCount } = await supabase
      .from('store_product_locations')
      .select('*', { count: 'exact', head: true })
    
    totalLocationsCount = locationsCount || 0
    
    // DISTINCT store_id를 배치로 조회 (Supabase limit 대비)
    let offset = 0
    const limit = 1000
    const allDistinctStoreIds = new Set<string>()
    let hasMore = true
    
    while (hasMore) {
      const { data: distinctStores } = await supabase
        .from('store_product_locations')
        .select('store_id')
        .range(offset, offset + limit - 1)
      
      if (distinctStores && distinctStores.length > 0) {
        distinctStores.forEach(s => allDistinctStoreIds.add(s.store_id))
        offset += limit
        
        if (distinctStores.length < limit) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    storesWithProductsCount = allDistinctStoreIds.size
  }

  const stats = {
    totalProducts: products?.length || 0,
    totalLocations: totalLocationsCount,
    storesWithProducts: storesWithProductsCount
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">바코드 제품 등록</h1>
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
      <ProductMasterSection products={products || []} />

      {/* 제품 위치 정보 관리 */}
      {/* 페이지네이션으로 인해 초기 데이터는 클라이언트에서 로드 (빈 배열 전달) */}
      <ProductLocationSection 
        initialLocations={[]} 
        stores={stores || []} 
      />

      {/* 제품 등록 매장 관리 */}
      <StoreProductSection stores={stores || []} />

      {/* CSV 파일 업로드 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">CSV 파일 업로드</h2>
        <ProductUploadClient stores={stores || []} />
      </div>
    </div>
  )
}

