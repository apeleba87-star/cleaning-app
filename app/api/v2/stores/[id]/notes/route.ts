import {
  assertV2StoreAccess,
  getV2User,
  requireV2Role,
  v2ErrorResponse,
  v2Json,
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
      .from('v2_store_notes')
      .select('*')
      .eq('store_id', params.id)

    if (error) throw error

    const filtered = (data || []).filter((n) => {
      if (user.role === 'business_owner' || user.role === 'platform_admin') return true
      if (user.role === 'store_manager') return n.visible_to_store_manager
      if (user.role === 'staff') return n.visible_to_staff
      return false
    })

    return v2Json({ notes: filtered })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner'])
    await assertV2StoreAccess(user, params.id)

    const { notes } = await request.json()
    const client = getV2AdminClient()

    for (const n of notes || []) {
      await client
        .from('v2_store_notes')
        .update({
          content: n.content ?? '',
          visible_to_staff: !!n.visible_to_staff,
          visible_to_store_manager: n.visible_to_store_manager !== false,
          updated_at: new Date().toISOString(),
        })
        .eq('store_id', params.id)
        .eq('note_key', n.note_key)
    }

    return v2Json({ success: true })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
