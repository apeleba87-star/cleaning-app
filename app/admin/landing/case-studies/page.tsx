import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CaseStudiesManager from './CaseStudiesManager'

export default async function CaseStudiesManagementPage() {
  const user = await getServerUser()

  if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
    redirect('/login')
  }

  return <CaseStudiesManager />
}
