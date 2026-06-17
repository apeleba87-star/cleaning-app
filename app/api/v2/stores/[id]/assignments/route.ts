import {
  assertV2StoreAccess,
  getV2User,
  requireV2Role,
  v2ErrorResponse,
  v2Json,
  V2ApiError,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    await assertV2StoreAccess(user, params.id)

    const client = getV2AdminClient()
    const { data, error } = await client
      .from('v2_store_assignments')
      .select('id, assignment_role, user_id')
      .eq('store_id', params.id)
    if (error) throw error

    const userIds = Array.from(new Set((data || []).map((a) => a.user_id)))
    let usersMap: Record<string, { id: string; name: string; role: string }> = {}
    if (userIds.length) {
      const { data: users } = await client
        .from('v2_users')
        .select('id, name, role')
        .in('id', userIds)
      for (const u of users || []) usersMap[u.id] = u
    }

    const assignments = (data || []).map((a) => ({
      ...a,
      v2_users: usersMap[a.user_id] || null,
    }))

    return v2Json({ assignments })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner'])
    await assertV2StoreAccess(user, params.id)

    const { user_id, assignment_role } = await request.json()
    if (!user_id || !assignment_role) throw new V2ApiError('user_id와 assignment_role이 필요합니다.')

    const client = getV2AdminClient()
    const { data, error } = await client
      .from('v2_store_assignments')
      .upsert(
        { store_id: params.id, user_id, assignment_role },
        { onConflict: 'store_id,user_id' }
      )
      .select()
      .single()
    if (error) throw error
    return v2Json({ assignment: data })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner'])
    await assertV2StoreAccess(user, params.id)

    const { user_id } = await request.json()
    const client = getV2AdminClient()
    await client
      .from('v2_store_assignments')
      .delete()
      .eq('store_id', params.id)
      .eq('user_id', user_id)

    return v2Json({ success: true })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
