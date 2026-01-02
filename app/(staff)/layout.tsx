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

  // 직원, 도급(업체), 도급(개인) 모두 직원 앱 사용
  if (user.role !== 'staff' && user.role !== 'subcontract_company' && user.role !== 'subcontract_individual') {
    redirect('/')
  }

  return (
    <StaffLayoutClient userRole={user.role} userName={user.name}>
      {children}
    </StaffLayoutClient>
  )
}

