import {
  getV2User,
  requireV2Role,
  v2ErrorResponse,
  v2Json,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'

export async function GET() {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner', 'platform_admin'])

    const client = getV2AdminClient()
    const buildQuery = (select: string) => {
      let q = client
        .from('v2_stores')
        .select(select)
        .is('deleted_at', null)
        .order('name')

      if (user.role !== 'platform_admin' && user.company_id) {
        q = q.eq('company_id', user.company_id)
      }

      return q
    }

    let { data, error } = await buildQuery(
      'id, name, address, region_sido, region_sigungu, management_days, is_night_shift, service_active, created_at'
    )

    if ((error as any)?.code === '42703') {
      const retry = await buildQuery(
        'id, name, address, management_days, is_night_shift, service_active, created_at'
      )
      data = retry.data
      error = retry.error
    }

    if (error) throw error
    return v2Json({ stores: data || [] })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner'])
    if (!user.company_id) throw new V2UnauthorizedError()

    const body = await request.json()
    const client = getV2AdminClient()

    const payload = {
      company_id: user.company_id,
      name: body.name?.trim(),
      address: body.address?.trim() || null,
      region_sido: body.region_sido?.trim() || null,
      region_sigungu: body.region_sigungu?.trim() || null,
      management_days: body.management_days || null,
      is_night_shift: !!body.is_night_shift,
      work_start_hour: body.work_start_hour ?? 18,
      work_end_hour: body.work_end_hour ?? 8,
      service_active: body.service_active !== false,
    }

    let { data, error } = await client
      .from('v2_stores')
      .insert(payload)
      .select()
      .single()

    if ((error as any)?.code === '42703') {
      const { region_sido, region_sigungu, ...legacyPayload } = payload
      const retry = await client
        .from('v2_stores')
        .insert(legacyPayload)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) throw error

    const defaultNotes = [
      { note_key: 'entrance_password', visible_to_staff: true },
      { note_key: 'cleaning_notes', visible_to_staff: true },
      { note_key: 'payment_date', visible_to_staff: false },
      { note_key: 'payment_amount', visible_to_staff: false },
      { note_key: 'manager_memo', visible_to_staff: false },
    ]
    await client.from('v2_store_notes').insert(
      defaultNotes.map((n) => ({
        store_id: data.id,
        note_key: n.note_key,
        content: '',
        visible_to_staff: n.visible_to_staff,
        visible_to_store_manager: true,
        visible_to_owner: true,
      }))
    )

    return v2Json({ store: data })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
