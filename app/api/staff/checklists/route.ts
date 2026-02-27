import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'
import { calculateChecklistProgress } from '@/lib/utils/checklist'

/**
 * 직원 앱: 배정된 체크리스트 목록 조회
 * RLS 우회를 위해 서비스 역할 사용
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Only staff or business owner (staff mode) can view their checklists')
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

    const storeIdsToCheck: string[] = []
    const storeWorkDates: Record<string, string> = {}
    if (attendances) {
      attendances.forEach((att: any) => {
        if (!storeIdsToCheck.includes(att.store_id)) {
          storeIdsToCheck.push(att.store_id)
        }
        storeWorkDates[att.store_id] = att.work_date
      })
    }

    // 출근하지 않았으면 빈 배열 반환
    if (storeIdsToCheck.length === 0) {
      return Response.json({
        success: true,
        data: { checklists: [], completedChecklists: [] },
      })
    }

    // 템플릿에서 체크리스트 자동 생성 (각 매장별)
    for (const storeId of storeIdsToCheck) {
      const { data: templateChecklists } = await dataClient
        .from('checklist')
        .select('*')
        .eq('store_id', storeId)
        .is('assigned_user_id', null)
        .eq('work_date', '2000-01-01')

      if (!templateChecklists || templateChecklists.length === 0) continue

      const workDateForStore = storeWorkDates[storeId] || today

      const { data: existingChecklists } = await dataClient
        .from('checklist')
        .select('id, user_id, store_id')
        .eq('store_id', storeId)
        .eq('work_date', workDateForStore)
        .eq('assigned_user_id', user.id)

      const existingTemplateIds = new Set(
        (existingChecklists || []).map((c: any) => c.user_id + '_' + c.store_id)
      )

      const checklistsToCreate = templateChecklists
        .filter((t: any) => !existingTemplateIds.has(t.user_id + '_' + t.store_id))
        .map((template: any) => ({
          store_id: template.store_id,
          user_id: template.user_id,
          assigned_user_id: user.id,
          items: Array.isArray(template.items)
            ? template.items.map((item: any) => ({
                ...item,
                checked: false,
                before_photo_url: null,
                after_photo_url: null,
                comment: item.comment || null,
              }))
            : [],
          note: template.note,
          requires_photos: template.requires_photos || false,
          review_status: 'pending' as const,
          work_date: workDateForStore,
        }))

      if (checklistsToCreate.length > 0) {
        await dataClient.from('checklist').insert(checklistsToCreate).select()
      }
    }

    const workDates = Array.from(new Set(Object.values(storeWorkDates)))
    const workDatesFilter = workDates.length > 0 ? workDates : [today, yesterday]

    // 오늘 진행 중인 체크리스트
    let todayQuery = dataClient
      .from('checklist')
      .select(`*, stores:store_id (id, name)`)
      .in('store_id', storeIdsToCheck)
      .eq('assigned_user_id', user.id)

    if (workDates.length > 0) {
      todayQuery = todayQuery.in('work_date', workDatesFilter)
    } else {
      todayQuery = todayQuery.or(`work_date.eq.${today},work_date.eq.${yesterday}`)
    }

    const { data: todayData, error: todayError } = await todayQuery.order('created_at', { ascending: false })

    if (todayError) {
      throw new Error(`Failed to fetch checklists: ${todayError.message}`)
    }

    // 완료된 체크리스트 (이전 날짜)
    const { data: completedData, error: completedError } = await dataClient
      .from('checklist')
      .select(`*, stores:store_id (id, name)`)
      .in('store_id', storeIdsToCheck)
      .lte('work_date', today)
      .eq('assigned_user_id', user.id)
      .order('work_date', { ascending: false })

    if (completedError) {
      throw new Error(`Failed to fetch completed checklists: ${completedError.message}`)
    }

    const completed = (completedData || []).filter((cl: any) => {
      const progress = calculateChecklistProgress(cl)
      return progress.percentage === 100
    })

    return Response.json({
      success: true,
      data: {
        checklists: todayData || [],
        completedChecklists: completed,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
