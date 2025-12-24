import { NavRoleSwitch } from '@/components/NavRoleSwitch'
import BottomNavigation from '@/components/staff/BottomNavigation'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* 상단 헤더 */}
      <NavRoleSwitch userRole={user.role} userName={user.name} />
      
      {/* 메인 콘텐츠 */}
      <main>{children}</main>

      {/* 모바일: 하단 네비게이션 */}
      <BottomNavigation />
    </div>
  )
}

