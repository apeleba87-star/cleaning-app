import { getV2User, v2ErrorResponse, v2Json, V2UnauthorizedError } from '@/lib/v2/server'
import { getV2AdminClient } from '@/lib/v2/server'

export async function GET() {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const client = getV2AdminClient()
    let company = null
    if (user.company_id) {
      const { data } = await client
        .from('v2_companies')
        .select('id, name, region_sido, region_sigungu')
        .eq('id', user.company_id)
        .single()
      company = data
    }

    return v2Json({ user, company })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
