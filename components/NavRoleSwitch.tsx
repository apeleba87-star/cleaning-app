'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'

interface NavRoleSwitchProps {
  userRole: 'staff' | 'manager' | 'admin' | 'business_owner' | 'platform_admin' | 'franchise_manager' | 'store_manager'
  userName?: string
  onRefresh?: () => void
  isRefreshing?: boolean
}

interface NavItem {
  href: string
  label: string
  icon?: string
  badge?: number // 배지에 표시할 숫자
}

interface NavGroup {
  label: string
  href?: string // 단일 링크가 있는 경우
  items?: NavItem[] // 드롭다운 항목
  icon?: string
}

export function NavRoleSwitch({ userRole, userName, onRefresh, isRefreshing }: NavRoleSwitchProps) {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [pendingUserCount, setPendingUserCount] = useState<number>(0)
  const [isRefreshingStore, setIsRefreshingStore] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // 점주앱의 경우 로딩 상태를 실시간으로 확인
  useEffect(() => {
    if (userRole === 'store_manager' && isClient) {
      const checkRefreshStatus = () => {
        if (typeof window !== 'undefined' && (window as any).isRefreshingStoreStatuses !== undefined) {
          setIsRefreshingStore((window as any).isRefreshingStoreStatuses)
        }
      }
      
      checkRefreshStatus()
      const interval = setInterval(checkRefreshStatus, 100) // 100ms마다 확인
      
      return () => clearInterval(interval)
    }
  }, [userRole, isClient])

  // 승인 대기 사용자 수 가져오기 (business_owner인 경우만)
  useEffect(() => {
    if (userRole === 'business_owner' && isClient) {
      const fetchPendingCount = async () => {
        try {
          const response = await fetch('/api/business/users/pending')
          if (response.ok) {
            const data = await response.json()
            setPendingUserCount(data.users?.length || 0)
          }
        } catch (error) {
          console.error('Error fetching pending users count:', error)
        }
      }
      fetchPendingCount()
    }
  }, [userRole, isClient])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRef.current[openDropdown]
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

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

        // 업체 관리자 메뉴 - 그룹화된 구조
        const businessOwnerNav: (NavItem | NavGroup)[] = [
          { href: '/business/dashboard', label: '대시보드' },
          {
            label: '매장',
            items: [
              { href: '/business/stores', label: '매장 관리' },
              { href: '/business/stores/status', label: '매장 상태' },
              { href: '/business/franchises', label: '프렌차이즈 관리' },
            ],
          },
          { href: '/business/payrolls', label: '인건비 관리' },
          {
            label: '재무',
            items: [
              { href: '/business/receivables', label: '수금/미수금 관리' },
              { href: '/business/financial', label: '재무 현황' },
            ],
          },
          { href: '/business/users', label: '사용자 관리', badge: pendingUserCount },
          {
            label: '운영',
            items: [
              { href: '/business/products', label: '바코드 제품 등록' },
              { href: '/business/checklists', label: '체크리스트' },
              { href: '/business/reports', label: '리포트' },
              { href: '/business/supply-requests', label: '물품 요청' },
            ],
          },
          {
            label: '설정',
            items: [
              { href: '/business/company', label: '회사 관리' },
            ],
          },
        ]

        const franchiseManagerNav = [
          { href: '/franchise/stores/status', label: '매장 관리 현황' },
        ]

        const storeManagerNav = [
          { href: '/store-manager/dashboard', label: '대시보드' },
          { href: '/store-manager/supplies', label: '물품 요청' },
        ]

  const platformAdminNav = [
    { href: '/platform/dashboard', label: '시스템 대시보드' },
    { href: '/platform/companies', label: '전체 회사' },
    { href: '/platform/billing', label: '결제 관리' },
    { href: '/platform/settings', label: '시스템 설정' },
  ]

  // 평면적 배열인 경우를 위한 변환
  const getNavItems = (): (NavItem | NavGroup)[] => {
    if (userRole === 'staff') {
      return staffNav.map(item => ({ href: item.href, label: item.label }))
    }
    if (userRole === 'manager') {
      return managerNav.map(item => ({ href: item.href, label: item.label }))
    }
    if (userRole === 'business_owner') {
      return businessOwnerNav
    }
    if (userRole === 'franchise_manager') {
      return franchiseManagerNav.map(item => ({ href: item.href, label: item.label }))
    }
    if (userRole === 'store_manager') {
      return storeManagerNav.map(item => ({ href: item.href, label: item.label }))
    }
    if (userRole === 'platform_admin') {
      return platformAdminNav.map(item => ({ href: item.href, label: item.label }))
    }
    return adminNav.map(item => ({ href: item.href, label: item.label }))
  }

  const navItems = getNavItems()

  // 경로가 활성화되어 있는지 확인
  const isActive = (href: string): boolean => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // 그룹의 항목 중 하나가 활성화되어 있는지 확인
  const isGroupActive = (group: NavGroup): boolean => {
    if (group.href) {
      return isActive(group.href)
    }
    if (group.items) {
      return group.items.some(item => isActive(item.href))
    }
    return false
  }

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
            <Link href="/mobile-dashboard" className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2">
              <span className="text-lg md:text-xl font-bold">무플 (MUPL)</span>
              <span className="text-xs lg:text-sm text-blue-200">무인·현장 운영 관리 플랫폼</span>
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

  const renderNavItem = (item: NavItem | NavGroup, index: number) => {
    // 단일 링크인 경우 (items가 없는 경우)
    if ('href' in item && !('items' in item)) {
      const navItem = item as NavItem
      return (
        <Link
          key={navItem.href}
          href={navItem.href}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
            isActive(navItem.href)
              ? 'bg-blue-700'
              : 'hover:bg-blue-700/50'
          }`}
        >
          {navItem.label}
          {navItem.badge !== undefined && navItem.badge > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {navItem.badge}
            </span>
          )}
        </Link>
      )
    }

    // 드롭다운 그룹인 경우
    const group = item as NavGroup
    const isOpen = openDropdown === `dropdown-${index}`
    const isActiveGroup = isGroupActive(group)

    return (
      <div
        key={`group-${index}`}
        className="relative"
        ref={(el) => {
          dropdownRef.current[`dropdown-${index}`] = el
        }}
      >
        <button
          onClick={() => setOpenDropdown(isOpen ? null : `dropdown-${index}`)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
            isActiveGroup
              ? 'bg-blue-700'
              : 'hover:bg-blue-700/50'
          }`}
        >
          {group.label}
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && group.items && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
            {group.items.map((subItem) => (
              <Link
                key={subItem.href}
                href={subItem.href}
                onClick={() => setOpenDropdown(null)}
                className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${
                  isActive(subItem.href) ? 'bg-blue-50 text-blue-700 font-medium' : ''
                }`}
              >
                {subItem.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <div className="flex items-center gap-2 lg:gap-4">
              {userRole === 'business_owner' ? (
                <Link href="/business/dashboard" className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2">
                  <span className="text-xl font-bold">무플 (MUPL)</span>
                  <span className="text-sm text-blue-200 hidden lg:inline">|</span>
                  <span className="text-xs lg:text-sm text-blue-200">무인·현장 운영 관리 플랫폼</span>
                </Link>
              ) : userRole === 'franchise_manager' ? (
                <Link href="/franchise/stores/status" className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2">
                  <span className="text-xl font-bold">무플 (MUPL)</span>
                  <span className="text-sm text-blue-200 hidden lg:inline">|</span>
                  <span className="text-xs lg:text-sm text-blue-200">무인·현장 운영 관리 플랫폼</span>
                </Link>
              ) : userRole === 'store_manager' ? (
                <Link href="/store-manager/dashboard" className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2">
                  <span className="text-xl font-bold">무플 (MUPL)</span>
                  <span className="text-sm text-blue-200 hidden lg:inline">|</span>
                  <span className="text-xs lg:text-sm text-blue-200">무인·현장 운영 관리 플랫폼</span>
                </Link>
              ) : (
                <Link href="/" className="text-xl font-bold">
                  청소 관리
                </Link>
              )}
              {/* 점주앱 새로고침 버튼 */}
              {userRole === 'store_manager' && (
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).refreshStoreStatuses) {
                      ;(window as any).refreshStoreStatuses()
                    }
                  }}
                  disabled={isRefreshingStore}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                  title="새로고침"
                >
                  <svg
                    className={`w-4 h-4 ${isRefreshingStore ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {isRefreshingStore && (
                    <span className="hidden lg:inline">새로고침 중...</span>
                  )}
                </button>
              )}
            </div>
            <div className="hidden md:flex space-x-4">
              {navItems.map((item, index) => renderNavItem(item, index))}
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

