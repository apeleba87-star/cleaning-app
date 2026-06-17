import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { V2User, V2UserRole } from '@/types/v2'

export function getV2AdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role configuration')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getV2AuthUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getV2User(): Promise<V2User | null> {
  const userId = await getV2AuthUserId()
  if (!userId) return null

  const client = getV2AdminClient()
  const { data, error } = await client
    .from('v2_users')
    .select('id, company_id, role, name, phone, active')
    .eq('id', userId)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as V2User
}

export function requireV2Role(user: V2User, roles: V2UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new V2ForbiddenError('권한이 없습니다.')
  }
}

export class V2ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export class V2ForbiddenError extends V2ApiError {
  constructor(message = '권한이 없습니다.') {
    super(message, 403)
  }
}

export class V2UnauthorizedError extends V2ApiError {
  constructor(message = '로그인이 필요합니다.') {
    super(message, 401)
  }
}

export function v2Json<T>(data: T, status = 200) {
  return Response.json(data, { status })
}

export function v2ErrorResponse(err: unknown) {
  if (err instanceof V2ApiError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  console.error('[v2]', err)
  return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
}

export async function assertV2StoreAccess(
  user: V2User,
  storeId: string
): Promise<{ company_id: string }> {
  const client = getV2AdminClient()

  const { data: store } = await client
    .from('v2_stores')
    .select('id, company_id')
    .eq('id', storeId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!store) throw new V2ApiError('매장을 찾을 수 없습니다.', 404)

  if (user.role === 'platform_admin') return { company_id: store.company_id }

  if (user.role === 'business_owner' && user.company_id === store.company_id) {
    return { company_id: store.company_id }
  }

  const { data: assign } = await client
    .from('v2_store_assignments')
    .select('id')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (assign) return { company_id: store.company_id }

  throw new V2ForbiddenError()
}
