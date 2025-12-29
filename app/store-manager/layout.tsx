import { NavRoleSwitch } from '@/components/NavRoleSwitch'
import BottomNavigation from '@/components/store-manager/BottomNavigation'
import MobileHeader from '@/components/store-manager/MobileHeader'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StoreManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'store_manager') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* 데스크톱: 상단 네비게이션, 모바일: 숨김 */}
      <div className="hidden md:block">
        <NavRoleSwitch userRole={user.role} userName={user.name} />
      </div>
      
      {/* 모바일: 상단 헤더만 간단히 표시 */}
      <MobileHeader userName={user.name} />

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
        {children}
      </main>

      {/* 모바일: 하단 네비게이션 */}
      <BottomNavigation />
    </div>
  )
}



