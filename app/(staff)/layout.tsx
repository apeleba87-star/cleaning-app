import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffLayoutClient from './StaffLayoutClient'

export default async function StaffLayout({
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
    <StaffLayoutClient userRole={user.role} userName={user.name}>
      {children}
    </StaffLayoutClient>
  )
}

