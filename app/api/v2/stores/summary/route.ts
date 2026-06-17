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

    const summaries = await Promise.all(
      (stores || []).map(async (store) => {
        const [{ count: att }, { count: issues }] = await Promise.all([
          client
            .from('v2_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', store.id)
            .eq('work_date', today),
          client
            .from('v2_store_issues')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', store.id)
            .in('status', ['pending', 'approved']),
        ])
        return {
          id: store.id,
          name: store.name,
          service_active: store.service_active,
          clocked_in_today: (att || 0) > 0,
          open_issues: issues || 0,
        }
      })
    )

    return v2Json({ stores: summaries, date: today })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
