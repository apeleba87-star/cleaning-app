import { sendHomepageTestPush } from '@/lib/homepage/push'
import { assertHomepageSiteAccess, homepageErrorResponse, homepageJson } from '@/lib/homepage/server'

export async function POST(_request: Request, { params }: { params: { siteId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const result = await sendHomepageTestPush(params.siteId)
    return homepageJson(result)
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
