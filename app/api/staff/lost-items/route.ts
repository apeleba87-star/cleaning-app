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
      throw new UnauthorizedError('Only staff can create lost items')
    }

    const body = await request.json()
    const {
      store_id,
      type,
      description,
      photo_url,
      storage_location,
    } = body

    if (!store_id || !type || !photo_url || !storage_location) {
      return NextResponse.json(
        { error: 'store_id, type, photo_url, and storage_location are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 기존 데이터에서 type 값 확인
    const { data: existingData } = await supabase
      .from('lost_items')
      .select('type, id')
      .limit(5)

    console.log('Existing type values in lost_items:', existingData)

    // type이 제약 조건을 만족하는지 확인
    // 만약 한국어 카테고리 이름이면, description에 포함시키고 type은 고정값 사용
    let finalType = type
    let finalDescription = description

    // 한국어 카테고리인 경우 description에 포함
    if (type && ['신분증 습득', '신용카드 습득', '기타 물건 습득'].includes(type)) {
      // description에 카테고리 정보 추가
      const categoryInfo = `[카테고리: ${type}]`
      finalDescription = description 
        ? `${categoryInfo}\n${description}`
        : categoryInfo
      
      // type은 'other' 또는 기존에 사용되는 값으로 설정
      if (existingData && existingData.length > 0) {
        const existingTypes = [...new Set(existingData.map((d: any) => d.type))]
        console.log('Unique type values found:', existingTypes)
        // 기존에 사용되는 첫 번째 타입 사용하거나, 없으면 'other' 사용
        finalType = existingTypes.length > 0 ? existingTypes[0] : 'other'
      } else {
        finalType = 'other'
      }
    }

    const insertData: any = {
      store_id,
      user_id: user.id,
      type: finalType,
      description: finalDescription || null,
      photo_url: photo_url,
      storage_location: storage_location,
      status: 'submitted',
    }

    console.log('Attempting to insert lost item with data:', JSON.stringify(insertData, null, 2))
    console.log(`Type: ${finalType} (original: ${type})`)

    const { data, error } = await supabase
      .from('lost_items')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting lost item:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { error: `Failed to create lost item: ${error.message}. Details: ${error.details || 'No details'}. Hint: ${error.hint || 'No hint'}` },
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

