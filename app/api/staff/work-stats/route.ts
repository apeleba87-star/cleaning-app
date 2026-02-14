import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'
import { calculateChecklistProgress } from '@/lib/utils/checklist'

/**
 * 직원 앱: 오늘 업무 통계 + 최근 1주일 업무 통계
 * RLS 우회를 위해 서비스 역할 사용
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) throw new UnauthorizedError('Authentication required')

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company']
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Only staff can view work stats')
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient =
      serviceRoleKey && supabaseUrl
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase

    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()

    const { data: storeAssignments } = await dataClient
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)

    const storeIds = [...new Set(storeAssignments?.map((a: any) => a.store_id) || [])]
    if (storeIds.length === 0) {
      return Response.json({
        success: true,
        data: { todayStats: [], weeklyStats: [] },
      })
    }

    const { data: stores } = await dataClient
      .from('stores')
      .select('id, name')
      .in('id', storeIds)

    const storeMap = new Map((stores || []).map((s: any) => [s.id, s.name]))

    const { data: attendances } = await dataClient
      .from('attendance')
      .select('store_id, work_date')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .or(`work_date.eq.${today},work_date.eq.${yesterday}`)

    const storeWorkDate = new Map<string, string>()
    attendances?.forEach((a: any) => {
      storeWorkDate.set(a.store_id, a.work_date)
    })

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0]
    const oneWeekAgoISO = oneWeekAgo.toISOString()
    const todayStart = new Date(today + 'T00:00:00')
    const todayEnd = new Date(today + 'T23:59:59')

    const todayStatsPromises = storeIds.map(async (storeId) => {
      const checklistDate = storeWorkDate.get(storeId) || today
      const storeName = storeMap.get(storeId) || ''

      const [
        checklistsRes,
        completedReqRes,
        storeProblemsRes,
        vendingRes,
        productInflowRes,
        storageRes,
      ] = await Promise.all([
        dataClient.from('checklist').select('*').eq('store_id', storeId).eq('work_date', checklistDate).eq('assigned_user_id', user.id),
        dataClient.from('requests').select('id').eq('store_id', storeId).eq('status', 'completed').gte('updated_at', todayStart.toISOString()).lte('updated_at', todayEnd.toISOString()),
        dataClient.from('problem_reports').select('id').eq('store_id', storeId).eq('category', 'other').like('title', '매장 문제%').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        dataClient.from('problem_reports').select('id').eq('store_id', storeId).not('vending_machine_number', 'is', null).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        dataClient.from('product_photos').select('id').eq('store_id', storeId).eq('type', 'receipt').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()).limit(1),
        dataClient.from('product_photos').select('id').eq('store_id', storeId).eq('type', 'storage').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()).limit(1),
      ])

      const checklists = checklistsRes.data || []
      let checklistCompleted = 0
      checklists.forEach((cl: any) => {
        if (calculateChecklistProgress(cl).percentage === 100) checklistCompleted++
      })

      return {
        store_id: storeId,
        store_name: storeName,
        checklist_completed: checklistCompleted,
        request_completed: completedReqRes.data?.length || 0,
        store_problem_count: storeProblemsRes.data?.length || 0,
        vending_problem_count: vendingRes.data?.length || 0,
        has_product_inflow: (productInflowRes.data?.length || 0) > 0,
        has_storage_photo: (storageRes.data?.length || 0) > 0,
      }
    })

    const weeklyStatsPromises = storeIds.map(async (storeId) => {
      const storeName = storeMap.get(storeId) || ''

      const [
        checklistsRes,
        storeProblemsRes,
        completedReqRes,
        productInflowRes,
        vendingRes,
        lostItemsRes,
      ] = await Promise.all([
        dataClient.from('checklist').select('work_date').eq('store_id', storeId).eq('assigned_user_id', user.id).gte('work_date', oneWeekAgoStr).lte('work_date', today),
        dataClient.from('problem_reports').select('id').eq('store_id', storeId).eq('category', 'other').like('title', '매장 문제%').gte('created_at', oneWeekAgoISO),
        dataClient.from('requests').select('id').eq('store_id', storeId).eq('status', 'completed').gte('updated_at', oneWeekAgoISO),
        dataClient.from('product_photos').select('id').eq('store_id', storeId).eq('type', 'receipt').gte('created_at', oneWeekAgoISO),
        dataClient.from('problem_reports').select('id').eq('store_id', storeId).not('vending_machine_number', 'is', null).gte('created_at', oneWeekAgoISO),
        dataClient.from('lost_items').select('id').eq('store_id', storeId).gte('created_at', oneWeekAgoISO),
      ])

      const dailyChecklists: Record<string, number> = {}
      ;(checklistsRes.data || []).forEach((cl: any) => {
        const d = cl.work_date
        dailyChecklists[d] = (dailyChecklists[d] || 0) + 1
      })
      const daily_checklists = Object.entries(dailyChecklists)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date))

      return {
        store_id: storeId,
        store_name: storeName,
        daily_checklists,
        store_problem_count: storeProblemsRes.data?.length || 0,
        request_completed: completedReqRes.data?.length || 0,
        product_inflow_count: productInflowRes.data?.length || 0,
        vending_problem_count: vendingRes.data?.length || 0,
        lost_item_count: lostItemsRes.data?.length || 0,
      }
    })

    const [todayStats, weeklyStats] = await Promise.all([
      Promise.all(todayStatsPromises),
      Promise.all(weeklyStatsPromises),
    ])

    return Response.json({
      success: true,
      data: { todayStats, weeklyStats },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
