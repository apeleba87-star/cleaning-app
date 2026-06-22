import { getHomepageAdminClient } from '@/lib/homepage/server'

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

function getWebPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@mupl.kr'
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject }
}

export function getHomepagePushPublicKey() {
  return process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || ''
}

export async function sendHomepageEstimatePush(siteId: string, submissionId: string) {
  const config = getWebPushConfig()
  if (!config) return { sent: 0, skipped: true }

  const webpush = require('web-push')
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

  const client = getHomepageAdminClient()
  const [{ data: submission }, { data: site }, { data: subscriptions }] = await Promise.all([
    client
      .from('homepage_estimate_submissions')
      .select('id, customer_name, region, area_pyeong, estimated_amount')
      .eq('id', submissionId)
      .eq('site_id', siteId)
      .maybeSingle(),
    client.from('homepage_sites').select('id, name').eq('id', siteId).maybeSingle(),
    client
      .from('homepage_push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('site_id', siteId)
      .eq('active', true),
  ])

  if (!submission || !site || !subscriptions?.length) return { sent: 0, skipped: false }

  const payload = JSON.stringify({
    title: '새 견적 문의가 도착했습니다',
    body: `${submission.region || '지역 미입력'} / ${submission.area_pyeong || '-'}평 / ${Number(
      submission.estimated_amount || 0
    ).toLocaleString('ko-KR')}원~`,
    url: `/homepage-admin/sites/${siteId}?submission=${submissionId}`,
  })

  const notificationResult = await client
    .from('homepage_notifications')
    .insert({
      site_id: siteId,
      submission_id: submissionId,
      channel: 'pwa',
      status: 'pending',
      payload,
    })
    .select()
    .single()

  let sent = 0
  const errors: string[] = []

  await Promise.all(
    (subscriptions as PushSubscriptionRow[]).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
          { TTL: 60 * 60 }
        )
        sent += 1
      } catch (error: any) {
        errors.push(error.message || 'push failed')
        if (error.statusCode === 404 || error.statusCode === 410) {
          await client.from('homepage_push_subscriptions').update({ active: false }).eq('id', subscription.id)
        }
      }
    })
  )

  if (notificationResult.data) {
    await client
      .from('homepage_notifications')
      .update({
        status: sent > 0 ? 'sent' : 'failed',
        sent_at: sent > 0 ? new Date().toISOString() : null,
        error: errors.slice(0, 3).join(' | ') || null,
      })
      .eq('id', notificationResult.data.id)
  }

  return { sent, skipped: false }
}
