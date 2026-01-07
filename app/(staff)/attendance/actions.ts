'use server'

import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { clockInSchema, clockOutSchema } from '@/zod/schemas'
import { revalidatePath } from 'next/cache'
import { GPSLocation } from '@/types/db'
import { getTodayDateKST, getYesterdayDateKST, calculateWorkDate, getCurrentHourKST } from '@/lib/utils/date'

export interface ServerActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export async function clockInAction(
  store_id: string,
  location: GPSLocation,
  selfie_url?: string,
  attendance_type: 'regular' | 'rescheduled' | 'emergency' = 'regular',
  scheduled_date?: string | null,
  problem_report_id?: string | null,
  change_reason?: string | null
): Promise<ServerActionResponse> {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'staff') {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = clockInSchema.parse({
      store_id,
      location,
      selfie_url,
      attendance_type,
      scheduled_date: scheduled_date || null,
      problem_report_id: problem_report_id || null,
      change_reason: change_reason || null,
    })

    const supabase = await createServerSupabaseClient()
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()

    // 매장 정보 조회 (야간 매장 여부 확인)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, is_night_shift, work_start_hour, work_end_hour')
      .eq('id', validated.store_id)
      .single()

    if (storeError || !store) {
      console.error('Store fetch error:', storeError)
      return { success: false, error: '매장 정보를 찾을 수 없습니다.' }
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
      store_id: validated.store_id,
      is_night_shift: store.is_night_shift,
      work_start_hour: store.work_start_hour,
      work_end_hour: store.work_end_hour,
      current_hour: currentHour,
      calculated_work_date: workDate
    })

    // 출근 중인 매장 확인 - 병렬 처리로 최적화
    const [activeAttendanceResults, existingResults] = await Promise.allSettled([
      // 출근 중인 매장 확인 (work_date, today, yesterday 병렬 조회)
      Promise.allSettled([
        supabase
          .from('attendance')
          .select('id, store_id, clock_out_at, work_date')
          .eq('user_id', user.id)
          .eq('work_date', workDate)
          .is('clock_out_at', null)
          .maybeSingle(),
        supabase
          .from('attendance')
          .select('id, store_id, clock_out_at, work_date')
          .eq('user_id', user.id)
          .eq('work_date', today)
          .is('clock_out_at', null)
          .maybeSingle(),
        supabase
          .from('attendance')
          .select('id, store_id, clock_out_at, work_date')
          .eq('user_id', user.id)
          .eq('work_date', yesterday)
          .is('clock_out_at', null)
          .maybeSingle(),
      ]),
      // 동일 매장의 중복 출근 확인 (work_date, today, yesterday 병렬 조회)
      Promise.allSettled([
        supabase
          .from('attendance')
          .select('id, work_date')
          .eq('user_id', user.id)
          .eq('store_id', validated.store_id)
          .eq('work_date', workDate)
          .maybeSingle(),
        supabase
          .from('attendance')
          .select('id, work_date')
          .eq('user_id', user.id)
          .eq('store_id', validated.store_id)
          .eq('work_date', today)
          .maybeSingle(),
        supabase
          .from('attendance')
          .select('id, work_date')
          .eq('user_id', user.id)
          .eq('store_id', validated.store_id)
          .eq('work_date', yesterday)
          .is('clock_out_at', null)
          .maybeSingle(),
      ]),
    ])

    // 출근 중인 매장 확인 결과 처리
    let activeAttendance: any = null
    if (activeAttendanceResults.status === 'fulfilled') {
      const results = activeAttendanceResults.value
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.data) {
          activeAttendance = result.value
          break
        }
      }
    }

    if (activeAttendance?.data) {
      return { success: false, error: '먼저 관리 중인 매장의 관리완료 처리를 완료해주세요.' }
    }

    // 중복 출근 확인 결과 처리
    let existing: any = null
    if (existingResults.status === 'fulfilled') {
      const results = existingResults.value
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.data) {
          existing = result.value
          break
        }
      }
    }

    if (existing?.data) {
      return { success: false, error: '이미 해당 매장에 출근하셨습니다.' }
    }

    console.log('Clock-in attempt:', {
      user_id: user.id,
      store_id: validated.store_id,
      location: validated.location,
      work_date: workDate,
      is_night_shift: store.is_night_shift,
      work_start_hour: store.work_start_hour,
      current_hour: currentHour,
      attendance_type: validated.attendance_type,
      scheduled_date: validated.scheduled_date,
      problem_report_id: validated.problem_report_id,
    })

    // DECIMAL 타입 호환성을 위해 문자열로 변환
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: user.id,
        store_id: validated.store_id,
        work_date: workDate,
        clock_in_at: new Date().toISOString(),
        clock_in_latitude: validated.location.lat.toString(),
        clock_in_longitude: validated.location.lng.toString(),
        selfie_url: validated.selfie_url || null,
        attendance_type: validated.attendance_type,
        scheduled_date: validated.scheduled_date || null,
        problem_report_id: validated.problem_report_id || null,
        change_reason: validated.change_reason || null,
      })
      .select('id, user_id, store_id, work_date, clock_in_at, clock_in_latitude, clock_in_longitude, clock_out_at, clock_out_latitude, clock_out_longitude, selfie_url, attendance_type, scheduled_date, problem_report_id, change_reason, created_at, updated_at')
      .single()

    if (error) {
      console.error('Clock-in error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return { success: false, error: error.message || '출근 기록 저장 실패' }
    }

    console.log('Clock-in success:', data)

    // 출근 성공 후 체크리스트 자동 생성
    // 매장에 배정된 체크리스트 템플릿을 오늘 날짜로 생성
    // (today 변수는 위에서 이미 정의됨)
    
    try {
      // 1. 해당 매장에 배정된 체크리스트 템플릿 조회
      // 템플릿: assigned_user_id가 null이고, work_date가 '2000-01-01'인 것 (템플릿 날짜)
      console.log('🔍 Checking for template checklists for store:', validated.store_id)
      console.log('🔍 Today:', today)
      console.log('🔍 User ID:', user.id)
      
      const { data: templateChecklists, error: templateError } = await supabase
        .from('checklist')
        .select('*')
        .eq('store_id', validated.store_id)
        .is('assigned_user_id', null)
        .eq('work_date', '2000-01-01') // 템플릿 날짜

      console.log('📋 Template checklists found:', templateChecklists?.length || 0)
      if (templateError) {
        console.error('❌ Template error:', templateError)
      }
      if (templateChecklists && templateChecklists.length > 0) {
        console.log('Template checklist IDs:', templateChecklists.map((t: any) => t.id))
      }

      if (!templateError && templateChecklists && templateChecklists.length > 0) {
        // 2. 계산된 work_date로 이미 생성된 체크리스트 확인
        const { data: existingChecklists } = await supabase
          .from('checklist')
          .select('id, user_id, store_id')
          .eq('store_id', validated.store_id)
          .eq('work_date', workDate) // 계산된 work_date 사용
          .eq('assigned_user_id', user.id)

        const existingTemplateIds = new Set(
          existingChecklists?.map((c: any) => c.user_id + '_' + c.store_id) || []
        )

        // 3. 계산된 work_date로 체크리스트 생성 (템플릿 기반)
        const checklistsToCreate = templateChecklists
          .filter((template: any) => {
            const templateKey = template.user_id + '_' + template.store_id
            return !existingTemplateIds.has(templateKey)
          })
          .map((template: any) => ({
            store_id: template.store_id,
            user_id: template.user_id, // 원본 생성자 (업체 관리자)
            assigned_user_id: user.id, // 출근한 직원에게 배정
            items: template.items,
            note: template.note,
            requires_photos: template.requires_photos || false,
            review_status: 'pending' as const,
            work_date: workDate, // 계산된 work_date 사용 (야간 매장 고려)
          }))

        console.log('📝 Checklists to create:', checklistsToCreate.length)

        if (checklistsToCreate.length > 0) {
          const { data: createdData, error: createError } = await supabase
            .from('checklist')
            .insert(checklistsToCreate)
            .select()

          if (!createError) {
            console.log('✅ Checklists created:', createdData?.length || 0)
            console.log('Created checklist IDs:', createdData?.map((c: any) => c.id))
          } else {
            console.error('❌ Error creating checklists:', createError)
            console.error('Error details:', {
              message: createError.message,
              code: createError.code,
              details: createError.details,
              hint: createError.hint
            })
          }
        } else {
          console.log('ℹ️ All checklists already created for today')
          console.log('Existing checklist keys:', Array.from(existingTemplateIds))
        }
      } else {
        console.log('ℹ️ No template checklists found for store:', validated.store_id)
      }
    } catch (checklistError) {
      // 체크리스트 생성 실패는 출근 성공을 막지 않음
      console.error('❌ Error in checklist creation:', checklistError)
    }

    revalidatePath('/attendance')
    revalidatePath('/mobile-dashboard')
    revalidatePath('/checklist')
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function clockOutAction(
  store_id: string,
  location: GPSLocation
): Promise<ServerActionResponse> {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'staff') {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = clockOutSchema.parse({ store_id, location })

    if (!store_id) {
      return { success: false, error: '매장 ID가 필요합니다.' }
    }

    const supabase = await createServerSupabaseClient()
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()

    // 특정 매장의 출근 기록 찾기 - 병렬 처리로 최적화
    const attendanceResults = await Promise.allSettled([
      // 오늘 날짜로 먼저 검색
      supabase
        .from('attendance')
        .select('id, clock_out_at, store_id, work_date')
        .eq('user_id', user.id)
        .eq('store_id', store_id)
        .eq('work_date', today)
        .is('clock_out_at', null)
        .maybeSingle(),
      // 어제 날짜의 미퇴근 기록 확인 (날짜 경계를 넘는 야간 근무 고려)
      supabase
        .from('attendance')
        .select('id, clock_out_at, store_id, work_date')
        .eq('user_id', user.id)
        .eq('store_id', store_id)
        .eq('work_date', yesterday)
        .is('clock_out_at', null)
        .maybeSingle(),
      // work_date와 관계없이 해당 매장의 미퇴근 기록 확인 (야간 매장 고려)
      supabase
        .from('attendance')
        .select('id, clock_out_at, store_id, work_date')
        .eq('user_id', user.id)
        .eq('store_id', store_id)
        .is('clock_out_at', null)
        .order('clock_in_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    // 결과 중 첫 번째로 찾은 데이터 사용
    let attendance: any = null
    for (const result of attendanceResults) {
      if (result.status === 'fulfilled' && result.value.data) {
        attendance = result.value
        break
      }
    }

    if (attendance.error || !attendance.data) {
      return { success: false, error: '해당 매장의 출근 기록을 찾을 수 없습니다.' }
    }

    if (attendance.data.clock_out_at) {
      return { success: false, error: '이미 해당 매장에서 퇴근하셨습니다.' }
    }

    // 퇴근 전 체크리스트 완료 여부 확인 (출근일 기준으로 조회)
    const checklistWorkDate = attendance.data.work_date
    const { data: checklists, error: checklistError } = await supabase
      .from('checklist')
      .select('id, items')
      .eq('store_id', store_id)
      .eq('work_date', checklistWorkDate)
      .eq('assigned_user_id', user.id)

    if (checklistError) {
      console.error('Error checking checklists:', checklistError)
      return { success: false, error: '체크리스트 확인 중 오류가 발생했습니다.' }
    }

    if (!checklists || checklists.length === 0) {
      // 체크리스트가 없으면 퇴근 가능
      console.log('No checklists found, allowing clock-out')
    } else {
      // calculateChecklistProgress 함수를 사용하여 완료 여부 확인
      const { calculateChecklistProgress } = await import('@/lib/utils/checklist')
      
      const incompleteChecklists = checklists.filter((checklist) => {
        // Checklist 타입으로 타입 단언 (calculateChecklistProgress는 items만 사용)
        const progress = calculateChecklistProgress(checklist as any)
        return progress.percentage !== 100
      })

      if (incompleteChecklists.length > 0) {
        // 모든 체크리스트의 진행률 계산
        let totalItems = 0
        let completedItems = 0
        
        checklists.forEach((checklist) => {
          // Checklist 타입으로 타입 단언 (calculateChecklistProgress는 items만 사용)
          const progress = calculateChecklistProgress(checklist as any)
          totalItems += progress.totalItems
          completedItems += progress.completedItems
        })

        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

        return {
          success: false,
          error: `오늘 체크리스트 미수행 있습니다. 다시 확인해주세요. (${completedItems}/${totalItems} 완료, ${percentage}%)`,
        }
      }
    }

    console.log('Clock-out attempt:', {
      attendance_id: attendance.data.id,
      location: validated.location,
    })

    // DECIMAL 타입 호환성을 위해 문자열로 변환
    const { data, error } = await supabase
      .from('attendance')
      .update({
        clock_out_at: new Date().toISOString(),
        clock_out_latitude: validated.location.lat.toString(),
        clock_out_longitude: validated.location.lng.toString(),
      })
      .eq('id', attendance.data.id)
      .select('id, user_id, store_id, work_date, clock_in_at, clock_in_latitude, clock_in_longitude, clock_out_at, clock_out_latitude, clock_out_longitude, selfie_url, attendance_type, scheduled_date, problem_report_id, change_reason, created_at, updated_at')
      .single()

    if (error) {
      console.error('Clock-out error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return { success: false, error: error.message || '퇴근 기록 저장 실패' }
    }

    console.log('Clock-out success:', data)

    revalidatePath('/attendance')
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

