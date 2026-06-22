import {
  assertHomepageSiteAccess,
  getHomepageAdminClient,
  getHomepageAuthUserId,
  homepageErrorResponse,
  homepageJson,
  HomepageApiError,
  sanitizeText,
} from '@/lib/homepage/server'

export async function POST(request: Request, { params }: { params: { siteId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const userId = await getHomepageAuthUserId()
    if (!userId) throw new HomepageApiError('로그인이 필요합니다.', 401)

    const body = await request.json()
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      throw new HomepageApiError('알림 구독 정보가 올바르지 않습니다.')
    }

    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('homepage_push_subscriptions')
      .upsert(
        {
          site_id: params.siteId,
          user_id: userId,
          endpoint: String(body.endpoint),
          p256dh: String(body.keys.p256dh),
          auth: String(body.keys.auth),
          user_agent: sanitizeText(request.headers.get('user-agent'), 300),
          active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )
      .select()
      .single()
    if (error) throw error

    return homepageJson({ subscription: data }, 201)
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
