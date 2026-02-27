import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

/**
 * 직원 앱: 출근 기록 조회
 * RLS 우회를 위해 서비스 역할로 attendance 조회
 * AttendanceContext, ChecklistClient 등에서 사용
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Only staff or business owner (staff mode) can view their attendance')
    }

    const supabase = await createServerSupabaseClient()

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let adminSupabase: ReturnType<typeof createClient> | null = null
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
    const dataClient = adminSupabase || supabase

    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()

    const selectFields = `
      id, user_id, store_id, work_date, clock_in_at, clock_in_latitude, clock_in_longitude,
      clock_out_at, clock_out_latitude, clock_out_longitude, selfie_url, attendance_type,
      scheduled_date, problem_report_id, change_reason, created_at, updated_at,
      stores:store_id ( id, name )
    `

    const [todayResult, yesterdayResult] = await Promise.all([
      dataClient
        .from('attendance')
        .select(selectFields)
        .eq('user_id', user.id)
        .eq('work_date', today)
        .order('clock_in_at', { ascending: false }),
      dataClient
        .from('attendance')
        .select(selectFields)
        .eq('user_id', user.id)
        .eq('work_date', yesterday)
        .order('clock_in_at', { ascending: false })
        .limit(10),
    ])

    const todayData = todayResult.data || []
    const yesterdayData = yesterdayResult.data || []
    const allData = [...todayData, ...yesterdayData]

    // 중복 제거: 같은 id는 하나만 (최신 updated_at 기준)
    const uniqueMap = new Map<string, any>()
    allData.forEach((item: any) => {
      const existing = uniqueMap.get(item.id)
      if (!existing || (item.updated_at && item.updated_at > existing.updated_at)) {
        uniqueMap.set(item.id, item)
      }
    })
    const uniqueData = Array.from(uniqueMap.values()).sort((a, b) => {
      const dateA = new Date(a.clock_in_at).getTime()
      const dateB = new Date(b.clock_in_at).getTime()
      return dateB - dateA
    })

    const data = uniqueData.map((item: any) => {
      const storesData = Array.isArray(item.stores) && item.stores.length > 0 ? item.stores[0] : item.stores
      return {
        id: item.id,
        user_id: item.user_id,
        store_id: item.store_id,
        work_date: item.work_date,
        clock_in_at: item.clock_in_at,
        clock_in_latitude: item.clock_in_latitude,
        clock_in_longitude: item.clock_in_longitude,
        clock_out_at: item.clock_out_at,
        clock_out_latitude: item.clock_out_latitude,
        clock_out_longitude: item.clock_out_longitude,
        selfie_url: item.selfie_url,
        attendance_type: item.attendance_type,
        scheduled_date: item.scheduled_date,
        problem_report_id: item.problem_report_id,
        change_reason: item.change_reason,
        created_at: item.created_at,
        updated_at: item.updated_at,
        stores: storesData ? { name: storesData.name || '' } : undefined,
      }
    })

    return Response.json({
      success: true,
      data,
      error: todayResult.error || yesterdayResult.error ? (todayResult.error || yesterdayResult.error)?.message : null,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
