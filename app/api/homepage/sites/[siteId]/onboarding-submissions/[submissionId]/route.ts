import { revalidateTag } from 'next/cache'
import {
  assertHomepageSiteAccess,
  getHomepageAdminClient,
  homepageErrorResponse,
  homepageJson,
  HomepageApiError,
  sanitizeText,
} from '@/lib/homepage/server'

const statuses = new Set(['submitted', 'reviewing', 'applied', 'archived'])

function withValue(payload: Record<string, unknown>, key: string, value: unknown) {
  if (Array.isArray(value)) {
    if (value.length) payload[key] = value
    return
  }
  if (typeof value === 'string') {
    if (value.trim()) payload[key] = value.trim()
    return
  }
  if (value !== null && value !== undefined) payload[key] = value
}

function buildMediaRows(submission: any, siteId: string) {
  const now = new Date().toISOString()
  const rows: any[] = []

  ;(submission.representative_images || []).slice(0, 5).forEach((imageUrl: string, index: number) => {
    rows.push({
      site_id: siteId,
      item_type: index === 0 ? 'after_photo' : 'gallery',
      title: index === 0 ? '대표 이미지' : `대표 이미지 ${index + 1}`,
      image_url: imageUrl,
      alt_text: `${submission.business_name || '업체'} 대표 이미지`,
      sort_order: index,
      is_visible: true,
      updated_at: now,
    })
  })

  ;(submission.portfolio_images || []).slice(0, 12).forEach((imageUrl: string, index: number) => {
    rows.push({
      site_id: siteId,
      item_type: 'portfolio',
      title: `현장 사례 ${index + 1}`,
      image_url: imageUrl,
      alt_text: `${submission.business_name || '업체'} 현장 사례 ${index + 1}`,
      sort_order: index,
      is_visible: true,
      updated_at: now,
    })
  })

  ;(submission.before_after_images || []).slice(0, 8).forEach((item: any, index: number) => {
    const imageUrl = item?.after || item?.before
    if (!imageUrl) return
    rows.push({
      site_id: siteId,
      item_type: 'before_after',
      title: item?.title || `전후 사진 ${index + 1}`,
      image_url: imageUrl,
      before_image_url: item?.before || null,
      after_image_url: item?.after || null,
      alt_text: `${submission.business_name || '업체'} 전후 사진 ${index + 1}`,
      sort_order: index,
      is_visible: true,
      updated_at: now,
    })
  })

  return rows
}

export async function PATCH(request: Request, { params }: { params: { siteId: string; submissionId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const body = await request.json()
    const status = sanitizeText(body.status, 40)
    if (!statuses.has(status)) throw new HomepageApiError('상태값이 올바르지 않습니다.')

    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('homepage_onboarding_submissions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', params.submissionId)
      .eq('site_id', params.siteId)
      .select()
      .single()
    if (error) throw error

    return homepageJson({ submission: data })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}

export async function POST(_request: Request, { params }: { params: { siteId: string; submissionId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const client = getHomepageAdminClient()
    const { data: submission, error: submissionError } = await client
      .from('homepage_onboarding_submissions')
      .select('*')
      .eq('id', params.submissionId)
      .eq('site_id', params.siteId)
      .maybeSingle()
    if (submissionError) throw submissionError
    if (!submission) throw new HomepageApiError('제출 자료를 찾을 수 없습니다.', 404)

    const sitePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    withValue(sitePayload, 'name', submission.business_name)
    withValue(sitePayload, 'business_name', submission.business_name)
    withValue(sitePayload, 'headline', submission.hero_headline)
    withValue(sitePayload, 'subheadline', submission.hero_subheadline)
    withValue(sitePayload, 'description', submission.company_intro)
    withValue(sitePayload, 'phone', submission.phone || submission.contact_phone)
    withValue(sitePayload, 'kakao_url', submission.kakao_url)
    withValue(sitePayload, 'blog_url', submission.blog_url)
    withValue(sitePayload, 'naver_place_url', submission.naver_place_url)
    withValue(sitePayload, 'instagram_url', submission.instagram_url)
    withValue(sitePayload, 'service_area', submission.service_area)
    withValue(sitePayload, 'address', submission.address)
    withValue(sitePayload, 'business_hours', submission.business_hours)
    withValue(sitePayload, 'logo_image_url', submission.logo_image_url)
    withValue(sitePayload, 'hero_image_url', submission.representative_images?.[0])
    withValue(sitePayload, 'seo_og_image_url', submission.representative_images?.[0])
    withValue(sitePayload, 'seo_title', submission.business_name ? `${submission.business_name} 홈페이지` : null)
    withValue(sitePayload, 'seo_description', submission.hero_subheadline || submission.company_intro)
    withValue(sitePayload, 'seo_keywords', [
      submission.business_name,
      ...(submission.services || []),
      submission.service_area,
    ].filter(Boolean).slice(0, 20))
    withValue(sitePayload, 'footer_company_name', submission.business_name)
    withValue(sitePayload, 'footer_representative', submission.footer_representative)
    withValue(sitePayload, 'footer_business_number', submission.footer_business_number)
    withValue(sitePayload, 'footer_email', submission.footer_email)
    withValue(sitePayload, 'footer_address', submission.footer_address || submission.address)
    withValue(sitePayload, 'footer_phone', submission.phone || submission.contact_phone)
    withValue(sitePayload, 'footer_business_hours', submission.business_hours)
    withValue(sitePayload, 'footer_note', submission.footer_note)
    withValue(sitePayload, 'product_included_features', submission.services || [])
    withValue(sitePayload, 'product_price_note', (submission.pricing_notes || []).join('\n'))
    sitePayload.onboarding_checklist = {
      logo: !!submission.logo_image_url,
      photos: !!(submission.representative_images?.length || submission.portfolio_images?.length),
      contact: !!(submission.phone || submission.contact_phone || submission.kakao_url),
      businessInfo: !!submission.footer_business_number,
      pricing: !!submission.pricing_notes?.length,
      reviews: !!submission.reviews?.length,
      domain: false,
      push: false,
    }

    const { error: siteError } = await client.from('homepage_sites').update(sitePayload).eq('id', params.siteId)
    if (siteError) throw siteError

    const mediaRows = buildMediaRows(submission, params.siteId)
    if (mediaRows.length) {
      const { error: mediaError } = await client.from('homepage_media_items').insert(mediaRows)
      if (mediaError) throw mediaError
    }

    const { data, error } = await client
      .from('homepage_onboarding_submissions')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.submissionId)
      .eq('site_id', params.siteId)
      .select()
      .single()
    if (error) throw error

    revalidateTag('homepage-public')
    return homepageJson({ submission: data, mediaCount: mediaRows.length })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
