import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  photo_url: z.string().nullable().optional(),
  original_updated_at: z.string(), // 충돌 감지용
})

// 점주가 접수 중인 요청 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'store_owner' && user.role !== 'store_manager') {
      throw new ForbiddenError('Only store owners/managers can update supply requests')
    }

    const body = await request.json()
    const validated = updateSchema.parse(body)
    const requestId = params.id

    const supabase = await createServerSupabaseClient()

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

    // 현재 요청 상태 확인
    const { data: currentRequest, error: fetchError } = await supabase
      .from('supply_requests')
      .select('*')
      .eq('id', requestId)
      .in('store_id', storeIds)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: '물품 요청을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 접수 상태만 수정 가능
    if (currentRequest.status !== 'received') {
      return NextResponse.json(
        {
          error: '접수 상태인 요청만 수정할 수 있습니다.',
          currentStatus: currentRequest.status,
          conflict: true
        },
        { status: 409 }
      )
    }

    // 동시성 제어: updated_at 기반 충돌 감지
    if (currentRequest.updated_at !== validated.original_updated_at) {
      // 최신 데이터 다시 조회
      const { data: latestRequest } = await supabase
        .from('supply_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      return NextResponse.json(
        {
          error: '다른 사용자가 요청을 수정했습니다. 최신 정보를 확인해주세요.',
          currentStatus: latestRequest?.status,
          conflict: true,
          latestData: latestRequest
        },
        { status: 409 }
      )
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.category !== undefined) updateData.category = validated.category
    if (validated.photo_url !== undefined) updateData.photo_url = validated.photo_url

    // 조건부 업데이트 (원자적 연산)
    const { data: updatedRequest, error: updateError } = await supabase
      .from('supply_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('status', 'received') // 상태가 여전히 'received'인지 확인
      .eq('updated_at', validated.original_updated_at) // 버전 확인
      .select()
      .single()

    if (updateError || !updatedRequest) {
      // 충돌 발생 - 최신 데이터 다시 조회
      const { data: latestRequest } = await supabase
        .from('supply_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      return NextResponse.json(
        {
          error: '요청 상태가 변경되어 수정할 수 없습니다. 최신 정보를 확인해주세요.',
          currentStatus: latestRequest?.status,
          conflict: true,
          latestData: latestRequest
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, data: updatedRequest })
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

// 점주가 접수 중인 요청 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'store_owner' && user.role !== 'store_manager') {
      throw new ForbiddenError('Only store owners/managers can cancel supply requests')
    }

    const requestId = params.id
    const supabase = await createServerSupabaseClient()

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

    // 현재 요청 상태 확인
    const { data: currentRequest, error: fetchError } = await supabase
      .from('supply_requests')
      .select('*')
      .eq('id', requestId)
      .in('store_id', storeIds)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: '물품 요청을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 접수 상태만 취소 가능
    if (currentRequest.status !== 'received') {
      return NextResponse.json(
        {
          error: '접수 상태인 요청만 취소할 수 있습니다.',
          currentStatus: currentRequest.status,
          conflict: true
        },
        { status: 409 }
      )
    }

    // 조건부 삭제 (원자적 연산)
    const { error: deleteError } = await supabase
      .from('supply_requests')
      .delete()
      .eq('id', requestId)
      .eq('status', 'received') // 상태가 여전히 'received'인지 확인

    if (deleteError) {
      console.error('Error deleting supply request:', deleteError)
      return NextResponse.json(
        { error: '요청 취소에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 삭제된 행이 없는 경우 (이미 상태가 변경됨)
    // Supabase는 삭제된 행 수를 반환하지 않으므로, 다시 조회하여 확인
    const { data: checkRequest } = await supabase
      .from('supply_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (checkRequest) {
      return NextResponse.json(
        {
          error: '요청 상태가 변경되어 취소할 수 없습니다.',
          currentStatus: checkRequest.status,
          conflict: true
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return handleApiError(error)
  }
}
