import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 매장명 매핑 저장
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { mappings } = body

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: '매핑 정보가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const results = []
    const errors = []

    for (const mapping of mappings) {
      const { originalStoreName, hardwareName, systemStoreId, saveMapping } = mapping

      if (!systemStoreId || !originalStoreName) {
        errors.push(`필수 정보가 없습니다: ${originalStoreName}`)
        continue
      }

      // 매핑 저장 요청인 경우
      if (saveMapping) {
        // 업체관리자인 경우 매장 소유권 검증
        if (user.role === 'business_owner' && user.company_id) {
          const { data: storeCheck, error: storeCheckError } = await supabase
            .from('stores')
            .select('company_id')
            .eq('id', systemStoreId)
            .single()

          if (storeCheckError || !storeCheck || storeCheck.company_id !== user.company_id) {
            errors.push(`권한이 없는 매장입니다: ${originalStoreName}`)
            continue
          }
        }

        console.log(`Attempting to save mapping: ${originalStoreName} -> ${systemStoreId}`)
        const { data: insertData, error: insertError } = await supabase
          .from('store_name_mappings')
          .upsert({
            system_store_id: systemStoreId,
            original_store_name: originalStoreName,
            hardware_name_pattern: hardwareName || null,
            is_active: true
          }, {
            onConflict: 'system_store_id,original_store_name'
          })
          .select()

        if (insertError) {
          console.error(`Mapping save error for ${originalStoreName}:`, insertError)
          errors.push(`매핑 저장 실패: ${originalStoreName} - ${insertError.message} (code: ${insertError.code})`)
        } else {
          console.log(`Mapping saved successfully: ${originalStoreName} -> ${systemStoreId}`, insertData)
          results.push({ originalStoreName, systemStoreId, saved: true })
        }
      } else {
        results.push({ originalStoreName, systemStoreId, saved: false })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors
    })
  } catch (error: any) {
    console.error('Error in POST /api/business/products/mapping:', error)
    return NextResponse.json(
      { error: '매핑 저장 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    )
  }
}

