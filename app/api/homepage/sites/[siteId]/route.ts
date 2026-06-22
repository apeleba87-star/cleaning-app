import { revalidateTag } from 'next/cache'
import { getTemplateCategory } from '@/lib/homepage/templates'
import {
  assertHomepageSiteAccess,
  getHomepageAdminClient,
  getHomepageAdminPackage,
  homepageErrorResponse,
  homepageJson,
  normalizeDomain,
  sanitizeExternalUrl,
  sanitizeText,
} from '@/lib/homepage/server'

const textFields = [
  'name',
  'business_name',
  'headline',
  'subheadline',
  'description',
  'phone',
  'address',
  'service_area',
  'business_hours',
  'seo_title',
  'seo_description',
  'portfolio_title',
  'hero_image_url',
] as const

export async function GET(_request: Request, { params }: { params: { siteId: string } }) {
  try {
    const data = await getHomepageAdminPackage(params.siteId)
    return homepageJson(data)
  } catch (error) {
    return homepageErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: { params: { siteId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const body = await request.json()
    const client = getHomepageAdminClient()
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }

    for (const field of textFields) {
      if (field in body) payload[field] = sanitizeText(body[field], field.includes('description') ? 220 : 500)
    }

    if ('kakao_url' in body) payload.kakao_url = sanitizeExternalUrl(body.kakao_url)
    if ('blog_url' in body) payload.blog_url = sanitizeExternalUrl(body.blog_url)
    if ('naver_place_url' in body) payload.naver_place_url = sanitizeExternalUrl(body.naver_place_url)
    if ('instagram_url' in body) payload.instagram_url = sanitizeExternalUrl(body.instagram_url)
    if ('status' in body && ['draft', 'published', 'paused'].includes(body.status)) payload.status = body.status
    if ('template_key' in body) {
      const templateKey = sanitizeText(body.template_key, 80)
      payload.template_key = templateKey
      payload.template_category = getTemplateCategory(templateKey)
    }
    if ('color_palette' in body && ['primary', 'calm', 'bold', 'warm'].includes(body.color_palette)) {
      payload.color_palette = body.color_palette
    }
    if ('calculator_enabled' in body) payload.calculator_enabled = !!body.calculator_enabled
    if ('portfolio_enabled' in body) payload.portfolio_enabled = !!body.portfolio_enabled
    if ('seo_keywords' in body) {
      payload.seo_keywords = Array.isArray(body.seo_keywords)
        ? body.seo_keywords.map((value: unknown) => sanitizeText(value, 30)).filter(Boolean).slice(0, 20)
        : String(body.seo_keywords || '')
            .split(',')
            .map((value) => sanitizeText(value, 30))
            .filter(Boolean)
            .slice(0, 20)
    }

    const { data, error } = await client
      .from('homepage_sites')
      .update(payload)
      .eq('id', params.siteId)
      .select()
      .single()
    if (error) throw error

    if (Array.isArray(body.domains)) {
      const domains = body.domains
        .map((value: unknown) => normalizeDomain(String(value || '')))
        .filter(Boolean)
        .slice(0, 10)
      const { data: existing } = await client.from('homepage_domains').select('id, domain').eq('site_id', params.siteId)
      const existingDomains = new Set((existing || []).map((row) => row.domain))
      const nextDomains = new Set(domains)

      await Promise.all([
        ...domains
          .filter((domain) => !existingDomains.has(domain))
          .map((domain, index) =>
            client.from('homepage_domains').insert({
              site_id: params.siteId,
              domain,
              verified: false,
              is_primary: index === 0,
            })
          ),
        ...(existing || [])
          .filter((row) => !nextDomains.has(row.domain))
          .map((row) => client.from('homepage_domains').delete().eq('id', row.id)),
      ])
    }

    revalidateTag('homepage-public')
    return homepageJson({ site: data })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
