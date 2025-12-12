import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'staff') {
      throw new UnauthorizedError('Only staff can create problem reports')
    }

    const body = await request.json()
    const {
      store_id,
      category,
      title,
      description,
      photo_url,
      vending_machine_number,
      product_number,
      storage_location,
    } = body

    if (!store_id || !category || !title) {
      return NextResponse.json(
        { error: 'store_id, category, and title are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 먼저 데이터베이스에 실제로 저장된 category 값들을 확인
    const { data: existingCategories, error: categoryError } = await supabase
      .from('problem_reports')
      .select('category')
      .limit(100)

    const uniqueCategories = existingCategories 
      ? [...new Set(existingCategories.map((c: any) => c.category))].filter(Boolean)
      : []

    console.log(`\n=== Category Mapping Debug ===`)
    console.log(`Received category: "${category}" (type: ${typeof category})`)
    console.log(`Received title: "${title}"`)
    console.log(`Existing categories in DB:`, uniqueCategories)

    // 한국어 카테고리 값을 데이터베이스 enum 값으로 매핑
    let finalCategory: string | null = null
    
    // 매장 문제 카테고리들
    const storeProblemCategories = [
      '자판기 고장/사출 관련',
      '제품 관련',
      '무인택배함 관련',
      '매장 시설/환경 관련',
      '매장 시설/환경',
      '기타'
    ]
    
    // 자판기 내부 문제 카테고리들
    const vendingMachineCategories = [
      '자판기 수량 오류',
      '자판기 제품 걸림 문제'
    ]
    
    // title에서도 확인 (자판기 내부 문제는 title에 "자판기 수량" 또는 "자판기 제품 걸림" 포함)
    const titleLower = (title || '').toLowerCase()
    const isVendingFromTitle = titleLower.includes('자판기 수량') || titleLower.includes('자판기 제품 걸림')
    
    // 기존 데이터에서 사용된 category 값이 있으면 그것을 우선 사용
    if (uniqueCategories.length > 0) {
      // 자판기 내부 문제인 경우
      if (vendingMachineCategories.includes(category) || isVendingFromTitle) {
        // 기존에 'vending_machine' 또는 유사한 값이 있는지 확인
        const vendingMatch = uniqueCategories.find((c: string) => 
          c.toLowerCase().includes('vending') || c.toLowerCase().includes('machine')
        )
        if (vendingMatch) {
          finalCategory = vendingMatch
          console.log(`Using existing vending category: "${finalCategory}"`)
        } else {
          // 기존 값이 없으면 'vending_machine' 시도
          finalCategory = 'vending_machine'
          console.log(`Using default vending_machine`)
        }
      } else {
        // 매장 문제인 경우
        if (storeProblemCategories.includes(category)) {
          // 기존에 'store_problem' 또는 유사한 값이 있는지 확인
          const storeMatch = uniqueCategories.find((c: string) => 
            c.toLowerCase().includes('store') || c.toLowerCase().includes('problem')
          )
          if (storeMatch) {
            finalCategory = storeMatch
            console.log(`Using existing store category: "${finalCategory}"`)
          } else {
            // 기존 값이 없으면 'store_problem' 시도
            finalCategory = 'store_problem'
            console.log(`Using default store_problem`)
          }
        } else {
          // 기본적으로 매장 문제로 처리
          const storeMatch = uniqueCategories.find((c: string) => 
            c.toLowerCase().includes('store') || c.toLowerCase().includes('problem')
          )
          finalCategory = storeMatch || 'store_problem'
          console.log(`Using default: "${finalCategory}"`)
        }
      }
    } else {
      // 기존 데이터가 없으면 기본값 사용
      if (vendingMachineCategories.includes(category) || isVendingFromTitle) {
        finalCategory = 'vending_machine'
      } else {
        finalCategory = 'store_problem'
      }
      console.log(`No existing data, using default: "${finalCategory}"`)
    }
    
    console.log(`Final category: "${finalCategory}"`)
    console.log(`=== End Category Mapping ===\n`)

    if (!finalCategory) {
      return NextResponse.json(
        { error: 'Failed to determine category value' },
        { status: 400 }
      )
    }

    const insertData: any = {
      store_id,
      user_id: user.id,
      category: finalCategory,
      title,
      description: description || null,
      status: 'submitted',
    }

    if (photo_url) {
      insertData.photo_url = photo_url
    }

    if (vending_machine_number !== undefined) {
      insertData.vending_machine_number = vending_machine_number
    }

    if (product_number) {
      insertData.product_number = product_number
    }

    if (storage_location) {
      insertData.storage_location = storage_location
    }

    console.log('Attempting to insert with data:', JSON.stringify(insertData, null, 2))

    const { data, error } = await supabase
      .from('problem_reports')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting problem report:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { error: `Failed to create problem report: ${error.message}. Details: ${error.details || 'No details'}. Hint: ${error.hint || 'No hint'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

