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
      .from('v2_stores')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error) throw error
    return v2Json({ store: data })
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

    const body = await request.json()
    const client = getV2AdminClient()

    const payload = {
      name: body.name?.trim(),
      address: body.address?.trim() || null,
      region_sido: body.region_sido?.trim() || null,
      region_sigungu: body.region_sigungu?.trim() || null,
      management_days: body.management_days || null,
      is_night_shift: !!body.is_night_shift,
      work_start_hour: body.work_start_hour ?? 18,
      work_end_hour: body.work_end_hour ?? 8,
      service_active: body.service_active !== false,
      updated_at: new Date().toISOString(),
    }

    let { data, error } = await client
      .from('v2_stores')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single()

    if ((error as any)?.code === '42703') {
      const { region_sido, region_sigungu, ...legacyPayload } = payload
      const retry = await client
        .from('v2_stores')
        .update(legacyPayload)
        .eq('id', params.id)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) throw error
    return v2Json({ store: data })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
