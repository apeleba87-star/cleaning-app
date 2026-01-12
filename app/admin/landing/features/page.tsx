import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeaturesManager from './FeaturesManager'

export default async function FeaturesManagementPage() {
  const user = await getServerUser()

  if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
    redirect('/login')
  }

  return <FeaturesManager />
}
