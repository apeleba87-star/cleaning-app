'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface NavRoleSwitchProps {
  userRole: 'staff' | 'manager' | 'admin' | 'business_owner' | 'platform_admin' | 'franchise_manager' | 'store_manager'
  userName?: string
}

export function NavRoleSwitch({ userRole, userName }: NavRoleSwitchProps) {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const staffNav = [
    { href: '/attendance', label: '출퇴근' },
    { href: '/photos', label: '청소 사진' },
    { href: '/checklist', label: '체크리스트' },
    { href: '/issues', label: '이슈' },
    { href: '/supplies', label: '물품 요청' },
  ]

  const managerNav = [
    { href: '/reviews', label: '리뷰' },
    { href: '/supplies', label: '물품 관리' },
  ]

  const adminNav = [
    { href: '/dashboard', label: '대시보드' },
    { href: '/admin/stores', label: '매장 관리' },
    { href: '/admin/users', label: '사용자 관리' },
    { href: '/admin/categories', label: '카테고리' },
    { href: '/admin/reports', label: '리포트' },
  ]

        const businessOwnerNav = [
          { href: '/business/dashboard', label: '대시보드' },
          { href: '/business/company', label: '회사 관리' },
          { href: '/business/stores', label: '매장 관리' },
          { href: '/business/users', label: '사용자 관리' },
          { href: '/business/checklists', label: '체크리스트' },
          { href: '/business/reports', label: '리포트' },
          { href: '/business/issues', label: '요청/미흡' },
        ]

        const franchiseManagerNav = [
          { href: '/franchise/dashboard', label: '대시보드' },
          { href: '/franchise/company', label: '회사 관리' },
          { href: '/franchise/stores', label: '매장 관리' },
          { href: '/franchise/users', label: '사용자 관리' },
          { href: '/franchise/checklists', label: '체크리스트' },
          { href: '/franchise/reports', label: '리포트' },
          { href: '/franchise/issues', label: '요청/미흡' },
        ]

        const storeManagerNav = [
          { href: '/store-manager/dashboard', label: '대시보드' },
          { href: '/store-manager/stores', label: '매장 관리' },
          { href: '/store-manager/reports', label: '리포트' },
          { href: '/store-manager/issues', label: '요청/미흡' },
        ]

  const platformAdminNav = [
    { href: '/platform/dashboard', label: '시스템 대시보드' },
    { href: '/platform/companies', label: '전체 회사' },
    { href: '/platform/billing', label: '결제 관리' },
    { href: '/platform/settings', label: '시스템 설정' },
  ]

  const navItems =
    userRole === 'staff' ? staffNav :
    userRole === 'manager' ? managerNav :
    userRole === 'business_owner' ? businessOwnerNav :
    userRole === 'franchise_manager' ? franchiseManagerNav :
    userRole === 'store_manager' ? storeManagerNav :
    userRole === 'platform_admin' ? platformAdminNav :
    adminNav

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!isClient) return null

  // 모바일에서는 간단한 헤더만 표시
  if (userRole === 'staff') {
    return (
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link href="/mobile-dashboard" className="text-lg md:text-xl font-bold">
              청소 관리
            </Link>
            <div className="flex items-center space-x-2 md:space-x-4">
              {userName && (
                <span className="text-xs md:text-sm hidden md:inline">
                  {userName}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-2 md:px-4 py-1 md:py-2 bg-red-500 hover:bg-red-600 rounded-md text-xs md:text-sm font-medium transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold">
              청소 관리
            </Link>
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href) // Use startsWith for active state
                      ? 'bg-blue-700'
                      : 'hover:bg-blue-700/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {userName && (
              <span className="text-sm hidden md:inline">
                {userName} ({
                  userRole === 'manager' ? '매니저' : 
                  userRole === 'business_owner' ? '업체관리자' :
                  userRole === 'franchise_manager' ? '프렌차이즈관리자' :
                  userRole === 'store_manager' ? '매장관리자' :
                  userRole === 'platform_admin' ? '시스템관리자' :
                  '관리자'
                })
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-sm font-medium transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

