import {
  getV2User,
  requireV2Role,
  v2ErrorResponse,
  v2Json,
  V2ApiError,
  V2UnauthorizedError,
  getV2AdminClient,
  assertV2StoreAccess,
} from '@/lib/v2/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const { action } = await request.json()
    const client = getV2AdminClient()

    const { data: issue } = await client
      .from('v2_store_issues')
      .select('*')
      .eq('id', params.id)
      .single()
    if (!issue) throw new V2ApiError('이슈를 찾을 수 없습니다.', 404)

    await assertV2StoreAccess(user, issue.store_id)

    let update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (action === 'approve') {
      requireV2Role(user, ['business_owner'])
      update = { ...update, status: 'approved' }
    } else if (action === 'reject') {
      requireV2Role(user, ['business_owner'])
      update = { ...update, status: 'rejected' }
    } else if (action === 'acknowledge') {
      requireV2Role(user, ['store_manager'])
      update = {
        ...update,
        status: 'acknowledged',
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
      }
    } else if (action === 'close') {
      update = { ...update, status: 'closed' }
    } else {
      throw new V2ApiError('알 수 없는 action입니다.')
    }

    const { data, error } = await client
      .from('v2_store_issues')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error

    await client.from('v2_issue_events').insert({
      issue_id: params.id,
      actor_id: user.id,
      action,
    })

    return v2Json({ issue: data })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
