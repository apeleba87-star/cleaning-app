import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { z } from 'zod'

const completeSchema = z.object({
  completion_photo_url: z.string().min(1, '처리 완료 사진은 필수입니다.'),
  completion_description: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'store_owner' && user.role !== 'store_manager') {
      throw new ForbiddenError('Only store owners/managers can complete supply requests')
    }

    const body = await request.json()
    const validated = completeSchema.parse(body)

    const supabase = await createServerSupabaseClient()
    const requestId = params.id

    // store_manager의 경우 store_assign 테이블에서 매장 조회
    let storeIds: string[] = []
    if (user.role === 'store_manager') {
      const { data: storeAssigns, error: storeAssignError } = await supabase
        .from('store_assign')
        .select('store_id')
        .eq('user_id', user.id)

      if (storeAssignError) {
        console.error('Error fetching store assignments:', storeAssignError)
        return NextResponse.json(
          { error: '매장 배정 정보를 불러올 수 없습니다.' },
          { status: 500 }
        )
      }

      storeIds = storeAssigns?.map(sa => sa.store_id) || []
      if (storeIds.length === 0) {
        return NextResponse.json(
          { error: '배정된 매장이 없습니다.' },
          { status: 403 }
        )
      }
    } else if (user.role === 'store_owner') {
      // store_owner의 경우 users 테이블에서 store_id 조회
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('store_id')
        .eq('id', user.id)
        .single()

      if (userError || !userData || !userData.store_id) {
        return NextResponse.json(
          { error: '매장 정보를 불러올 수 없습니다.' },
          { status: 403 }
        )
      }

      storeIds = [userData.store_id]
    } else {
      throw new ForbiddenError('Store ID is required')
    }

    // 요청 존재 확인 및 권한 확인 (점주의 매장 요청인지 확인)
    const { data: supplyRequest, error: fetchError } = await supabase
      .from('supply_requests')
      .select('*')
      .eq('id', requestId)
      .in('store_id', storeIds)
      .single()

    if (fetchError || !supplyRequest) {
      return NextResponse.json(
        { error: '물품 요청을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 점주 처리중 상태만 완료 가능
    if (supplyRequest.status !== 'manager_in_progress') {
      return NextResponse.json(
        { error: '점주 처리중인 요청만 완료할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 상태를 'completed'로 변경
    const { error: updateError } = await supabase
      .from('supply_requests')
      .update({ 
        status: 'completed',
        completion_photo_url: validated.completion_photo_url,
        completion_description: validated.completion_description || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating supply request:', updateError)
      return NextResponse.json(
        { error: '물품 요청 완료 처리에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
}

