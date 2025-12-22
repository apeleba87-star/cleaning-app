import { NavRoleSwitch } from '@/components/NavRoleSwitch'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'platform_admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavRoleSwitch userRole={user.role} userName={user.name} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}



