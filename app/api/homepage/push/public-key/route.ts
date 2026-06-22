import { getHomepagePushPublicKey } from '@/lib/homepage/push'
import { homepageJson } from '@/lib/homepage/server'

export async function GET() {
  return homepageJson({ publicKey: getHomepagePushPublicKey() })
}
