import {
  assertHomepageSiteAccess,
  getHomepageAdminClient,
  homepageErrorResponse,
  homepageJson,
  sanitizeText,
} from '@/lib/homepage/server'

export async function PATCH(
  request: Request,
  { params }: { params: { siteId: string; submissionId: string } }
) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const body = await request.json()
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if ('status' in body && ['new', 'checked', 'consulting', 'completed', 'hold'].includes(body.status)) {
      payload.status = body.status
      if (body.status === 'completed') payload.completed_at = new Date().toISOString()
      if (body.status === 'consulting' && !body.contacted_at) payload.contacted_at = new Date().toISOString()
    }
    if ('admin_memo' in body) payload.admin_memo = sanitizeText(body.admin_memo, 1000)
    if ('priority' in body && ['low', 'normal', 'high'].includes(body.priority)) payload.priority = body.priority
    if ('contacted_at' in body) payload.contacted_at = sanitizeText(body.contacted_at, 80) || null
    if ('scheduled_at' in body) payload.scheduled_at = sanitizeText(body.scheduled_at, 80) || null
    if ('completed_at' in body) payload.completed_at = sanitizeText(body.completed_at, 80) || null
    if ('lost_reason' in body) payload.lost_reason = sanitizeText(body.lost_reason, 300)

    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('homepage_estimate_submissions')
      .update(payload)
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
