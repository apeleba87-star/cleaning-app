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
    }
    if ('admin_memo' in body) payload.admin_memo = sanitizeText(body.admin_memo, 1000)

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
