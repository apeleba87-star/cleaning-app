import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

/**
 * 직원 앱: 배정된 매장 목록 조회
 * RLS 우회를 위해 서비스 역할로 store_assign, stores 조회
 *
 * Query params:
 * - include_attendance=1: 각 매장에 출근 상태 포함 (mobile-dashboard용)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Only staff or business owner (staff mode) can view assigned stores')
    }

    const searchParams = request.nextUrl.searchParams
    const includeAttendance = searchParams.get('include_attendance') === '1'

    const supabase = await createServerSupabaseClient()

    // RLS 우회: 서비스 역할로 store_assign, stores 조회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let adminSupabase: ReturnType<typeof createClient> | null = null
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
    const dataClient = adminSupabase || supabase

    const { data: storeAssignments, error: assignError } = await dataClient
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)

    if (assignError) {
      throw new Error(`Failed to fetch store assignments: ${assignError.message}`)
    }

    const storeIds = storeAssignments?.map((a) => a.store_id) || []
    if (storeIds.length === 0) {
      return Response.json({ success: true, data: [], role: user.role })
    }

    const { data: stores, error: storesError } = await dataClient
      .from('stores')
      .select('id, name, company_id, management_days, is_night_shift, work_start_hour, work_end_hour, service_active')
      .in('id', storeIds)
      .is('deleted_at', null)

    if (storesError) {
      throw new Error(`Failed to fetch stores: ${storesError.message}`)
    }

    if (!stores || stores.length === 0) {
      return Response.json({ success: true, data: [], role: user.role })
    }

    // service_active가 false인 매장 제외
    const activeStores = stores.filter((s) => s.service_active !== false)

    if (!includeAttendance) {
      return Response.json({
        success: true,
        data: activeStores,
        role: user.role,
      })
    }

    // include_attendance: 출근 상태 병합
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()

    const { data: todayAttendance } = await dataClient
      .from('attendance')
      .select('store_id, clock_out_at, work_date, attendance_type')
      .eq('user_id', user.id)
      .eq('work_date', today)

    const { data: yesterdayAttendance } = await dataClient
      .from('attendance')
      .select('store_id, clock_out_at, work_date, attendance_type')
      .eq('user_id', user.id)
      .eq('work_date', yesterday)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(10)

    const attendanceMap = new Map<string, { status: 'clocked_in' | 'clocked_out'; workDate: string; attendanceType: string | null }>()
    todayAttendance?.forEach((a: any) => {
      const status = a.clock_out_at ? 'clocked_out' : 'clocked_in'
      attendanceMap.set(a.store_id, { status, workDate: a.work_date, attendanceType: a.attendance_type || null })
    })
    yesterdayAttendance?.forEach((a: any) => {
      if (!attendanceMap.has(a.store_id)) {
        attendanceMap.set(a.store_id, { status: 'clocked_in', workDate: a.work_date, attendanceType: a.attendance_type || null })
      }
    })

    const dataWithAttendance = activeStores.map((store) => {
      const att = attendanceMap.get(store.id)
      const attendanceStatus = att ? att.status : ('not_clocked_in' as const)
      const attendanceWorkDate = att?.workDate ?? null
      const attendanceType = att?.attendanceType ?? null

      return {
        ...store,
        attendanceStatus,
        attendanceWorkDate,
        attendanceType,
      }
    })

    return Response.json({
      success: true,
      data: dataWithAttendance,
      role: user.role,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
