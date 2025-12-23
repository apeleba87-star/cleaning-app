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
    <>
      <MobileDashboardClient />
      <main className="max-w-2xl mx-auto px-4 py-4">{children}</main>
    </>
  )
}
