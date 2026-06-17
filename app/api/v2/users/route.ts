import {
  getV2User,
  requireV2Role,
  v2ErrorResponse,
  v2Json,
  V2ApiError,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'

export async function GET() {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner'])
    if (!user.company_id) throw new V2ApiError('회사 정보가 없습니다.')

    const client = getV2AdminClient()
    const { data, error } = await client
      .from('v2_users')
      .select('id, name, role, phone, active, created_at')
      .eq('company_id', user.company_id)
      .order('name')
    if (error) throw error
    return v2Json({ users: data || [] })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    requireV2Role(user, ['business_owner'])
    if (!user.company_id) throw new V2ApiError('회사 정보가 없습니다.')

    const { email, password, name, role, store_ids } = await request.json()
    if (!email || !password || !name || !role) {
      throw new V2ApiError('이메일, 비밀번호, 이름, 역할이 필요합니다.')
    }
    if (!['staff', 'store_manager'].includes(role)) {
      throw new V2ApiError('staff 또는 store_manager만 등록할 수 있습니다.')
    }

    const client = getV2AdminClient()

    const { data: authData, error: authErr } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authErr || !authData.user) {
      throw new V2ApiError(authErr?.message || '계정 생성 실패', 500)
    }

    const { error: profileErr } = await client.from('v2_users').insert({
      id: authData.user.id,
      company_id: user.company_id,
      role,
      name: name.trim(),
    })
    if (profileErr) {
      await client.auth.admin.deleteUser(authData.user.id)
      throw new V2ApiError(profileErr.message, 500)
    }

    if (store_ids?.length) {
      const assignment_role = role === 'store_manager' ? 'store_manager' : 'staff'
      await client.from('v2_store_assignments').insert(
        store_ids.map((sid: string) => ({
          store_id: sid,
          user_id: authData.user!.id,
          assignment_role,
        }))
      )
    }

    return v2Json({ user_id: authData.user.id })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
