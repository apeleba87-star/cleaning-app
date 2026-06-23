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
  'logo_image_url',
  'address',
  'service_area',
  'business_hours',
  'seo_title',
  'seo_description',
  'portfolio_title',
  'hero_image_url',
  'seo_og_image_url',
  'seo_canonical_url',
  'seo_naver_verification',
  'seo_google_verification',
  'footer_company_name',
  'footer_representative',
  'footer_business_number',
  'footer_email',
  'footer_address',
  'footer_phone',
  'footer_business_hours',
  'footer_note',
  'product_name',
  'product_price_note',
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
    if ('footer_privacy_url' in body) payload.footer_privacy_url = sanitizeExternalUrl(body.footer_privacy_url)
    if ('footer_terms_url' in body) payload.footer_terms_url = sanitizeExternalUrl(body.footer_terms_url)
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
    if ('seo_noindex' in body) payload.seo_noindex = !!body.seo_noindex
    if ('seo_keywords' in body) {
      payload.seo_keywords = Array.isArray(body.seo_keywords)
        ? body.seo_keywords.map((value: unknown) => sanitizeText(value, 30)).filter(Boolean).slice(0, 20)
        : String(body.seo_keywords || '')
            .split(',')
            .map((value) => sanitizeText(value, 30))
            .filter(Boolean)
            .slice(0, 20)
    }
    if ('product_included_features' in body) {
      payload.product_included_features = Array.isArray(body.product_included_features)
        ? body.product_included_features.map((value: unknown) => sanitizeText(value, 80)).filter(Boolean).slice(0, 20)
        : String(body.product_included_features || '')
            .split('\n')
            .map((value) => sanitizeText(value, 80))
            .filter(Boolean)
            .slice(0, 20)
    }
    if ('onboarding_checklist' in body && typeof body.onboarding_checklist === 'object' && body.onboarding_checklist) {
      payload.onboarding_checklist = Object.fromEntries(
        Object.entries(body.onboarding_checklist)
          .slice(0, 30)
          .map(([key, value]) => [sanitizeText(key, 40), !!value])
          .filter(([key]) => key)
      )
    }
    if ('trust_badges' in body && Array.isArray(body.trust_badges)) {
      payload.trust_badges = body.trust_badges
        .map((badge: any) => ({
          title: sanitizeText(badge?.title, 40),
          description: sanitizeText(badge?.description, 120),
        }))
        .filter((badge) => badge.title)
        .slice(0, 8)
    }

    const { data, error } = await client
      .from('homepage_sites')
      .update(payload)
      .eq('id', params.siteId)
      .select()
      .single()
    if (error) throw error

    if (Array.isArray(body.domains)) {
      const domainRows = body.domains
        .map((value: unknown, index: number) => {
          const raw = typeof value === 'string' ? { domain: value } : (value as Record<string, unknown>)
          const domain = normalizeDomain(String(raw?.domain || ''))
          if (!domain) return null
          return {
            domain,
            is_primary: index === 0 || !!raw?.is_primary,
            verified: raw?.verification_status === 'verified' || raw?.verified === true,
            verification_status: ['pending', 'verified', 'error'].includes(String(raw?.verification_status))
              ? String(raw?.verification_status)
              : raw?.verified === true
                ? 'verified'
                : 'pending',
            verification_token: sanitizeText(raw?.verification_token, 120),
            dns_target: sanitizeText(raw?.dns_target, 180),
            verification_error: sanitizeText(raw?.verification_error, 220),
            ssl_status: ['pending', 'issued', 'error'].includes(String(raw?.ssl_status))
              ? String(raw?.ssl_status)
              : 'pending',
            last_checked_at: raw?.last_checked_at ? sanitizeText(raw.last_checked_at, 80) : null,
          }
        })
        .filter(Boolean)
        .slice(0, 10) as Array<Record<string, unknown> & { domain: string }>
      const domains = domainRows.map((row) => row.domain)
      const { data: existing } = await client.from('homepage_domains').select('id, domain').eq('site_id', params.siteId)
      const existingDomains = new Set((existing || []).map((row) => row.domain))
      const nextDomains = new Set(domains)

      await Promise.all([
        ...domainRows
          .filter((row) => !existingDomains.has(row.domain))
          .map((row) =>
            client.from('homepage_domains').insert({
              site_id: params.siteId,
              ...row,
            })
          ),
        ...domainRows
          .filter((row) => existingDomains.has(row.domain))
          .map((row) => client.from('homepage_domains').update(row).eq('site_id', params.siteId).eq('domain', row.domain)),
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
