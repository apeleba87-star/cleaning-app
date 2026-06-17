import { redirect } from 'next/navigation'
import { getV2AuthUserId } from '@/lib/v2/server'
import { getV2User } from '@/lib/v2/server'

export default async function V2RootPage() {
  const authId = await getV2AuthUserId()
  if (!authId) redirect('/login?next=/v2')

  const user = await getV2User()
  if (!user) redirect('/v2/onboarding')

  if (user.role === 'staff' || user.role === 'business_owner') {
    redirect(user.role === 'staff' ? '/v2/work' : '/v2/manage')
  }
  if (user.role === 'store_manager') {
    redirect('/v2-store-manager')
  }
  redirect('/v2/onboarding')
}
