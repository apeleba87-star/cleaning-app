'use client'

import { AttendanceProvider } from '@/contexts/AttendanceContext'
import { NavRoleSwitch } from '@/components/NavRoleSwitch'
import BottomNavigation from '@/components/staff/BottomNavigation'

interface StaffLayoutClientProps {
  userRole: 'staff' | 'manager' | 'admin' | 'business_owner' | 'platform_admin' | 'franchise_manager' | 'store_manager'
  userName: string
  children: React.ReactNode
}

export default function StaffLayoutClient({ userRole, userName, children }: StaffLayoutClientProps) {
  return (
    <AttendanceProvider>
      <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
        {/* 상단 헤더 */}
        <NavRoleSwitch userRole={userRole} userName={userName} />
        
        {/* 메인 콘텐츠 */}
        <main>{children}</main>

        {/* 모바일: 하단 네비게이션 */}
        <BottomNavigation />
      </div>
    </AttendanceProvider>
  )
}

