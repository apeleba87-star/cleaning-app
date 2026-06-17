import {
  getV2User,
  v2ErrorResponse,
  v2Json,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

export async function GET() {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const client = getV2AdminClient()
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()

    const { data: assignments } = await client
      .from('v2_store_assignments')
      .select('store_id, assignment_role')
      .eq('user_id', user.id)

    const storeIds = (assignments || []).map((a) => a.store_id)
    let storesMap: Record<string, any> = {}
    if (storeIds.length) {
      const { data: stores } = await client
        .from('v2_stores')
        .select('id, name, management_days, is_night_shift, work_start_hour, work_end_hour, service_active')
        .in('id', storeIds)
      for (const s of stores || []) storesMap[s.id] = s
    }

    const assignmentsEnriched = (assignments || []).map((a) => ({
      ...a,
      v2_stores: storesMap[a.store_id] || null,
    }))

    const { data: activeRows } = await client
      .from('v2_attendance')
      .select('id, store_id, work_date, clock_in_at, clock_out_at')
      .eq('user_id', user.id)
      .is('clock_out_at', null)
      .in('work_date', [today, yesterday])

    const activeStoreIds = Array.from(new Set((activeRows || []).map((a) => a.store_id)))
    let activeStoreNames: Record<string, string> = {}
    if (activeStoreIds.length) {
      const { data: st } = await client.from('v2_stores').select('id, name').in('id', activeStoreIds)
      for (const s of st || []) activeStoreNames[s.id] = s.name
    }
    const active = (activeRows || []).map((a) => ({
      ...a,
      v2_stores: { name: activeStoreNames[a.store_id] },
    }))

    const { data: runs } = await client
      .from('v2_checklist_runs')
      .select('id, store_id, work_date, status, items')
      .eq('user_id', user.id)
      .in('work_date', [today, yesterday])
      .eq('status', 'in_progress')

    return v2Json({
      assignments: assignmentsEnriched,
      active_attendance: active,
      checklist_runs: runs || [],
    })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
