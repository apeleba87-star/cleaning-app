import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'
import { calculateChecklistProgress } from '@/lib/utils/checklist'

/**
 * 직원 앱: 체크리스트 진행률 및 미완료 건수 조회
 * RLS 우회를 위해 서비스 역할 사용
 * mobile-dashboard에서 사용
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Only staff or business owner (staff mode) can view checklist progress')
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

    // 출근 중인 매장 및 work_date 조회
    const { data: attendances } = await dataClient
      .from('attendance')
      .select('store_id, work_date')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .or(`work_date.eq.${today},work_date.eq.${yesterday}`)

    const clockedInStores: { storeId: string; workDate: string }[] = []
    if (attendances) {
      attendances.forEach((att: any) => {
        clockedInStores.push({
          storeId: att.store_id,
          workDate: att.work_date,
        })
      })
    }

    const progress: Record<string, { completed: number; total: number; percentage: number }> = {}
    const incompleteChecklists: Record<string, number> = {}
    const incompleteRequests: Record<string, number> = {}

    if (clockedInStores.length === 0) {
      return Response.json({
        success: true,
        data: { progress, incompleteChecklists, incompleteRequests },
      })
    }

    for (const { storeId, workDate } of clockedInStores) {
      const [checklistsResult, requestsResult] = await Promise.all([
        dataClient
          .from('checklist')
          .select('id, store_id, items')
          .eq('store_id', storeId)
          .eq('work_date', workDate)
          .eq('assigned_user_id', user.id),
        dataClient
          .from('requests')
          .select('id')
          .eq('store_id', storeId)
          .eq('status', 'in_progress'),
      ])

      const checklists = checklistsResult.data || []
      let totalCompleted = 0
      let totalItems = 0
      let incompleteCount = 0

      checklists.forEach((checklist: any) => {
        const p = calculateChecklistProgress(checklist)
        totalCompleted += p.completedItems
        totalItems += p.totalItems
        if (p.totalItems > 0 && p.percentage < 100) {
          incompleteCount++
        }
      })

      const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
      progress[storeId] = { completed: totalCompleted, total: totalItems, percentage }
      incompleteChecklists[storeId] = incompleteCount
      incompleteRequests[storeId] = requestsResult.data?.length || 0
    }

    return Response.json({
      success: true,
      data: { progress, incompleteChecklists, incompleteRequests },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
