import { createHash } from 'crypto'
import { calculateHomepageEstimate } from '@/lib/homepage/calculator'
import { sendHomepageEstimatePush } from '@/lib/homepage/push'
import {
  getHomepageAdminClient,
  homepageErrorResponse,
  homepageJson,
  HomepageApiError,
  sanitizeText,
} from '@/lib/homepage/server'
import type { HomepageCalculatorSettings, HomepageEstimateInput } from '@/types/homepage'

const recentSubmissions = new Map<string, number[]>()

function getIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function assertRateLimit(key: string) {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  const rows = (recentSubmissions.get(key) || []).filter((time) => now - time < windowMs)
  if (rows.length >= 5) throw new HomepageApiError('잠시 후 다시 시도해주세요.', 429)
  rows.push(now)
  recentSubmissions.set(key, rows)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.honeypot) return homepageJson({ ok: true })

    const siteId = sanitizeText(body.site_id, 80)
    const customerName = sanitizeText(body.customer_name, 40)
    const customerPhone = sanitizeText(body.customer_phone, 40)
    const contactMethod = ['form', 'phone_click', 'kakao_click', 'test'].includes(String(body.contact_method))
      ? String(body.contact_method)
      : 'form'
    if (!siteId || !customerName || !customerPhone) {
      throw new HomepageApiError('이름과 연락처가 필요합니다.')
    }

    const ip = getIp(request)
    assertRateLimit(`${siteId}:${ip}`)

    const client = getHomepageAdminClient()
    const [siteResult, calculatorResult] = await Promise.all([
      client.from('homepage_sites').select('id, tenant_id, status').eq('id', siteId).eq('status', 'published').maybeSingle(),
      client.from('homepage_calculator_settings').select('*').eq('site_id', siteId).eq('enabled', true).maybeSingle(),
    ])
    if (siteResult.error) throw siteResult.error
    if (calculatorResult.error) throw calculatorResult.error
    if (!siteResult.data) throw new HomepageApiError('공개된 홈페이지가 아닙니다.', 404)
    if (!calculatorResult.data) throw new HomepageApiError('견적계산기 설정을 찾을 수 없습니다.', 404)

    const input = body.input as HomepageEstimateInput
    if (!input || !Number.isFinite(Number(input.area_pyeong))) {
      throw new HomepageApiError('견적 입력값이 올바르지 않습니다.')
    }

    const result = calculateHomepageEstimate(input, calculatorResult.data as HomepageCalculatorSettings)
    const ipHash = createHash('sha256').update(`${siteId}:${ip}`).digest('hex')
    const { data, error } = await client
      .from('homepage_estimate_submissions')
      .insert({
        site_id: siteId,
        tenant_id: siteResult.data.tenant_id,
        industry: 'move_in_cleaning',
        customer_name: customerName,
        customer_phone: customerPhone,
        region: sanitizeText(input.region, 80),
        area_pyeong: Number(input.area_pyeong),
        selected_options: { options: input.options || [] },
        estimate_input: input,
        estimated_amount: result.estimatedAmount,
        message: sanitizeText(body.message, 500),
        source_page: sanitizeText(body.source_page, 300),
        contact_method: contactMethod,
        consent_marketing: !!body.consent_marketing,
        priority: contactMethod === 'form' ? 'high' : 'low',
        source_campaign: sanitizeText(body.source_campaign, 120),
        user_agent: sanitizeText(request.headers.get('user-agent'), 300),
        ip_hash: ipHash,
      })
      .select()
      .single()
    if (error) throw error

    if (contactMethod === 'form' || contactMethod === 'test') {
      sendHomepageEstimatePush(siteId, data.id).catch((err) => {
        console.error('[homepage push]', err)
      })
    }

    return homepageJson({ submission: data }, 201)
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
