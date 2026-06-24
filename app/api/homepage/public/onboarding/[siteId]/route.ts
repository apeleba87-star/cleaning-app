import {
  getHomepageAdminClient,
  homepageErrorResponse,
  homepageJson,
  HomepageApiError,
  sanitizeExternalUrl,
  sanitizeText,
} from '@/lib/homepage/server'

function sanitizeLines(value: unknown, maxItems = 20, maxLength = 180) {
  const source = Array.isArray(value) ? value : String(value || '').split('\n')
  return source
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function sanitizeUrlLines(value: unknown, maxItems = 20) {
  return sanitizeLines(value, maxItems, 600)
    .map((item) => sanitizeExternalUrl(item))
    .filter(Boolean)
}

function sanitizeReviews(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((review: any) => ({
      author: sanitizeText(review?.author, 40),
      rating: Math.min(5, Math.max(1, Number(review?.rating || 5))),
      content: sanitizeText(review?.content, 240),
    }))
    .filter((review) => review.content)
    .slice(0, 6)
}

function sanitizeFaqs(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((faq: any) => ({
      question: sanitizeText(faq?.question, 120),
      answer: sanitizeText(faq?.answer, 300),
    }))
    .filter((faq) => faq.question && faq.answer)
    .slice(0, 10)
}

function sanitizeBeforeAfter(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item: any) => ({
      title: sanitizeText(item?.title, 80),
      before: sanitizeExternalUrl(item?.before),
      after: sanitizeExternalUrl(item?.after),
    }))
    .filter((item) => item.before || item.after)
    .slice(0, 8)
}

export async function GET(_request: Request, { params }: { params: { siteId: string } }) {
  try {
    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('homepage_sites')
      .select('id, name, business_name, template_key')
      .eq('id', params.siteId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new HomepageApiError('홈페이지를 찾을 수 없습니다.', 404)
    return homepageJson({ site: data })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: { params: { siteId: string } }) {
  try {
    const body = await request.json()
    const client = getHomepageAdminClient()
    const { data: site, error: siteError } = await client
      .from('homepage_sites')
      .select('id')
      .eq('id', params.siteId)
      .maybeSingle()
    if (siteError) throw siteError
    if (!site) throw new HomepageApiError('홈페이지를 찾을 수 없습니다.', 404)

    const businessName = sanitizeText(body.business_name, 120)
    const contactPhone = sanitizeText(body.contact_phone, 40)
    if (!businessName) throw new HomepageApiError('업체명을 입력해주세요.')
    if (!contactPhone) throw new HomepageApiError('연락 가능한 번호를 입력해주세요.')

    const payload = {
      site_id: params.siteId,
      status: 'submitted',
      business_name: businessName,
      contact_name: sanitizeText(body.contact_name, 60),
      contact_phone: contactPhone,
      phone: sanitizeText(body.phone, 40),
      kakao_url: sanitizeExternalUrl(body.kakao_url),
      blog_url: sanitizeExternalUrl(body.blog_url),
      naver_place_url: sanitizeExternalUrl(body.naver_place_url),
      instagram_url: sanitizeExternalUrl(body.instagram_url),
      service_area: sanitizeText(body.service_area, 300),
      address: sanitizeText(body.address, 300),
      business_hours: sanitizeText(body.business_hours, 120),
      hero_headline: sanitizeText(body.hero_headline, 140),
      hero_subheadline: sanitizeText(body.hero_subheadline, 220),
      company_intro: sanitizeText(body.company_intro, 700),
      services: sanitizeLines(body.services, 12, 100),
      pricing_notes: sanitizeLines(body.pricing_notes, 12, 120),
      reviews: sanitizeReviews(body.reviews),
      faqs: sanitizeFaqs(body.faqs),
      logo_image_url: sanitizeExternalUrl(body.logo_image_url),
      representative_images: sanitizeUrlLines(body.representative_images, 8),
      portfolio_images: sanitizeUrlLines(body.portfolio_images, 20),
      before_after_images: sanitizeBeforeAfter(body.before_after_images),
      footer_representative: sanitizeText(body.footer_representative, 60),
      footer_business_number: sanitizeText(body.footer_business_number, 60),
      footer_email: sanitizeText(body.footer_email, 120),
      footer_address: sanitizeText(body.footer_address, 300),
      footer_note: sanitizeText(body.footer_note, 300),
      reference_urls: sanitizeUrlLines(body.reference_urls, 5),
      request_note: sanitizeText(body.request_note, 700),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await client
      .from('homepage_onboarding_submissions')
      .insert(payload)
      .select('id, status, created_at')
      .single()
    if (error) throw error

    return homepageJson({ submission: data }, 201)
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
