import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { assertStoreActive } from '@/lib/store-active'
import { z } from 'zod'

const createSupplyRequestSchema = z.object({
  store_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.union([z.string().min(1), z.null()]).optional(),
  category: z.string().min(1).max(50),
  photo_url: z.union([z.string().url(), z.null(), z.literal('')]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'staff') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    
    // photo_url이 빈 문자열이면 null로 변환
    if (body.photo_url === '') {
      body.photo_url = null
    }
    
    // description이 빈 문자열이면 null로 변환
    if (body.description === '') {
      body.description = null
    }
    
    const validated = createSupplyRequestSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // 매장 소유권 확인 (사용자가 해당 매장에 배정되어 있는지 확인)
    const { data: storeAssignment, error: assignmentError } = await supabase
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', validated.store_id)
      .single()

    if (assignmentError || !storeAssignment) {
      return NextResponse.json(
        { error: '해당 매장에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    await assertStoreActive(supabase, validated.store_id)

    // 물품 요청 생성
    const insertData: any = {
      store_id: validated.store_id,
      user_id: user.id,
      title: validated.title,
      item_name: validated.title, // 하위 호환성을 위해 item_name도 title과 동일하게 설정
      description: validated.description || null,
      category: validated.category,
      photo_url: validated.photo_url || null,
      status: 'received', // 초기 상태는 '접수'
    }

    const { data: supplyRequest, error: insertError } = await supabase
      .from('supply_requests')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating supply request:', insertError)
      console.error('Insert data:', insertData)
      return NextResponse.json(
        { error: `물품 요청 생성에 실패했습니다: ${insertError.message || insertError.code || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: supplyRequest },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in POST /api/staff/supply-requests:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

