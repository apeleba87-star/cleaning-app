import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 바코드 정규화 함수 (모든 공백, 특수문자 제거, 숫자만 남기기)
function normalizeBarcode(barcode: string | null | undefined): string | null {
  if (!barcode) return null
  // 모든 공백, 작은따옴표, 큰따옴표, 특수문자 제거하고 숫자만 남기기
  const normalized = barcode.replace(/\s+/g, '').replace(/'/g, '').replace(/"/g, '').replace(/[^\d]/g, '')
  return normalized.length > 0 ? normalized : null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
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
    
    // 필수 컬럼 확인
    const requiredColumns = ['제품명']
    const missingColumns = requiredColumns.filter(col => !headerColumns.includes(col))
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `필수 컬럼이 없습니다: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    // 컬럼 인덱스 찾기
    const getColumnIndex = (name: string) => {
      const index = headerColumns.findIndex(col => col === name || col.toLowerCase() === name.toLowerCase())
      return index >= 0 ? index : -1
    }

    const nameIndex = getColumnIndex('제품명')
    const barcodeIndex = getColumnIndex('바코드')
    const category1Index = getColumnIndex('1차카테고리')
    const category2Index = getColumnIndex('2차카테고리')
    const imageUrlIndex = getColumnIndex('이미지URL')

    // CSV 파싱
    const rows: Array<{
      제품명: string
      바코드?: string
      '1차카테고리'?: string
      '2차카테고리'?: string
      이미지URL?: string
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
      
      if (values.length > nameIndex && values[nameIndex]) {
        rows.push({
          제품명: values[nameIndex].replace(/"/g, ''),
          바코드: barcodeIndex >= 0 && values[barcodeIndex] ? normalizeBarcode(values[barcodeIndex]) || undefined : undefined,
          '1차카테고리': category1Index >= 0 && values[category1Index] ? values[category1Index].replace(/"/g, '').trim() : undefined,
          '2차카테고리': category2Index >= 0 && values[category2Index] ? values[category2Index].replace(/"/g, '').trim() : undefined,
          이미지URL: imageUrlIndex >= 0 && values[imageUrlIndex] ? values[imageUrlIndex].replace(/"/g, '').trim() : undefined
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

    let productsCreated = 0
    let productsUpdated = 0
    const errors: string[] = []

    // 제품 조회 캐싱 (제품명 -> 제품 정보)
    const productCache = new Map<string, { id: string; barcode: string | null; category_1: string | null; category_2: string | null; image_url: string | null }>()

    // 모든 고유 제품명 수집 (배치 조회를 위해)
    const uniqueProductNames = new Set<string>()
    rows.forEach(row => {
      if (row.제품명 && row.제품명.trim()) {
        uniqueProductNames.add(row.제품명.trim())
      }
    })

    // 제품 배치 조회 (최대 1000개씩)
    const productNamesArray = Array.from(uniqueProductNames)
    const BATCH_SIZE = 1000
    for (let i = 0; i < productNamesArray.length; i += BATCH_SIZE) {
      const batch = productNamesArray.slice(i, i + BATCH_SIZE)
      const { data: batchProducts, error: batchError } = await supabase
        .from('products')
        .select('id, name, barcode, category_1, category_2, image_url')
        .in('name', batch)
        .is('deleted_at', null)

      if (batchError) {
        console.error(`제품 배치 조회 오류 (배치 ${i / BATCH_SIZE + 1}):`, batchError)
      } else if (batchProducts) {
        batchProducts.forEach(product => {
          productCache.set(product.name, {
            id: product.id,
            barcode: product.barcode,
            category_1: product.category_1,
            category_2: product.category_2,
            image_url: product.image_url
          })
        })
      }
    }

    console.log(`제품 배치 조회 완료: ${productCache.size}개 제품 캐시됨`)

    // 각 행 처리
    for (const row of rows) {
      try {
        if (!row.제품명 || !row.제품명.trim()) {
          errors.push('제품명이 없는 행을 건너뜁니다.')
          continue
        }

        const productName = row.제품명.trim()
        let existingProduct: { id: string; barcode: string | null; category_1: string | null; category_2: string | null; image_url: string | null } | null = null

        // 캐시에서 확인 (배치 조회로 이미 캐시됨)
        if (productCache.has(productName)) {
          existingProduct = productCache.get(productName)!
        }

        if (existingProduct) {
          // 캐시에서 찾은 기존 제품 업데이트
          // 기존 제품 업데이트 (누락된 정보만 보완)
          const updateData: {
            barcode?: string | null
            category_1?: string | null
            category_2?: string | null
            image_url?: string | null
            updated_at?: string
          } = {}
          
          let needsUpdate = false
          
          // 바코드가 없고 새 파일에 바코드가 있으면 추가
          const normalizedBarcode = normalizeBarcode(row.바코드)
          if (!existingProduct.barcode && normalizedBarcode) {
            // 바코드 중복 확인 (정규화된 값으로)
            const { data: duplicateBarcode } = await supabase
              .from('products')
              .select('id')
              .eq('barcode', normalizedBarcode)
              .neq('id', existingProduct.id)
              .is('deleted_at', null)
              .maybeSingle()

            if (!duplicateBarcode) {
              updateData.barcode = normalizedBarcode
              needsUpdate = true
            } else {
              errors.push(`제품 "${productName}": 바코드 "${normalizedBarcode}"가 이미 사용 중입니다.`)
            }
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
          
          // 이미지 URL 보완
          if (!existingProduct.image_url && row.이미지URL && row.이미지URL.trim()) {
            updateData.image_url = row.이미지URL.trim()
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
              errors.push(`제품 "${productName}" 업데이트 실패: ${updateError.message}`)
            } else {
              productsUpdated++
              // 캐시 업데이트 (업데이트된 정보 반영)
              productCache.set(productName, {
                ...existingProduct,
                ...updateData
              })
            }
          } else {
            productsUpdated++
          }
        } else {
          // 새 제품 생성
          // 바코드 정규화
          const normalizedBarcode = normalizeBarcode(row.바코드)
          
          // 바코드 중복 확인 (정규화된 값으로)
          if (normalizedBarcode) {
            const { data: duplicateBarcode } = await supabase
              .from('products')
              .select('id')
              .eq('barcode', normalizedBarcode)
              .is('deleted_at', null)
              .maybeSingle()

            if (duplicateBarcode) {
              errors.push(`제품 "${productName}": 바코드 "${normalizedBarcode}"가 이미 사용 중입니다.`)
              continue
            }
          }

          // 캐시에 없는 경우 새 제품 생성 (캐시는 배치 조회로 모든 기존 제품을 포함하므로, 캐시에 없으면 정말 없는 제품)
          const { data: newProduct, error: productCreateError } = await supabase
            .from('products')
            .insert({
              name: productName,
              barcode: normalizedBarcode,
              category_1: (row['1차카테고리'] && row['1차카테고리'].trim()) ? row['1차카테고리'].trim() : null,
              category_2: (row['2차카테고리'] && row['2차카테고리'].trim()) ? row['2차카테고리'].trim() : null,
              image_url: (row.이미지URL && row.이미지URL.trim()) ? row.이미지URL.trim() : null
            })
            .select('id, barcode, category_1, category_2, image_url')
            .single()

          if (productCreateError || !newProduct) {
            errors.push(`제품 "${productName}" 생성 실패: ${productCreateError?.message || '알 수 없는 오류'}`)
            continue
          }

          // 새로 생성된 제품을 캐시에 저장
          productCache.set(productName, {
            id: newProduct.id,
            barcode: newProduct.barcode,
            category_1: newProduct.category_1,
            category_2: newProduct.category_2,
            image_url: newProduct.image_url
          })

          productsCreated++
        }
      } catch (error: any) {
        errors.push(`제품 "${row.제품명}" 처리 중 오류: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        productsCreated,
        productsUpdated,
        totalRows: rows.length,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined // 최대 20개만 반환
    })
  } catch (error: any) {
    console.error('Error in POST /api/business/products/master/upload:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '파일 업로드 중 오류가 발생했습니다: ' + error.message 
      },
      { status: 500 }
    )
  }
}





