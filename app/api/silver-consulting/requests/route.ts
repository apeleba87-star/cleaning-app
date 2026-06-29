import {
  getHomepageAdminClient,
  getHomepageUser,
  homepageErrorResponse,
  homepageJson,
  HomepageApiError,
  HomepageForbiddenError,
  HomepageUnauthorizedError,
  sanitizeText,
} from '@/lib/homepage/server'

const allowedRoles = new Set(['원장님', '직원', '기타'])
const allowedStatuses = new Set(['submitted', 'contacted', 'completed', 'archived'])

function isValidMobilePhone(value: string) {
  return /^010\d{8}$/.test(value.replace(/\D/g, ''))
}

async function assertSilverRequestAdmin() {
  const user = await getHomepageUser()
  if (!user) throw new HomepageUnauthorizedError()
  if (!['admin', 'platform_admin', 'business_owner'].includes(String(user.role))) {
    throw new HomepageForbiddenError()
  }
}

export async function GET() {
  try {
    await assertSilverRequestAdmin()

    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('silver_blog_check_requests')
      .select('id, role, phone, source_page, status, memo, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    return homepageJson({ requests: data || [] })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const role = sanitizeText(body.role, 20)
    const phone = sanitizeText(body.phone, 40)

    if (!allowedRoles.has(role)) throw new HomepageApiError('직급을 선택해주세요.')
    if (!isValidMobilePhone(phone)) throw new HomepageApiError('010으로 시작하는 휴대폰 번호 11자리를 모두 입력해주세요.')

    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('silver_blog_check_requests')
      .insert({
        role,
        phone,
        source_page: 'silver-consulting',
        status: 'submitted',
      })
      .select('id')
      .single()

    if (error) throw error

    return homepageJson({ ok: true, id: data.id })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    await assertSilverRequestAdmin()

    const body = await request.json()
    const id = sanitizeText(body.id, 80)
    const status = sanitizeText(body.status, 40)
    const memo = sanitizeText(body.memo, 500)

    if (!id) throw new HomepageApiError('신청 ID가 없습니다.')
    if (!allowedStatuses.has(status)) throw new HomepageApiError('유효하지 않은 상태입니다.')

    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('silver_blog_check_requests')
      .update({
        status,
        memo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, role, phone, source_page, status, memo, created_at, updated_at')
      .single()

    if (error) throw error

    return homepageJson({ request: data })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
