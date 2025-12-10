import { NavRoleSwitch } from '@/components/NavRoleSwitch'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MobileDashboardClient from './MobileDashboardClient'

export default async function MobileDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'staff') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileDashboardClient />
      <NavRoleSwitch userRole={user.role} userName={user.name} />
      <main className="max-w-2xl mx-auto px-4 py-4">{children}</main>
    </div>
  )
}
