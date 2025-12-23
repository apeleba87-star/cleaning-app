import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { clockInSchema } from '@/zod/schemas'
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'staff') {
      throw new ForbiddenError('Only staff can clock in')
    }

    const body = await request.json()
    const validated = clockInSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid input', validated.error.flatten())
    }

    const { store_id, location, selfie_url, attendance_type, scheduled_date, problem_report_id, change_reason } = validated.data
    const supabase = await createServerSupabaseClient()

    // 하루 1회 가드: 오늘 출근 기록 확인
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()
    
    // 오늘 날짜에 출근 중인 매장이 있는지 확인 (퇴근하지 않은 매장)
    let activeAttendance = await supabase
      .from('attendance')
      .select('id, store_id, clock_out_at')
      .eq('user_id', user.id)
      .eq('work_date', today)
      .is('clock_out_at', null)
      .maybeSingle()

    // 없으면 어제 날짜의 미퇴근 기록도 확인 (날짜 경계를 넘는 야간 근무 고려)
    if (!activeAttendance.data) {
      activeAttendance = await supabase
        .from('attendance')
        .select('id, store_id, clock_out_at')
        .eq('user_id', user.id)
        .eq('work_date', yesterday)
        .is('clock_out_at', null)
        .maybeSingle()
    }

    if (activeAttendance.data) {
      return Response.json(
        {
          error: 'AlreadyClockedIn',
          message: '먼저 출근 중인 매장의 퇴근 처리를 완료해주세요.',
          statusCode: 409,
        },
        { status: 409 }
      )
    }

    // 동일 매장의 중복 출근 확인 (오늘 날짜)
    let existing = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .eq('work_date', today)
      .maybeSingle()

    // 없으면 어제 날짜의 미퇴근 기록도 확인 (날짜 경계를 넘는 야간 근무 고려)
    if (!existing.data) {
      existing = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', store_id)
        .eq('work_date', yesterday)
        .is('clock_out_at', null)
        .maybeSingle()
    }

    if (existing.data) {
      return Response.json(
        {
          error: 'AlreadyClockedIn',
          message: '이미 해당 매장에 출근하셨습니다.',
          statusCode: 409,
        },
        { status: 409 }
      )
    }

    // 출근 기록 생성 (DECIMAL 타입 호환성을 위해 문자열로 변환)
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: user.id,
        store_id,
        work_date: today,
        clock_in_at: new Date().toISOString(),
        clock_in_latitude: location.lat.toString(),
        clock_in_longitude: location.lng.toString(),
        selfie_url: selfie_url || null,
        attendance_type: attendance_type || 'regular',
        scheduled_date: scheduled_date || null,
        problem_report_id: problem_report_id || null,
        change_reason: change_reason || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create attendance: ${error.message}`)
    }

    return Response.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}

