import { recordV2AdClick } from '@/lib/v2/ads'
import { v2ErrorResponse, v2Json, V2ApiError } from '@/lib/v2/server'

export async function POST(request: Request) {
  try {
    const { campaign_id, slot } = await request.json()
    if (!campaign_id || !slot) throw new V2ApiError('campaign_id와 slot이 필요합니다.')
    recordV2AdClick(campaign_id, slot).catch(() => {})
    return v2Json({ success: true })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
