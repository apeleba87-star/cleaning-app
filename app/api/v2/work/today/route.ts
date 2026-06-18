import {
  getV2User,
  v2ErrorResponse,
  v2Json,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'
import { v2ManagementScheduleForStore } from '@/lib/v2/work-date'

export async function GET() {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const client = getV2AdminClient()
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()

    const [{ data: assignments }, { data: activeRows }, { data: runs }] = await Promise.all([
      client
        .from('v2_store_assignments')
        .select('store_id, assignment_role')
        .eq('user_id', user.id),
      client
        .from('v2_attendance')
        .select('id, store_id, work_date, clock_in_at, clock_out_at')
        .eq('user_id', user.id)
        .is('clock_out_at', null)
        .in('work_date', [today, yesterday]),
      client
        .from('v2_checklist_runs')
        .select('id, store_id, work_date, status, items')
        .eq('user_id', user.id)
        .in('work_date', [today, yesterday])
        .eq('status', 'in_progress'),
    ])

    let ownerStores: any[] = []
    if (user.role === 'business_owner' && user.company_id) {
      const { data } = await client
        .from('v2_stores')
        .select('id, name, management_days, is_night_shift, work_start_hour, work_end_hour, service_active')
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
        .order('name')
      ownerStores = data || []
    }

    const storeIds = Array.from(
      new Set([
        ...(assignments || []).map((a) => a.store_id),
        ...(activeRows || []).map((a) => a.store_id),
        ...ownerStores.map((s) => s.id),
      ])
    )
    const storesMap: Record<string, any> = {}
    if (storeIds.length) {
      const { data: stores } = await client
        .from('v2_stores')
        .select('id, name, management_days, is_night_shift, work_start_hour, work_end_hour, service_active')
        .in('id', storeIds)
      for (const s of stores || []) storesMap[s.id] = s
    }

    if (storeIds.length) {
      const { data: notes } = await client
        .from('v2_store_notes')
        .select('store_id, note_key, content')
        .in('store_id', storeIds)
        .eq('visible_to_staff', true)

      const notesByStore: Record<string, Record<string, string>> = {}
      for (const note of notes || []) {
        notesByStore[note.store_id] = notesByStore[note.store_id] || {}
        notesByStore[note.store_id][note.note_key] = note.content || ''
      }
      for (const storeId of Object.keys(notesByStore)) {
        if (storesMap[storeId]) {
          storesMap[storeId] = {
            ...storesMap[storeId],
            public_notes: notesByStore[storeId],
          }
        }
      }
    }

    const templateItemsByStore: Record<string, any[]> = {}
    if (storeIds.length) {
      const { data: templates } = await client
        .from('v2_checklist_templates')
        .select('store_id, items')
        .in('store_id', storeIds)
      for (const template of templates || []) {
        if (!templateItemsByStore[template.store_id]) {
          templateItemsByStore[template.store_id] = template.items || []
        }
      }
    }

    const assignmentsEnriched =
      user.role === 'business_owner'
        ? ownerStores.map((store) => ({
            store_id: store.id,
            assignment_role: 'business_owner',
            v2_stores: storesMap[store.id] || store,
          }))
        : (assignments || []).map((a) => ({
            ...a,
            v2_stores: storesMap[a.store_id] || null,
          }))

    const workStores = assignmentsEnriched
      .map((item) => {
        const store = item.v2_stores
        if (!store?.service_active) return null
        const schedule = v2ManagementScheduleForStore({
          management_days: store.management_days,
          is_night_shift: store.is_night_shift,
          work_start_hour: store.work_start_hour,
          work_end_hour: store.work_end_hour,
        })
        return { ...item, ...schedule }
      })
      .filter(Boolean)

    const todayStores = workStores.filter((item: any) => item.is_today)
    const upcomingStores = workStores
      .filter((item: any) => !item.is_today)
      .sort((a: any, b: any) => {
        if (a.days_until_next !== b.days_until_next) {
          return a.days_until_next - b.days_until_next
        }
        return (a.v2_stores?.name || '').localeCompare(b.v2_stores?.name || '', 'ko')
      })

    const active = (activeRows || []).map((a) => ({
      ...a,
      v2_stores: storesMap[a.store_id] || null,
    }))

    const runStoreIds = new Set((runs || []).map((run) => run.store_id))
    const checklistGuides = workStores
      .filter((item: any) => !runStoreIds.has(item.store_id))
      .map((item: any) => ({
        id: `template-${item.store_id}`,
        store_id: item.store_id,
        work_date: null,
        status: 'guide',
        items: templateItemsByStore[item.store_id] || [],
        v2_stores: item.v2_stores ? { name: item.v2_stores.name } : null,
      }))
      .filter((guide) => guide.items.length > 0)

    return v2Json({
      role: user.role,
      assignments: assignmentsEnriched,
      today_stores: todayStores,
      upcoming_stores: upcomingStores,
      active_attendance: active,
      checklist_runs: runs || [],
      checklist_guides: checklistGuides,
    })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
