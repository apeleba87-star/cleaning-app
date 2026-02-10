import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { clockOutSchema } from '@/zod/schemas'
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { assertStoreActive } from '@/lib/store-active'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'staff' && user.role !== 'subcontract_individual' && user.role !== 'subcontract_company') {
      throw new ForbiddenError('Only staff or subcontract users can clock out')
    }

    const body = await request.json()
    const validated = clockOutSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid input', validated.error.flatten())
    }

    const { store_id, location } = validated.data
    const supabase = await createServerSupabaseClient()
    await assertStoreActive(supabase, store_id)

    // 특정 매장의 출근 기록 찾기 (오늘 날짜로 먼저 검색)
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()
    
    // 오늘 날짜로 먼저 검색
    let attendance = await supabase
      .from('attendance')
      .select('id, clock_out_at, store_id, work_date')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .eq('work_date', today)
      .is('clock_out_at', null) // 미퇴근 기록만
      .maybeSingle()

    // 없으면 어제 날짜의 미퇴근 기록 확인 (날짜 경계를 넘는 야간 근무 고려)
    if (!attendance.data) {
      attendance = await supabase
        .from('attendance')
        .select('id, clock_out_at, store_id, work_date')
        .eq('user_id', user.id)
        .eq('store_id', store_id)
        .eq('work_date', yesterday)
        .is('clock_out_at', null) // 미퇴근 기록만
        .maybeSingle()
    }
    
    // 여전히 없으면 work_date와 관계없이 해당 매장의 미퇴근 기록 확인 (야간 매장 고려)
    if (!attendance.data) {
      attendance = await supabase
        .from('attendance')
        .select('id, clock_out_at, store_id, work_date')
        .eq('user_id', user.id)
        .eq('store_id', store_id)
        .is('clock_out_at', null) // 미퇴근 기록만
        .order('clock_in_at', { ascending: false }) // 최신 출근 기록 우선
        .limit(1)
        .maybeSingle()
    }

    if (attendance.error || !attendance.data) {
      throw new NotFoundError('해당 매장의 출근 기록을 찾을 수 없습니다.')
    }

    if (attendance.data.clock_out_at) {
      return Response.json(
        {
          error: 'AlreadyClockedOut',
          message: 'Already clocked out today',
          statusCode: 409,
        },
        { status: 409 }
      )
    }

    // 퇴근 기록 업데이트 (DECIMAL 타입 호환성을 위해 문자열로 변환)
    const { data, error } = await supabase
      .from('attendance')
      .update({
        clock_out_at: new Date().toISOString(),
        clock_out_latitude: location.lat.toString(),
        clock_out_longitude: location.lng.toString(),
      })
      .eq('id', attendance.data.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update attendance: ${error.message}`)
    }

    return Response.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

