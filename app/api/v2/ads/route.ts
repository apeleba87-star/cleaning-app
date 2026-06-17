import { fetchV2AdForSlot, recordV2AdImpression } from '@/lib/v2/ads'
import {
  getV2User,
  v2ErrorResponse,
  v2Json,
  V2ApiError,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'

export async function GET(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const slot = new URL(request.url).searchParams.get('slot')
    if (!slot) throw new V2ApiError('slot이 필요합니다.')

    let region: { sido?: string | null; sigungu?: string | null } = {}
    if (user.company_id) {
      const client = getV2AdminClient()
      const { data: company } = await client
        .from('v2_companies')
        .select('region_sido, region_sigungu')
        .eq('id', user.company_id)
        .maybeSingle()
      if (company) {
        region = {
          sido: company.region_sido,
          sigungu: company.region_sigungu,
        }
      }
    }

    const ad = await fetchV2AdForSlot(slot, user, region)
    if (ad) {
      recordV2AdImpression(ad.campaign_id, slot).catch(() => {})
    }

    return v2Json({ ad })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
