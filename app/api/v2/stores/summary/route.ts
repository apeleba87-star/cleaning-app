import {
  getV2User,
  requireV2Role,
  v2ErrorResponse,
  v2Json,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'
import { getTodayDateKST } from '@/lib/utils/date'

export async function GET() {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner', 'platform_admin'])

    const client = getV2AdminClient()
    const today = getTodayDateKST()

    let storeQuery = client
      .from('v2_stores')
      .select('id, name, service_active')
      .is('deleted_at', null)

    if (user.role === 'business_owner' && user.company_id) {
      storeQuery = storeQuery.eq('company_id', user.company_id)
    }

    const { data: stores } = await storeQuery
    const storeIds = (stores || []).map((store) => store.id)

    const [attendanceResult, issuesResult] = storeIds.length
      ? await Promise.all([
          client
            .from('v2_attendance')
            .select('store_id')
            .in('store_id', storeIds)
            .eq('work_date', today),
          client
            .from('v2_store_issues')
            .select('store_id')
            .in('store_id', storeIds)
            .in('status', ['pending', 'approved']),
        ])
      : [{ data: [] }, { data: [] }]

    const clockedStoreIds = new Set((attendanceResult.data || []).map((row) => row.store_id))
    const openIssueCountByStore = new Map<string, number>()
    for (const row of issuesResult.data || []) {
      openIssueCountByStore.set(row.store_id, (openIssueCountByStore.get(row.store_id) || 0) + 1)
    }

    const summaries = (stores || []).map((store) => ({
      id: store.id,
      name: store.name,
      service_active: store.service_active,
      clocked_in_today: clockedStoreIds.has(store.id),
      open_issues: openIssueCountByStore.get(store.id) || 0,
    }))

    return v2Json({ stores: summaries, date: today })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
