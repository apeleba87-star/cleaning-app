import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { clockInSchema } from '@/zod/schemas'
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { getTodayDateKST, getYesterdayDateKST, calculateWorkDate, getCurrentHourKST } from '@/lib/utils/date'

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

    // 매장 정보 조회 (야간 매장 여부 확인)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, is_night_shift, work_start_hour, work_end_hour')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      throw new Error(`매장 정보를 찾을 수 없습니다: ${storeError?.message || 'Unknown error'}`)
    }

    // work_date 계산 (야간 매장인 경우 출근 시간에 따라 결정)
    const currentHour = getCurrentHourKST()
    const workDate = calculateWorkDate(
      store.is_night_shift || false,
      store.work_start_hour || 0,
      currentHour,
      store.work_end_hour || 10 // work_end_hour 추가
    )

    console.log('📅 Work date calculation:', {
      store_id,
      is_night_shift: store.is_night_shift,
      work_start_hour: store.work_start_hour,
      current_hour: currentHour,
      calculated_work_date: workDate
    })

    // 하루 1회 가드: 출근 기록 확인
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()
    
    // 출근 중인 매장 확인 (work_date 기준으로 검색)
    let activeAttendance = await supabase
      .from('attendance')
      .select('id, store_id, clock_out_at, work_date')
      .eq('user_id', user.id)
      .eq('work_date', workDate)
      .is('clock_out_at', null)
      .maybeSingle()

    // 없으면 오늘/어제 날짜의 미퇴근 기록도 확인 (야간 근무 고려)
    if (!activeAttendance.data) {
      // 오늘 날짜 확인
      activeAttendance = await supabase
        .from('attendance')
        .select('id, store_id, clock_out_at, work_date')
        .eq('user_id', user.id)
        .eq('work_date', today)
        .is('clock_out_at', null)
        .maybeSingle()
      
      // 없으면 어제 날짜 확인
      if (!activeAttendance.data) {
        activeAttendance = await supabase
          .from('attendance')
          .select('id, store_id, clock_out_at, work_date')
          .eq('user_id', user.id)
          .eq('work_date', yesterday)
          .is('clock_out_at', null)
          .maybeSingle()
      }
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

    // 동일 매장의 중복 출근 확인 (계산된 work_date 기준)
    let existing = await supabase
      .from('attendance')
      .select('id, work_date')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .eq('work_date', workDate)
      .maybeSingle()

    // 없으면 오늘/어제 날짜의 미퇴근 기록도 확인 (야간 근무 고려)
    if (!existing.data) {
      // 오늘 날짜 확인
      existing = await supabase
        .from('attendance')
        .select('id, work_date')
        .eq('user_id', user.id)
        .eq('store_id', store_id)
        .eq('work_date', today)
        .maybeSingle()
      
      // 없으면 어제 날짜 확인
      if (!existing.data) {
        existing = await supabase
          .from('attendance')
          .select('id, work_date')
          .eq('user_id', user.id)
          .eq('store_id', store_id)
          .eq('work_date', yesterday)
          .is('clock_out_at', null)
          .maybeSingle()
      }
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

    // 출근 기록 생성 (계산된 work_date 사용)
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: user.id,
        store_id,
        work_date: workDate, // 야간 매장인 경우 계산된 work_date 사용
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

