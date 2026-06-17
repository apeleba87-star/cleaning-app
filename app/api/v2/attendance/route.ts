import { v2WorkDateForStore } from '@/lib/v2/work-date'
import {
  getV2User,
  v2ErrorResponse,
  v2Json,
  V2ApiError,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'
import { getTodayDateKST } from '@/lib/utils/date'

export async function POST(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    if (user.role !== 'staff' && user.role !== 'business_owner') {
      throw new V2ApiError('직원 또는 업체관리자만 출근할 수 있습니다.', 403)
    }

    const { store_id } = await request.json()
    if (!store_id) throw new V2ApiError('store_id가 필요합니다.')

    const client = getV2AdminClient()

    const { data: assign } = await client
      .from('v2_store_assignments')
      .select('id')
      .eq('store_id', store_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!assign) throw new V2ApiError('배정된 매장이 아닙니다.', 403)

    const { data: store } = await client
      .from('v2_stores')
      .select('*')
      .eq('id', store_id)
      .single()
    if (!store?.service_active) throw new V2ApiError('비활성 매장입니다.', 400)

    const workDate = v2WorkDateForStore(store)

    const { data: open } = await client
      .from('v2_attendance')
      .select('id')
      .eq('user_id', user.id)
      .eq('work_date', workDate)
      .is('clock_out_at', null)
      .maybeSingle()
    if (open) throw new V2ApiError('이미 출근 중입니다.', 400)

    const { data: att, error } = await client
      .from('v2_attendance')
      .insert({
        store_id,
        user_id: user.id,
        work_date: workDate,
        clock_in_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error

    const { data: templates } = await client
      .from('v2_checklist_templates')
      .select('*')
      .eq('store_id', store_id)

    if (templates?.length) {
      const { data: existing } = await client
        .from('v2_checklist_runs')
        .select('id')
        .eq('store_id', store_id)
        .eq('user_id', user.id)
        .eq('work_date', workDate)
        .maybeSingle()

      if (!existing) {
        const t = templates[0]
        const items = (t.items as any[]).map((item) => ({
          ...item,
          checked: false,
          before_photo_path: null,
          after_photo_path: null,
        }))
        await client.from('v2_checklist_runs').insert({
          store_id,
          template_id: t.id,
          user_id: user.id,
          work_date: workDate,
          items,
          status: 'in_progress',
        })
      }
    }

    return v2Json({ attendance: att, work_date: workDate })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const { store_id } = await request.json()
    const client = getV2AdminClient()
    const today = getTodayDateKST()

    const { data: att } = await client
      .from('v2_attendance')
      .select('id, work_date')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!att) throw new V2ApiError('출근 기록이 없습니다.', 400)

    const { data, error } = await client
      .from('v2_attendance')
      .update({ clock_out_at: new Date().toISOString() })
      .eq('id', att.id)
      .select()
      .single()
    if (error) throw error

    return v2Json({ attendance: data })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
