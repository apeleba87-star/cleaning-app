import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 위치 좌표를 위치 번호로 변환
function convertLocationToPosition(coordinate: string): number {
  // "1,1" → 1
  // "2,1" → 11
  // "3,1" → 21
  const [row, col] = coordinate.split(',').map(Number)
  return (row - 1) * 10 + col
}

// 하드웨어명에서 자판기 번호 추출
function extractVendingMachineNumber(hardwareName: string): number | null {
  // "EZ_검단 아라역점_1호기" → 1
  // "EZ_검단 아라역점_2호기" → 2
  const match = hardwareName.match(/(\d+)호기/)
  return match ? parseInt(match[1]) : null
}

// 제품명 정규화 함수 (모든 곳에서 일관되게 사용)
function normalizeProductName(name: string | null | undefined): string {
  if (!name) return ''
  return name.trim()
}

// 바코드 정규화 함수 (모든 공백, 특수문자 제거, 숫자만 남기기)
function normalizeBarcode(barcode: string | null | undefined): string | null {
  if (!barcode) return null
  // 모든 공백, 작은따옴표, 큰따옴표, 특수문자 제거하고 숫자만 남기기
  const normalized = barcode.replace(/\s+/g, '').replace(/'/g, '').replace(/"/g, '').replace(/[^\d]/g, '')
  return normalized.length > 0 ? normalized : null
}

export async function POST(request: NextRequest) {
  console.log('Upload API called')
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      console.log('Unauthorized user')
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    console.log('User authorized:', user.role)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const mappingsJson = formData.get('mappings') as string | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    // 전달된 매핑 정보 파싱 (매핑 저장 직후 업로드 시 사용)
    let providedMappings: Array<{ originalStoreName: string; systemStoreId: string }> = []
    if (mappingsJson) {
      try {
        providedMappings = JSON.parse(mappingsJson)
        console.log('Provided mappings from request:', providedMappings)
      } catch (e) {
        console.warn('Failed to parse provided mappings:', e)
      }
    }

    // CSV 파일 읽기
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: '파일이 비어있거나 형식이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // 헤더 확인
    const header = lines[0]
    const headerColumns = header.split(',').map(col => col.replace(/"/g, '').trim())
    
    // 바코드 컬럼 존재 여부 확인
    const hasBarcodeColumn = headerColumns.includes('바코드') || headerColumns.includes('barcode')
    
    // CSV 파싱
    const rows: Array<{
      회사명: string
      지점명: string
      하드웨어명: string
      '1차카테고리': string
      '2차카테고리': string
      상품명: string
      바코드?: string
      재고: number
      위치: string
    }> = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // CSV 파싱 (쉼표로 구분, 따옴표 처리)
      const values: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim()) // 마지막 값
      
      // 바코드 컬럼이 있는 경우와 없는 경우를 구분하여 파싱
      if (hasBarcodeColumn) {
        // 바코드 컬럼이 있는 경우: 회사명, 지점명, 하드웨어명, 1차카테고리, 2차카테고리, 상품명, 바코드, 재고, 위치
        if (values.length >= 9) {
          rows.push({
            회사명: values[0].replace(/"/g, ''),
            지점명: values[1].replace(/"/g, ''),
            하드웨어명: values[2].replace(/"/g, ''),
            '1차카테고리': values[3].replace(/"/g, ''),
            '2차카테고리': values[4].replace(/"/g, ''),
            상품명: values[5].replace(/"/g, ''),
            바코드: normalizeBarcode(values[6]) || undefined,
            재고: parseInt(values[7]) || 0,
            위치: values[8].replace(/"/g, '')
          })
        }
      } else {
        // 바코드 컬럼이 없는 경우: 기존 형식
        if (values.length >= 8) {
          rows.push({
            회사명: values[0].replace(/"/g, ''),
            지점명: values[1].replace(/"/g, ''),
            하드웨어명: values[2].replace(/"/g, ''),
            '1차카테고리': values[3].replace(/"/g, ''),
            '2차카테고리': values[4].replace(/"/g, ''),
            상품명: values[5].replace(/"/g, ''),
            재고: parseInt(values[6]) || 0,
            위치: values[7].replace(/"/g, '')
          })
        }
      }
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: '파싱된 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 매장 목록 조회 (업체관리자는 자신의 회사 매장만 조회)
    let storesQuery = supabase
      .from('stores')
      .select('id, name, company_id')
      .is('deleted_at', null)

    if (user.role === 'business_owner' && user.company_id) {
      storesQuery = storesQuery.eq('company_id', user.company_id)
    }

    const { data: stores, error: storesError } = await storesQuery

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json(
        { error: '매장 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 매장명 매핑 조회
    const { data: allMappings, error: mappingsError } = await supabase
      .from('store_name_mappings')
      .select('system_store_id, original_store_name, hardware_name_pattern')
      .eq('is_active', true)

    if (mappingsError) {
      console.error('Error fetching mappings:', mappingsError)
      // 매핑 조회 실패해도 계속 진행 (매핑이 없을 수도 있음)
    }

    // 업체관리자인 경우 자신의 회사 매장 매핑만 필터링 (배치 처리)
    let mappings = allMappings || []
    if (user.role === 'business_owner' && user.company_id && mappings.length > 0) {
      const storeIds = mappings.map(m => m.system_store_id)
      const uniqueStoreIds = Array.from(new Set(storeIds))
      const validStoreIds = new Set<string>()
      
      // 매장 ID 배열을 배치로 나누어 처리
      const STORE_BATCH_SIZE = 1000
      for (let i = 0; i < uniqueStoreIds.length; i += STORE_BATCH_SIZE) {
        const batch = uniqueStoreIds.slice(i, i + STORE_BATCH_SIZE)
        const { data: validStores } = await supabase
          .from('stores')
          .select('id')
          .in('id', batch)
          .eq('company_id', user.company_id)
        
        if (validStores) {
          validStores.forEach(s => validStoreIds.add(s.id))
        }
      }
      
      mappings = mappings.filter(m => validStoreIds.has(m.system_store_id))
    }
    
    console.log('Store mappings from DB:', mappings)

    // 매장명 매핑 맵 생성
    const storeMappingMap = new Map<string, string>()
    
    // 1. 먼저 요청으로 전달된 매핑 정보 추가 (가장 우선)
    providedMappings.forEach((mapping) => {
      storeMappingMap.set(mapping.originalStoreName, mapping.systemStoreId)
      console.log(`Added provided mapping: ${mapping.originalStoreName} -> ${mapping.systemStoreId}`)
    })
    
    // 2. DB에서 조회한 매핑 정보 추가
    if (mappings) {
      mappings.forEach((mapping: any) => {
        // 요청으로 전달된 매핑이 없을 때만 DB 매핑 사용
        if (!storeMappingMap.has(mapping.original_store_name)) {
          const storeName = mapping.original_store_name
          storeMappingMap.set(storeName, mapping.system_store_id)
          
          // 하드웨어명 패턴이 있으면 그것도 추가
          if (mapping.hardware_name_pattern) {
            const keyWithPattern = `${storeName}_${mapping.hardware_name_pattern}`
            storeMappingMap.set(keyWithPattern, mapping.system_store_id)
          }
        }
      })
    }
    
    console.log('Store mapping map:', Array.from(storeMappingMap.entries()))

    // 원본 파일의 고유한 지점명 추출
    const uniqueStores = new Set<string>()
    rows.forEach(row => {
      uniqueStores.add(row.지점명)
    })
    
    console.log('Unique stores from CSV:', Array.from(uniqueStores))

    // 매칭되지 않은 매장 찾기
    const unmatchedStores: Array<{ 지점명: string; 하드웨어명: string }> = []
    const matchedStoreIds = new Set<string>()

    uniqueStores.forEach(storeName => {
      console.log(`Checking store: ${storeName}`)
      
      // 정확히 일치하는 매장 찾기
      const exactMatch = stores?.find(s => s.name === storeName)
      if (exactMatch) {
        console.log(`Found exact match: ${storeName} -> ${exactMatch.id}`)
        matchedStoreIds.add(exactMatch.id)
        return
      }

      // 매핑 테이블에서 찾기 (원본 매장명으로 직접 찾기)
      let found = false
      const mappedStoreId = storeMappingMap.get(storeName)
      if (mappedStoreId) {
        console.log(`Found mapping: ${storeName} -> ${mappedStoreId}`)
        matchedStoreIds.add(mappedStoreId)
        found = true
      } else {
        // 하드웨어명 패턴으로도 찾기 시도
        storeMappingMap.forEach((storeId, key) => {
          if (key.startsWith(`${storeName}_`)) {
            console.log(`Found mapping by pattern: ${key} -> ${storeId}`)
            matchedStoreIds.add(storeId)
            found = true
          }
        })
      }

      if (!found) {
        // 해당 지점명의 하드웨어명 찾기
        const hardwareNames = rows
          .filter(r => r.지점명 === storeName)
          .map(r => r.하드웨어명)
        const uniqueHardware = Array.from(new Set(hardwareNames))[0] || ''
        unmatchedStores.push({ 지점명: storeName, 하드웨어명: uniqueHardware })
      }
    })

    // 매칭되지 않은 매장이 있으면 매핑 정보 반환
    if (unmatchedStores.length > 0) {
      console.log('Unmatched stores found, returning mapping request:', unmatchedStores)
      return NextResponse.json({
        success: false,
        requiresMapping: true,
        unmatchedStores: unmatchedStores,
        availableStores: stores?.map(s => ({ id: s.id, name: s.name })) || []
      })
    }

    console.log('All stores matched, starting product and location processing...')
    console.log('Total rows to process:', rows.length)

    // 제품 등록 및 위치 업데이트
    let productsCreated = 0
    let productsUpdated = 0
    let locationsCreated = 0
    let locationsUpdated = 0
    const errors: string[] = []

    // 제품 조회 캐싱 (제품명 -> 제품 정보)
    const productCache = new Map<string, { id: string; barcode: string | null; category_1: string | null; category_2: string | null }>()
    
    // UPSERT 전 제품 수 (업데이트/생성 구분용)
    const productsBeforeUpsert = new Set<string>()
    
    // 매장 소유권 검증 캐싱 (매장 ID -> 검증 완료 여부)
    const verifiedStoreIds = new Set<string>()

    // 지점명별로 그룹화
    const storeGroups = new Map<string, typeof rows>()
    rows.forEach(row => {
      const storeName = row.지점명
      if (!storeGroups.has(storeName)) {
        storeGroups.set(storeName, [])
      }
      storeGroups.get(storeName)!.push(row)
    })

    // 모든 고유 제품명 수집 (배치 조회를 위해) - 정규화 함수 사용
    const uniqueProductNames = new Set<string>()
    rows.forEach(row => {
      const normalizedName = normalizeProductName(row.상품명)
      if (normalizedName) {
        uniqueProductNames.add(normalizedName)
      }
    })

    // 제품 배치 조회 (최대 1000개씩)
    const productNamesArray = Array.from(uniqueProductNames)
    const PRODUCT_BATCH_SIZE = 1000
    const productBatchCount = Math.ceil(productNamesArray.length / PRODUCT_BATCH_SIZE)
    console.log(`제품 배치 조회 시작: 총 ${productNamesArray.length}개 제품명 (${productBatchCount}개 배치로 조회)`)
    
    for (let i = 0; i < productNamesArray.length; i += PRODUCT_BATCH_SIZE) {
      const batch = productNamesArray.slice(i, i + PRODUCT_BATCH_SIZE)
      const batchNumber = Math.floor(i / PRODUCT_BATCH_SIZE) + 1
      
      const { data: batchProducts, error: batchError } = await supabase
        .from('products')
        .select('id, name, barcode, category_1, category_2')
        .in('name', batch)
        .is('deleted_at', null)

      if (batchError) {
        console.error(`제품 배치 조회 오류 (배치 ${batchNumber}/${productBatchCount}):`, batchError)
      } else if (batchProducts) {
        batchProducts.forEach(product => {
          // DB에서 조회한 제품명도 정규화 함수로 정규화하여 캐시 키로 사용 (일관성 확보)
          const normalizedName = normalizeProductName(product.name)
          if (normalizedName) {
            productCache.set(normalizedName, {
              id: product.id,
              barcode: product.barcode,
              category_1: product.category_1,
              category_2: product.category_2
            })
          }
        })
        console.log(`제품 배치 ${batchNumber}/${productBatchCount} 조회 완료: ${batchProducts.length}개 제품 발견`)
      }
    }

    console.log(`제품 배치 조회 완료: ${productCache.size}개 제품 캐시됨`)
    
    // UPSERT 전 제품명 저장 (업데이트/생성 구분용)
    productCache.forEach((_, productName) => {
      productsBeforeUpsert.add(productName)
    })

    // 위치 정보 조회 캐싱을 위한 데이터 구조 (store_id, vending_machine_number, position_number -> location info)
    const locationCache = new Map<string, { id: string; product_id: string | null }>()
    
    // 매장 ID별로 수집하여 배치 조회
    const storeIdMap = new Map<string, string>() // storeName -> storeId
    const storeIdsSet = new Set<string>()

    // 먼저 모든 매장 ID를 수집
    for (const [storeName, storeRows] of Array.from(storeGroups.entries())) {
      let storeId: string | null = null
      
      const exactMatch = stores?.find(s => s.name === storeName)
      if (exactMatch) {
        storeId = exactMatch.id
      } else {
        storeMappingMap.forEach((mappedStoreId, key) => {
          if (key.startsWith(storeName)) {
            storeId = mappedStoreId
          }
        })
      }

      if (storeId) {
        storeIdMap.set(storeName, storeId)
        storeIdsSet.add(storeId)
      }
    }

    // 업체관리자인 경우 매장 소유권 검증 후 필터링 (배치 처리)
    if (user.role === 'business_owner' && user.company_id) {
      const storeIdsArray = Array.from(storeIdsSet)
      const validStoreIds = new Set<string>()
      
      // 매장 ID 배열을 배치로 나누어 처리 (PostgreSQL IN 절 제한 대비)
      const STORE_BATCH_SIZE = 1000
      for (let i = 0; i < storeIdsArray.length; i += STORE_BATCH_SIZE) {
        const batch = storeIdsArray.slice(i, i + STORE_BATCH_SIZE)
        const { data: validStores } = await supabase
          .from('stores')
          .select('id')
          .in('id', batch)
          .eq('company_id', user.company_id)
        
        if (validStores) {
          validStores.forEach(s => validStoreIds.add(s.id))
        }
      }
      
      // 유효한 매장만 필터링
      for (const [storeName, storeId] of Array.from(storeIdMap.entries())) {
        if (!validStoreIds.has(storeId)) {
          storeIdMap.delete(storeName)
        } else {
          verifiedStoreIds.add(storeId)
        }
      }
    }

    // 각 매장별로 모든 위치 정보를 한 번에 조회 (배치 조회)
    const storeIdsForLocationQuery = Array.from(new Set(storeIdMap.values()))
    console.log(`위치 정보 배치 조회 시작: ${storeIdsForLocationQuery.length}개 매장`)
    
    for (let idx = 0; idx < storeIdsForLocationQuery.length; idx++) {
      const storeId = storeIdsForLocationQuery[idx]
      const { data: locations, error: locationsError } = await supabase
        .from('store_product_locations')
        .select('id, store_id, vending_machine_number, position_number, product_id')
        .eq('store_id', storeId)

      if (locationsError) {
        console.error(`위치 정보 배치 조회 오류 (매장 ${idx + 1}/${storeIdsForLocationQuery.length}):`, locationsError)
      } else if (locations) {
        locations.forEach(location => {
          const cacheKey = `${location.store_id}-${location.vending_machine_number}-${location.position_number}`
          locationCache.set(cacheKey, {
            id: location.id,
            product_id: location.product_id
          })
        })
        console.log(`위치 정보 조회 완료 (매장 ${idx + 1}/${storeIdsForLocationQuery.length}): ${locations.length}개 위치 발견`)
      }
    }

    console.log(`위치 정보 배치 조회 완료: 총 ${locationCache.size}개 위치 캐시됨`)

    // ============================================
    // 제품 정보 배치 UPSERT (옵션 A)
    // ============================================
    console.log('제품 정보 배치 UPSERT 시작...')
    
    // 1. 모든 행에서 제품 정보 수집 (중복 제거, 마지막 값으로 덮어쓰기)
    // 기존 캐시 데이터와 병합하여 누락된 정보만 보완
    const productsToUpsertMap = new Map<string, {
      name: string
      barcode: string | null
      category_1: string | null
      category_2: string | null
    }>()
    
    rows.forEach(row => {
      const productName = normalizeProductName(row.상품명)
      if (!productName) return
      
      // 기존 캐시에서 제품 정보 가져오기 (있는 경우)
      const existingProduct = productCache.get(productName)
      
      // 새로운 데이터 (CSV에서) - 바코드는 정규화 함수로 처리
      const newBarcode = normalizeBarcode(row.바코드)
      const newCategory1 = (row['1차카테고리'] && row['1차카테고리'].trim()) ? row['1차카테고리'].trim() : null
      const newCategory2 = (row['2차카테고리'] && row['2차카테고리'].trim()) ? row['2차카테고리'].trim() : null
      
      // 기존 데이터와 병합: 기존 값이 있으면 유지, 없으면 새 값 사용 (COALESCE 로직)
      productsToUpsertMap.set(productName, {
        name: productName,
        barcode: existingProduct?.barcode || newBarcode,
        category_1: existingProduct?.category_1 || newCategory1,
        category_2: existingProduct?.category_2 || newCategory2,
      })
    })
    
    const productsToUpsert = Array.from(productsToUpsertMap.values())
    console.log(`제품 정보 수집 완료: 총 ${productsToUpsert.length}개 고유 제품명`)
    
    // 2. 제품 정보 배치 처리 (INSERT와 UPDATE 분리 - 부분 인덱스 때문에 ON CONFLICT 사용 불가)
    if (productsToUpsert.length > 0) {
      const PRODUCT_BATCH_SIZE = 1000
      
      // 존재하는 제품과 새 제품 분리
      const productsToUpdate: typeof productsToUpsert = []
      const productsToInsert: typeof productsToUpsert = []
      
      productsToUpsert.forEach(product => {
        const existingProduct = productCache.get(product.name)
        if (existingProduct) {
          // 기존 제품: 누락된 정보만 보완하여 업데이트
          const updateData: typeof product = {
            name: product.name,
            barcode: existingProduct.barcode || product.barcode,
            category_1: existingProduct.category_1 || product.category_1,
            category_2: existingProduct.category_2 || product.category_2,
          }
          productsToUpdate.push(updateData)
        } else {
          // 새 제품: INSERT
          productsToInsert.push(product)
        }
      })
      
      console.log(`제품 처리 분류: 업데이트 ${productsToUpdate.length}개, 생성 ${productsToInsert.length}개`)
      
      // 2-1. 기존 제품 배치 UPDATE
      // 참고: Supabase는 배치 UPDATE를 지원하지 않으므로, UPDATE가 필요한 경우만 개별 처리
      // 하지만 대부분의 제품은 이미 정보가 완전하므로 UPDATE가 필요한 경우가 많지 않음
      if (productsToUpdate.length > 0) {
        let updatedCount = 0
        for (const product of productsToUpdate) {
          const existingProduct = productCache.get(product.name)
          if (!existingProduct) continue
          
          const updateData: {
            barcode?: string | null
            category_1?: string | null
            category_2?: string | null
            updated_at?: string
          } = {}
          let needsUpdate = false
          
          // 누락된 정보만 추가
          if (!existingProduct.barcode && product.barcode) {
            updateData.barcode = product.barcode
            needsUpdate = true
          }
          if (!existingProduct.category_1 && product.category_1) {
            updateData.category_1 = product.category_1
            needsUpdate = true
          }
          if (!existingProduct.category_2 && product.category_2) {
            updateData.category_2 = product.category_2
            needsUpdate = true
          }
          
          if (needsUpdate) {
            updateData.updated_at = new Date().toISOString()
            const { error: updateError } = await supabase
              .from('products')
              .update(updateData)
              .eq('id', existingProduct.id)
            
            if (updateError) {
              console.error(`제품 업데이트 실패: ${product.name} - ${updateError.message}`)
            } else {
              updatedCount++
              // 캐시 업데이트
              productCache.set(product.name, {
                ...existingProduct,
                ...updateData
              })
            }
          }
        }
        console.log(`제품 업데이트 완료: ${updatedCount}개 (총 ${productsToUpdate.length}개 중)`)
      }
      
      // 2-2. 새 제품 배치 INSERT
      // INSERT 전에 모든 제품명을 미리 조회하여 캐시에 로드 (중복 방지 강화)
      if (productsToInsert.length > 0) {
        const insertBatches = Math.ceil(productsToInsert.length / PRODUCT_BATCH_SIZE)
        
        // INSERT 전에 모든 제품명을 한 번에 조회하여 캐시에 미리 로드
        const allInsertProductNames = productsToInsert.map(p => normalizeProductName(p.name))
        const uniqueInsertNames = Array.from(new Set(allInsertProductNames.filter(name => name)))
        
        console.log(`INSERT 전 전체 제품명 사전 조회 시작: ${uniqueInsertNames.length}개 고유 제품명`)
        for (let i = 0; i < uniqueInsertNames.length; i += PRODUCT_BATCH_SIZE) {
          const nameBatch = uniqueInsertNames.slice(i, i + PRODUCT_BATCH_SIZE)
          const { data: preCheckProducts, error: preCheckError } = await supabase
            .from('products')
            .select('id, name, barcode, category_1, category_2')
            .in('name', nameBatch)
            .is('deleted_at', null)
          
          if (!preCheckError && preCheckProducts) {
            preCheckProducts.forEach(product => {
              const normalizedName = normalizeProductName(product.name)
              if (normalizedName) {
                productCache.set(normalizedName, {
                  id: product.id,
                  barcode: product.barcode,
                  category_1: product.category_1,
                  category_2: product.category_2
                })
              }
            })
            console.log(`INSERT 전 사전 조회 완료: ${preCheckProducts.length}개 제품이 이미 존재함`)
          }
        }
        
        // 실제 INSERT 처리 (이미 존재하는 제품은 제외)
        for (let i = 0; i < productsToInsert.length; i += PRODUCT_BATCH_SIZE) {
          const batch = productsToInsert.slice(i, i + PRODUCT_BATCH_SIZE)
          const batchNumber = Math.floor(i / PRODUCT_BATCH_SIZE) + 1
          
          // 이미 캐시에 있는 제품 제외 (정규화된 이름으로 비교)
          const batchToInsert = batch.filter(p => {
            const normalizedName = normalizeProductName(p.name)
            return normalizedName && !productCache.has(normalizedName)
          })
          
          if (batchToInsert.length > 0) {
            const { data: insertedProducts, error: insertError } = await supabase
              .from('products')
              .insert(batchToInsert)
              .select('id, name, barcode, category_1, category_2')
            
            if (insertError) {
              // UNIQUE 제약 위반은 정상적인 경우로 처리 (동시성 문제로 인한 중복)
              if (insertError.message.includes('unique constraint') || insertError.message.includes('duplicate key')) {
                console.log(`제품 배치 ${batchNumber}/${insertBatches}: UNIQUE 제약 위반 감지 (동시성 문제), 제품 재조회 중...`)
                
                // 실패한 제품명들을 재조회하여 캐시에 추가
                const failedProductNames = batchToInsert.map(p => normalizeProductName(p.name)).filter(name => name)
                if (failedProductNames.length > 0) {
                  const { data: existingProducts, error: fetchError } = await supabase
                    .from('products')
                    .select('id, name, barcode, category_1, category_2')
                    .in('name', failedProductNames)
                    .is('deleted_at', null)
                  
                  if (!fetchError && existingProducts) {
                    existingProducts.forEach(product => {
                      const normalizedName = normalizeProductName(product.name)
                      if (normalizedName) {
                        productCache.set(normalizedName, {
                          id: product.id,
                          barcode: product.barcode,
                          category_1: product.category_1,
                          category_2: product.category_2
                        })
                      }
                    })
                    console.log(`제품 배치 ${batchNumber}/${insertBatches}: UNIQUE 제약 위반으로 인해 ${existingProducts.length}개 제품을 캐시에 추가 (정상 처리)`)
                  }
                }
                // UNIQUE 제약 위반은 에러로 카운트하지 않음 (정상적인 동시성 처리)
              } else {
                // 다른 종류의 에러는 기록
                console.error(`제품 배치 INSERT 오류 (배치 ${batchNumber}/${insertBatches}):`, insertError)
                errors.push(`제품 배치 INSERT 실패 (배치 ${batchNumber}): ${insertError.message}`)
              }
            } else if (insertedProducts) {
              // INSERT 후 반환된 제품 정보를 캐시에 저장
              insertedProducts.forEach(product => {
                const normalizedName = normalizeProductName(product.name)
                if (normalizedName) {
                  productCache.set(normalizedName, {
                    id: product.id,
                    barcode: product.barcode,
                    category_1: product.category_1,
                    category_2: product.category_2
                  })
                }
              })
              console.log(`제품 배치 INSERT 완료 (배치 ${batchNumber}/${insertBatches}): ${insertedProducts.length}개 생성`)
            }
          } else {
            console.log(`제품 배치 ${batchNumber}/${insertBatches}: 모든 제품이 이미 존재하여 INSERT 생략`)
          }
        }
      }
      
      // 3. INSERT 후 모든 제품 ID 조회 (INSERT 결과에 포함되지 않은 제품들용)
      // INSERT의 .select()가 모든 제품을 반환하지 않을 수 있으므로, 추가 조회
      const allProductNames = Array.from(productsToUpsertMap.keys())
      const missingProductNames = allProductNames.filter(name => !productCache.has(name))
      
      if (missingProductNames.length > 0) {
        for (let i = 0; i < missingProductNames.length; i += PRODUCT_BATCH_SIZE) {
          const batch = missingProductNames.slice(i, i + PRODUCT_BATCH_SIZE)
          const { data: fetchedProducts, error: fetchError } = await supabase
            .from('products')
            .select('id, name, barcode, category_1, category_2')
            .in('name', batch)
            .is('deleted_at', null)
          
          if (!fetchError && fetchedProducts) {
            fetchedProducts.forEach(product => {
              const normalizedName = normalizeProductName(product.name)
              if (normalizedName) {
                productCache.set(normalizedName, {
                  id: product.id,
                  barcode: product.barcode,
                  category_1: product.category_1,
                  category_2: product.category_2
                })
              }
            })
          }
        }
      }
    }
    
    console.log(`제품 정보 배치 UPSERT 완료: ${productCache.size}개 제품 캐시됨`)
    
    // UPSERT 통계 계산
    // UPSERT 전에 캐시에 있던 제품 = 업데이트된 것 (대략)
    // UPSERT 전에 캐시에 없던 제품 = 새로 생성된 것 (대략)
    productsUpdated = productsBeforeUpsert.size
    productsCreated = productCache.size - productsBeforeUpsert.size
    
    // ============================================
    // 위치 정보 수집 및 배치 UPSERT
    // ============================================
    
    // 배치 처리를 위한 위치 정보 수집
    const locationsToUpsert: Array<{ store_id: string; product_id: string; vending_machine_number: number; position_number: number; stock_quantity: number; is_available: boolean; last_updated_at: string }> = []

    // 각 매장별로 처리 (제품은 이미 배치 UPSERT로 처리됨, 위치 정보만 수집)
    for (const [storeName, storeRows] of Array.from(storeGroups.entries())) {
      const storeId = storeIdMap.get(storeName)

      if (!storeId) {
        errors.push(`매장을 찾을 수 없거나 권한이 없습니다: ${storeName}`)
        continue
      }

      for (const row of storeRows) {
        try {
          // 자판기 번호 추출
          const vendingMachineNumber = extractVendingMachineNumber(row.하드웨어명)
          if (!vendingMachineNumber) {
            errors.push(`자판기 번호를 추출할 수 없습니다: ${row.하드웨어명}`)
            continue
          }

          // 위치 번호 변환
          const positionNumber = convertLocationToPosition(row.위치)

          // 제품 ID 조회 (이미 배치 UPSERT로 처리됨, 캐시에서만 조회)
          const productName = normalizeProductName(row.상품명)
          if (!productName) {
            errors.push('제품명이 없는 행을 건너뜁니다.')
            continue
          }

          // 캐시에서 제품 ID 조회 (배치 UPSERT로 이미 처리됨)
          const cachedProduct = productCache.get(productName)
          if (!cachedProduct) {
            // 제품을 찾을 수 없는 경우, 마지막으로 한 번 더 조회 시도
            const { data: lastChanceProduct, error: lastChanceError } = await supabase
              .from('products')
              .select('id, name, barcode, category_1, category_2')
              .eq('name', productName)
              .is('deleted_at', null)
              .limit(1)
              .single()
            
            if (!lastChanceError && lastChanceProduct) {
              // 마지막 시도에서 찾았으면 캐시에 추가
              productCache.set(productName, {
                id: lastChanceProduct.id,
                barcode: lastChanceProduct.barcode,
                category_1: lastChanceProduct.category_1,
                category_2: lastChanceProduct.category_2
              })
              const productId = lastChanceProduct.id
              
              // 위치 정보를 배치 UPSERT 목록에 추가
              locationsToUpsert.push({
                store_id: storeId,
                product_id: productId,
                vending_machine_number: vendingMachineNumber,
                position_number: positionNumber,
                stock_quantity: row.재고,
                is_available: row.재고 > 0,
                last_updated_at: new Date().toISOString()
              })
              continue
            } else {
              errors.push(`제품을 찾을 수 없습니다: ${productName}`)
              continue
            }
          }

          const productId = cachedProduct.id

          // 위치 정보를 배치 UPSERT 목록에 추가 (나중에 일괄 처리)
          if (productId) {
            locationsToUpsert.push({
              store_id: storeId,
              product_id: productId,
              vending_machine_number: vendingMachineNumber,
              position_number: positionNumber,
              stock_quantity: row.재고,
              is_available: row.재고 > 0,
              last_updated_at: new Date().toISOString()
            })
          }
        } catch (error: any) {
          const productName = row.상품명?.trim() || '알 수 없음'
          errors.push(`처리 중 오류: ${productName} - ${error.message}`)
        }
      }
    }

    // 위치 정보 배치 UPSERT 처리 (중복 제거)
    if (locationsToUpsert.length > 0) {
      // 같은 위치(매장, 자판기, 위치번호)를 가진 위치 정보 중복 제거 (마지막 값으로 덮어쓰기)
      // 같은 위치에 다른 제품이 오면 교체되도록 product_id를 키에서 제외
      const uniqueLocationsMap = new Map<string, typeof locationsToUpsert[0]>()
      for (const location of locationsToUpsert) {
        const key = `${location.store_id}-${location.vending_machine_number}-${location.position_number}`
        uniqueLocationsMap.set(key, location) // 같은 위치가 있으면 마지막 값으로 덮어쓰기 (제품 교체)
      }
      const uniqueLocations = Array.from(uniqueLocationsMap.values())
      
      // 배치 크기를 더 작게 설정 (Supabase 안정성 확보)
      const BATCH_SIZE = 500
      const totalBatches = Math.ceil(uniqueLocations.length / BATCH_SIZE)
      
      console.log(`위치 정보 배치 UPSERT 시작: 총 ${uniqueLocations.length}개 (${totalBatches}개 배치로 처리)`)
      
      for (let i = 0; i < uniqueLocations.length; i += BATCH_SIZE) {
        const batch = uniqueLocations.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        
        console.log(`위치 정보 배치 ${batchNumber}/${totalBatches} 처리 중... (${batch.length}개 항목)`)
        
        const { error: upsertError } = await supabase
          .from('store_product_locations')
          .upsert(batch, {
            onConflict: 'store_id,vending_machine_number,position_number',
            ignoreDuplicates: false
          })

        if (upsertError) {
          console.error(`위치 정보 배치 UPSERT 오류 (배치 ${batchNumber}/${totalBatches}):`, upsertError)
          errors.push(`위치 정보 배치 처리 실패 (배치 ${batchNumber}/${totalBatches}): ${upsertError.message}`)
        } else {
          console.log(`위치 정보 배치 ${batchNumber}/${totalBatches} 성공: ${batch.length}개 처리됨`)
          // 캐시에서 기존 위치인지 확인하여 created/updated 구분 시도
          for (const location of batch) {
            const cacheKey = `${location.store_id}-${location.vending_machine_number}-${location.position_number}`
            if (locationCache.has(cacheKey)) {
              locationsUpdated++
            } else {
              locationsCreated++
            }
          }
        }
        
        // 마지막 배치가 아니면 잠시 대기 (서버 부하 분산)
        if (batchNumber < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log(`위치 정보 배치 UPSERT 완료: 총 ${uniqueLocations.length}개 처리됨 (생성: ${locationsCreated}, 업데이트: ${locationsUpdated}, 중복 제거: ${locationsToUpsert.length - uniqueLocations.length}개)`)
    }

    console.log('Upload processing completed:', {
      productsCreated,
      productsUpdated,
      locationsCreated,
      locationsUpdated,
      totalRows: rows.length,
      errors: errors.length
    })

    return NextResponse.json({
      success: true,
      summary: {
        productsCreated,
        productsUpdated,
        locationsCreated,
        locationsUpdated,
        totalRows: rows.length,
        errors: errors.length
      },
      errors: errors.slice(0, 10) // 처음 10개만 반환
    })
  } catch (error: any) {
    console.error('Error in POST /api/business/products/upload:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        success: false,
        error: '파일 업로드 중 오류가 발생했습니다: ' + error.message 
      },
      { status: 500 }
    )
  }
}

