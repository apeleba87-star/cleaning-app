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
    const expectedColumns = ['회사명', '지점명', '하드웨어명', '1차카테고리', '2차카테고리', '상품명', '재고', '위치']
    const headerColumns = header.split(',').map(col => col.replace(/"/g, '').trim())
    
    // CSV 파싱
    const rows: Array<{
      회사명: string
      지점명: string
      하드웨어명: string
      '1차카테고리': string
      '2차카테고리': string
      상품명: string
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

    if (rows.length === 0) {
      return NextResponse.json(
        { error: '파싱된 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 매장 목록 조회
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name')
      .is('deleted_at', null)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json(
        { error: '매장 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 매장명 매핑 조회 (최신 데이터 가져오기)
    const { data: mappings, error: mappingsError } = await supabase
      .from('store_name_mappings')
      .select('system_store_id, original_store_name, hardware_name_pattern')
      .eq('is_active', true)
    
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

    // 지점명별로 그룹화
    const storeGroups = new Map<string, typeof rows>()
    rows.forEach(row => {
      const storeName = row.지점명
      if (!storeGroups.has(storeName)) {
        storeGroups.set(storeName, [])
      }
      storeGroups.get(storeName)!.push(row)
    })

    // 각 매장별로 처리
    for (const [storeName, storeRows] of Array.from(storeGroups.entries())) {
      // 매장 ID 찾기
      let storeId: string | null = null
      
      // 정확히 일치하는 매장 찾기
      const exactMatch = stores?.find(s => s.name === storeName)
      if (exactMatch) {
        storeId = exactMatch.id
      } else {
        // 매핑 테이블에서 찾기
        storeMappingMap.forEach((mappedStoreId, key) => {
          if (key.startsWith(storeName)) {
            storeId = mappedStoreId
          }
        })
      }

      if (!storeId) {
        errors.push(`매장을 찾을 수 없습니다: ${storeName}`)
        continue
      }

      // 각 행 처리
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

          // 제품 찾기 또는 생성 (바코드가 없으므로 상품명으로 찾기)
          let productId: string | null = null

          // 상품명으로 제품 찾기
          const { data: existingProduct, error: productSearchError } = await supabase
            .from('products')
            .select('id')
            .eq('name', row.상품명)
            .is('deleted_at', null)
            .single()

          if (existingProduct) {
            productId = existingProduct.id
            productsUpdated++
          } else {
            // 제품 생성
            const { data: newProduct, error: productCreateError } = await supabase
              .from('products')
              .insert({
                name: row.상품명,
                barcode: null, // 바코드는 나중에 등록
                category_1: row['1차카테고리'],
                category_2: row['2차카테고리'],
                image_url: null
              })
              .select('id')
              .single()

            if (productCreateError || !newProduct) {
              errors.push(`제품 생성 실패: ${row.상품명} - ${productCreateError?.message}`)
              continue
            }

            productId = newProduct.id
            productsCreated++
          }

          // 위치 정보 저장 또는 업데이트 (위치 기반 - product_id 무시)
          // 같은 위치(매장 + 자판기 + 위치번호)에 다른 제품이 있으면 교체
          const { data: existingLocation, error: locationSearchError } = await supabase
            .from('store_product_locations')
            .select('id, product_id')
            .eq('store_id', storeId)
            .eq('vending_machine_number', vendingMachineNumber)
            .eq('position_number', positionNumber)
            .maybeSingle()

          if (existingLocation) {
            // 같은 위치에 기존 데이터가 있음
            if (existingLocation.product_id === productId) {
              // 같은 제품이면 재고만 업데이트
              const { error: updateError } = await supabase
                .from('store_product_locations')
                .update({
                  stock_quantity: row.재고,
                  is_available: row.재고 > 0,
                  last_updated_at: new Date().toISOString()
                })
                .eq('id', existingLocation.id)

              if (updateError) {
                console.error('Location update error:', {
                  locationId: existingLocation.id,
                  productId,
                  error: updateError
                })
                errors.push(`위치 업데이트 실패: ${row.상품명} - ${updateError.message} (코드: ${updateError.code})`)
              } else {
                locationsUpdated++
              }
            } else {
              // 다른 제품이면 제품 ID와 재고 모두 업데이트 (위치 교체)
              const { error: updateError } = await supabase
                .from('store_product_locations')
                .update({
                  product_id: productId,
                  stock_quantity: row.재고,
                  is_available: row.재고 > 0,
                  last_updated_at: new Date().toISOString()
                })
                .eq('id', existingLocation.id)

              if (updateError) {
                console.error('Location replace error:', {
                  locationId: existingLocation.id,
                  oldProductId: existingLocation.product_id,
                  newProductId: productId,
                  error: updateError
                })
                errors.push(`위치 교체 실패: ${row.상품명} - ${updateError.message} (코드: ${updateError.code})`)
              } else {
                locationsUpdated++
              }
            }
          } else {
            // 같은 위치에 데이터가 없으면 새로 생성
            const { error: insertError } = await supabase
              .from('store_product_locations')
              .insert({
                store_id: storeId,
                product_id: productId,
                vending_machine_number: vendingMachineNumber,
                position_number: positionNumber,
                stock_quantity: row.재고,
                is_available: row.재고 > 0
              })

            if (insertError) {
              console.error('Location insert error:', {
                storeId,
                productId,
                vendingMachineNumber,
                positionNumber,
                error: insertError
              })
              errors.push(`위치 생성 실패: ${row.상품명} - ${insertError.message} (코드: ${insertError.code})`)
            } else {
              locationsCreated++
            }
          }
        } catch (error: any) {
          errors.push(`처리 중 오류: ${row.상품명} - ${error.message}`)
        }
      }
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

