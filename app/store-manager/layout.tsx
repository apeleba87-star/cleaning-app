import { NavRoleSwitch } from '@/components/NavRoleSwitch'
import BottomNavigation from '@/components/store-manager/BottomNavigation'
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
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">점주 관리</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user.name}</span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-md text-xs font-medium text-white transition-colors"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
        {children}
      </main>

      {/* 모바일: 하단 네비게이션 */}
      <BottomNavigation />
    </div>
  )
}



