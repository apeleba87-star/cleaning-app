import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { clockOutSchema } from '@/zod/schemas'
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { getTodayDateKST } from '@/lib/utils/date'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'staff') {
      throw new ForbiddenError('Only staff can clock out')
    }

    const body = await request.json()
    const validated = clockOutSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid input', validated.error.flatten())
    }

    const { store_id, location } = validated.data
    const supabase = await createServerSupabaseClient()

    // 특정 매장의 오늘 출근 기록 찾기
    const today = getTodayDateKST()
    const { data: attendance, error: findError } = await supabase
      .from('attendance')
      .select('id, clock_out_at, store_id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .eq('work_date', today)
      .maybeSingle()

    if (findError || !attendance) {
      throw new NotFoundError('해당 매장의 출근 기록을 찾을 수 없습니다.')
    }

    if (attendance.clock_out_at) {
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
      .eq('id', attendance.id)
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

