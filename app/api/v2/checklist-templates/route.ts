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

export async function GET(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const storeId = new URL(request.url).searchParams.get('store_id')
    if (!storeId) throw new V2ApiError('store_id가 필요합니다.')
    await assertV2StoreAccess(user, storeId)

    const client = getV2AdminClient()
    const { data, error } = await client
      .from('v2_checklist_templates')
      .select('*')
      .eq('store_id', storeId)
    if (error) throw error
    return v2Json({ templates: data || [] })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner'])

    const body = await request.json()
    await assertV2StoreAccess(user, body.store_id)

    const client = getV2AdminClient()
    const { data, error } = await client
      .from('v2_checklist_templates')
      .insert({
        store_id: body.store_id,
        title: body.title || '기본 체크리스트',
        items: body.items || [],
      })
      .select()
      .single()
    if (error) throw error
    return v2Json({ template: data })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
