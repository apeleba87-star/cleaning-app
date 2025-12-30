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
            바코드: values[6].replace(/"/g, '').trim() || undefined,
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

    // 모든 고유 제품명 수집 (배치 조회를 위해)
    const uniqueProductNames = new Set<string>()
    rows.forEach(row => {
      if (row.상품명) {
        uniqueProductNames.add(row.상품명)
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
          productCache.set(product.name, {
            id: product.id,
            barcode: product.barcode,
            category_1: product.category_1,
            category_2: product.category_2
          })
        })
        console.log(`제품 배치 ${batchNumber}/${productBatchCount} 조회 완료: ${batchProducts.length}개 제품 발견`)
      }
    }

    console.log(`제품 배치 조회 완료: ${productCache.size}개 제품 캐시됨`)

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

    // 배치 처리를 위한 위치 정보 수집
    const locationsToUpsert: Array<{ store_id: string; product_id: string; vending_machine_number: number; position_number: number; stock_quantity: number; is_available: boolean; last_updated_at: string }> = []

    // 각 매장별로 처리 (제품은 현재 방식 유지, 위치 정보만 배치 처리)
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

          // 제품 찾기 또는 생성 (캐시에서만 조회, 이미 배치 조회로 캐시됨)
          let productId: string | null = null
          let existingProduct: { id: string; barcode: string | null; category_1: string | null; category_2: string | null } | null = null

          // 캐시에서만 확인 (배치 조회로 이미 캐시됨)
          if (productCache.has(row.상품명)) {
            existingProduct = productCache.get(row.상품명)!
            productId = existingProduct.id
          }

          if (existingProduct) {
            
            // 기존 제품 정보 업데이트 (누락된 정보만 보완)
            const updateData: {
              barcode?: string | null
              category_1?: string | null
              category_2?: string | null
              updated_at?: string
            } = {}
            
            let needsUpdate = false
            
            // 바코드가 없고 새 파일에 바코드가 있으면 추가
            if (!existingProduct.barcode && row.바코드 && row.바코드.trim()) {
              updateData.barcode = row.바코드.trim()
              needsUpdate = true
            }
            
            // 카테고리 정보 보완
            if (!existingProduct.category_1 && row['1차카테고리'] && row['1차카테고리'].trim()) {
              updateData.category_1 = row['1차카테고리'].trim()
              needsUpdate = true
            }
            
            if (!existingProduct.category_2 && row['2차카테고리'] && row['2차카테고리'].trim()) {
              updateData.category_2 = row['2차카테고리'].trim()
              needsUpdate = true
            }
            
            // 업데이트가 필요한 경우에만 실행
            if (needsUpdate) {
              updateData.updated_at = new Date().toISOString()
              
              const { error: updateError } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', existingProduct.id)
              
              if (updateError) {
                console.error(`제품 정보 업데이트 실패: ${row.상품명} - ${updateError.message}`)
                // 업데이트 실패해도 위치 정보는 저장 가능하므로 계속 진행
              } else {
                productsUpdated++
                // 캐시 업데이트 (업데이트된 정보 반영)
                productCache.set(row.상품명, {
                  ...existingProduct,
                  ...updateData
                })
              }
            } else {
              productsUpdated++
            }
          } else {
            // 제품 생성
            const { data: newProduct, error: productCreateError } = await supabase
              .from('products')
              .insert({
                name: row.상품명,
                barcode: (row.바코드 && row.바코드.trim()) ? row.바코드.trim() : null,
                category_1: (row['1차카테고리'] && row['1차카테고리'].trim()) ? row['1차카테고리'].trim() : null,
                category_2: (row['2차카테고리'] && row['2차카테고리'].trim()) ? row['2차카테고리'].trim() : null,
                image_url: null
              })
              .select('id, barcode, category_1, category_2')
              .single()

            if (productCreateError || !newProduct) {
              errors.push(`제품 생성 실패: ${row.상품명} - ${productCreateError?.message}`)
              continue
            }

            // 새로 생성된 제품을 캐시에 저장
            const newProductData = {
              id: newProduct.id,
              barcode: newProduct.barcode,
              category_1: newProduct.category_1,
              category_2: newProduct.category_2
            }
            productCache.set(row.상품명, newProductData)

            productId = newProduct.id
            productsCreated++
          }

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
          errors.push(`처리 중 오류: ${row.상품명} - ${error.message}`)
        }
      }
    }

    // 위치 정보 배치 UPSERT 처리 (중복 제거)
    if (locationsToUpsert.length > 0) {
      // 같은 키를 가진 위치 정보 중복 제거 (마지막 값으로 덮어쓰기)
      const uniqueLocationsMap = new Map<string, typeof locationsToUpsert[0]>()
      for (const location of locationsToUpsert) {
        const key = `${location.store_id}-${location.product_id}-${location.vending_machine_number}-${location.position_number}`
        uniqueLocationsMap.set(key, location) // 같은 키가 있으면 마지막 값으로 덮어쓰기
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
            onConflict: 'store_id,product_id,vending_machine_number,position_number',
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

