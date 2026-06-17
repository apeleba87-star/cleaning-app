import { getV2AdminClient } from '@/lib/v2/server'
import type { V2AdPayload } from '@/types/v2'
import type { V2User } from '@/types/v2'

export async function fetchV2AdForSlot(
  slotKey: string,
  user: V2User,
  region?: { sido?: string | null; sigungu?: string | null }
): Promise<V2AdPayload | null> {
  const client = getV2AdminClient()
  const now = new Date().toISOString()

  const { data: campaigns } = await client
    .from('v2_ad_campaigns')
    .select(`
      id,
      priority,
      interstitial_seconds,
      target_regions,
      target_roles,
      v2_ad_creatives (title, body, image_url, link_url)
    `)
    .eq('status', 'active')
    .eq('slot_key', slotKey)
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order('priority', { ascending: false })
    .limit(20)

  if (!campaigns?.length) return null

  const regionKey =
    region?.sido && region?.sigungu
      ? `${region.sido}|${region.sigungu}`
      : region?.sido
        ? region.sido
        : null

  for (const c of campaigns as any[]) {
    const roles: string[] = c.target_roles || []
    if (roles.length > 0 && !roles.includes(user.role)) continue

    const regions: string[] = c.target_regions || []
    if (regions.length > 0 && regionKey) {
      const match = regions.some(
        (r) => r === regionKey || r === region?.sido || regionKey.startsWith(r)
      )
      if (!match) continue
    } else if (regions.length > 0 && !regionKey) {
      continue
    }

    const creative = Array.isArray(c.v2_ad_creatives)
      ? c.v2_ad_creatives[0]
      : c.v2_ad_creatives
    if (!creative) continue

    return {
      campaign_id: c.id,
      title: creative.title,
      body: creative.body,
      image_url: creative.image_url,
      link_url: creative.link_url,
      interstitial_seconds: c.interstitial_seconds ?? 0,
    }
  }

  return null
}

export async function recordV2AdImpression(campaignId: string, slotKey: string) {
  const client = getV2AdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await client
    .from('v2_ad_impressions_daily')
    .select('id, impression_count')
    .eq('campaign_id', campaignId)
    .eq('slot_key', slotKey)
    .eq('impression_date', today)
    .maybeSingle()

  if (existing) {
    await client
      .from('v2_ad_impressions_daily')
      .update({ impression_count: (existing.impression_count || 0) + 1 })
      .eq('id', existing.id)
  } else {
    await client.from('v2_ad_impressions_daily').insert({
      campaign_id: campaignId,
      slot_key: slotKey,
      impression_date: today,
      impression_count: 1,
    })
  }
}

export async function recordV2AdClick(campaignId: string, slotKey: string) {
  const client = getV2AdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await client
    .from('v2_ad_impressions_daily')
    .select('id, click_count')
    .eq('campaign_id', campaignId)
    .eq('slot_key', slotKey)
    .eq('impression_date', today)
    .maybeSingle()

  if (existing) {
    await client
      .from('v2_ad_impressions_daily')
      .update({ click_count: (existing.click_count || 0) + 1 })
      .eq('id', existing.id)
  } else {
    await client.from('v2_ad_impressions_daily').insert({
      campaign_id: campaignId,
      slot_key: slotKey,
      impression_date: today,
      click_count: 1,
      impression_count: 0,
    })
  }
}
