import { getV2AuthUserId, getV2User, v2ErrorResponse, v2Json, V2ApiError } from '@/lib/v2/server'
import { getV2AdminClient } from '@/lib/v2/server'

export async function POST(request: Request) {
  try {
    const authId = await getV2AuthUserId()
    if (!authId) throw new V2ApiError('로그인이 필요합니다.', 401)

    const existing = await getV2User()
    if (existing) throw new V2ApiError('이미 V2 프로필이 있습니다.')

    const body = await request.json()
    const { company_name, region_sido, region_sigungu, name, role } = body

    if (!name?.trim()) throw new V2ApiError('이름을 입력하세요.')
    if (!company_name?.trim() && role !== 'store_manager') {
      throw new V2ApiError('회사명을 입력하세요.')
    }

    const client = getV2AdminClient()
    const userRole = role === 'store_manager' ? 'store_manager' : 'business_owner'

    let companyId: string | null = null
    if (userRole === 'business_owner') {
      const { data: company, error: companyErr } = await client
        .from('v2_companies')
        .insert({
          name: company_name.trim(),
          region_sido: region_sido?.trim() || null,
          region_sigungu: region_sigungu?.trim() || null,
        })
        .select('id')
        .single()
      if (companyErr || !company) throw new V2ApiError('회사 생성에 실패했습니다.', 500)
      companyId = company.id
    }

    const { error: userErr } = await client.from('v2_users').insert({
      id: authId,
      company_id: companyId,
      role: userRole,
      name: name.trim(),
    })
    if (userErr) throw new V2ApiError(userErr.message, 500)

    return v2Json({ success: true, role: userRole })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
