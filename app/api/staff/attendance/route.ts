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

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company']
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Only staff can view their attendance')
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

    const [todayResult, yesterdayResult] = await Promise.all([
      dataClient
        .from('attendance')
        .select('id, user_id, store_id, work_date, clock_in_at, clock_in_latitude, clock_in_longitude, clock_out_at, clock_out_latitude, clock_out_longitude, selfie_url, attendance_type, scheduled_date, problem_report_id, change_reason, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('work_date', today),
      dataClient
        .from('attendance')
        .select('id, user_id, store_id, work_date, clock_in_at, clock_in_latitude, clock_in_longitude, clock_out_at, clock_out_latitude, clock_out_longitude, selfie_url, attendance_type, scheduled_date, problem_report_id, change_reason, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('work_date', yesterday)
        .is('clock_out_at', null)
        .order('clock_in_at', { ascending: false })
        .limit(20),
    ])

    const todayData = todayResult.data || []
    const yesterdayData = yesterdayResult.data || []
    const allData = [...todayData, ...yesterdayData].sort((a, b) => {
      const dateA = new Date(a.clock_in_at).getTime()
      const dateB = new Date(b.clock_in_at).getTime()
      return dateB - dateA
    })

    return Response.json({
      success: true,
      data: allData,
      error: todayResult.error || yesterdayResult.error ? (todayResult.error || yesterdayResult.error)?.message : null,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
