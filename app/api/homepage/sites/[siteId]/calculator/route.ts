import { revalidateTag } from 'next/cache'
import {
  assertHomepageSiteAccess,
  getHomepageAdminClient,
  homepageErrorResponse,
  homepageJson,
} from '@/lib/homepage/server'
import { toNumber } from '@/lib/homepage/calculator'

export async function PATCH(request: Request, { params }: { params: { siteId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const body = await request.json()
    const client = getHomepageAdminClient()
    const payload = {
      site_id: params.siteId,
      industry: 'move_in_cleaning',
      enabled: body.enabled !== false,
      base_unit_price: Math.max(0, Math.round(toNumber(body.base_unit_price, 13000))),
      minimum_price: Math.max(0, Math.round(toNumber(body.minimum_price, 250000))),
      pollution_extra_light: Math.max(0, Math.round(toNumber(body.pollution_extra_light))),
      pollution_extra_normal: Math.max(0, Math.round(toNumber(body.pollution_extra_normal))),
      pollution_extra_heavy: Math.max(0, Math.round(toNumber(body.pollution_extra_heavy, 50000))),
      no_elevator_extra: Math.max(0, Math.round(toNumber(body.no_elevator_extra, 30000))),
      region_extras: typeof body.region_extras === 'object' && body.region_extras ? body.region_extras : {},
      option_extras: typeof body.option_extras === 'object' && body.option_extras ? body.option_extras : {},
      discount_rate: Math.max(0, Math.min(100, toNumber(body.discount_rate))),
      result_notice: String(body.result_notice || '').replace(/[<>]/g, '').slice(0, 300),
      caution_note: String(body.caution_note || '').replace(/[<>]/g, '').slice(0, 300),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await client
      .from('homepage_calculator_settings')
      .upsert(payload, { onConflict: 'site_id,industry' })
      .select()
      .single()
    if (error) throw error

    revalidateTag('homepage-public')
    return homepageJson({ calculator: data })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
