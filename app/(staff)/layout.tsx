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

  // 직원, 도급(업체), 도급(개인), 업체관리자(직원모드) 직원 앱 사용
  const staffModeRoles = ['staff', 'subcontract_company', 'subcontract_individual', 'business_owner']
  if (!staffModeRoles.includes(user.role)) {
    redirect('/')
  }

  return (
    <StaffLayoutClient userRole={user.role} userName={user.name}>
      {children}
    </StaffLayoutClient>
  )
}

