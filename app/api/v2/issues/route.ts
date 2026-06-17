import {
  assertV2StoreAccess,
  getV2User,
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
    const client = getV2AdminClient()

    let q = client
      .from('v2_store_issues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (storeId) {
      await assertV2StoreAccess(user, storeId)
      q = q.eq('store_id', storeId)
    } else if (user.role === 'business_owner' && user.company_id) {
      q = q.eq('company_id', user.company_id)
    } else if (user.role === 'store_manager') {
      const { data: assigns } = await client
        .from('v2_store_assignments')
        .select('store_id')
        .eq('user_id', user.id)
      const ids = (assigns || []).map((a) => a.store_id)
      q = q.in('store_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    } else {
      throw new V2ApiError('권한이 없습니다.', 403)
    }

    const { data, error } = await q
    if (error) throw error
    return v2Json({ issues: data || [] })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const body = await request.json()
    const { store_id, title, description, issue_type, needs_approval } = body
    if (!store_id || !title?.trim()) throw new V2ApiError('매장과 제목이 필요합니다.')

    const { company_id } = await assertV2StoreAccess(user, store_id)
    const client = getV2AdminClient()

    const status = needs_approval ? 'pending' : 'approved'

    const { data, error } = await client
      .from('v2_store_issues')
      .insert({
        store_id,
        company_id,
        created_by: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        issue_type: issue_type || 'problem',
        needs_approval: !!needs_approval,
        status,
      })
      .select()
      .single()
    if (error) throw error

    await client.from('v2_issue_events').insert({
      issue_id: data.id,
      actor_id: user.id,
      action: 'created',
    })

    return v2Json({ issue: data })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
