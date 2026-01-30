'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import type { BusinessFeatureKey } from '@/lib/plan-features'
import { getAllowedFeatures } from '@/lib/plan-features'

interface NavRoleSwitchProps {
  userRole: 'staff' | 'manager' | 'admin' | 'business_owner' | 'platform_admin' | 'franchise_manager' | 'store_manager'
  userName?: string
  onRefresh?: () => void
  isRefreshing?: boolean
  /** 업체관리자 요금 플랜 (시스템관리자에서 설정, 메뉴/기능 제어용) */
  subscriptionPlan?: 'free' | 'basic' | 'premium'
  /** 업체 구독 상태 (active가 아니면 기능 제한) */
  subscriptionStatus?: 'active' | 'suspended' | 'cancelled'
}

interface NavItem {
  href: string
  label: string
  icon?: string
  badge?: number // 배지에 표시할 숫자
  /** 요금 플랜 기능 키 (business_owner일 때만 사용) */
  feature?: BusinessFeatureKey
}

interface NavGroup {
  label: string
  href?: string // 단일 링크가 있는 경우
  items?: NavItem[] // 드롭다운 항목
  icon?: string
  /** 그룹 전체가 하나의 기능에 묶인 경우 (예: 매장) */
  feature?: BusinessFeatureKey
}

export function NavRoleSwitch({ userRole, userName, onRefresh, isRefreshing, subscriptionPlan = 'free', subscriptionStatus = 'active' }: NavRoleSwitchProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [pendingUserCount, setPendingUserCount] = useState<number>(0)
  const [isRefreshingStore, setIsRefreshingStore] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setIsClient(true)
    // iOS 감지
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent)
    setIsIOS(isIOSDevice)
    
    // 뒤로가기 가능 여부 확인 (히스토리가 있는지)
    setCanGoBack(window.history.length > 1)
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
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      
      // 하위 메뉴 버튼 클릭은 완전히 무시
      if (target.closest('button[type="button"]') && target.closest('.bg-gradient-to-b.from-gray-50.to-white')) {
        return
      }
      
      if (openDropdown) {
        const ref = dropdownRef.current[openDropdown]
        if (ref && !ref.contains(target as Node)) {
          setOpenDropdown(null)
        }
      }
      
      // 모바일 메뉴 외부 클릭 시 닫기
      if (isMobileMenuOpen && mobileMenuRef.current) {
        // 모바일 메뉴 내부 클릭은 완전히 무시
        if (mobileMenuRef.current.contains(target as Node)) {
          // 하위 메뉴 버튼 클릭도 명시적으로 무시
          if (target.closest('button[type="button"]') && target.closest('.bg-gradient-to-b.from-gray-50.to-white')) {
            return
          }
          return
        }
        // 외부 클릭만 메뉴 닫기
        setIsMobileMenuOpen(false)
      }
    }

    // 캡처 단계가 아닌 버블링 단계에서만 처리
    document.addEventListener('mousedown', handleClickOutside, false)
    document.addEventListener('touchstart', handleClickOutside, false)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, false)
      document.removeEventListener('touchstart', handleClickOutside, false)
    }
  }, [openDropdown, isMobileMenuOpen])

  // 모바일 메뉴 열림 시 body 스크롤 방지
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])


  const staffNav = [
    { href: '/attendance', label: '관리시작/종료' },
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
    { href: '/admin/landing', label: '랜딩 페이지 관리' },
    { href: '/admin/reports', label: '리포트' },
  ]

        // 업체 관리자 메뉴 - 그룹화된 구조 (요금 플랜별 기능 키 매핑)
        const businessOwnerNavRaw: (NavItem | NavGroup)[] = [
          { href: '/business/dashboard', label: '대시보드', feature: 'dashboard' },
          { href: '/business/attendance-report', label: '미관리 매장 확인', feature: 'attendance_report' },
          {
            label: '매장',
            feature: 'stores',
            items: [
              { href: '/business/stores', label: '매장 관리', feature: 'stores' },
              { href: '/business/stores/status', label: '매장 상태', feature: 'stores_status' },
              { href: '/business/franchises', label: '프렌차이즈 관리', feature: 'franchises' },
            ],
          },
          { href: '/business/payrolls', label: '인건비 관리', feature: 'payrolls' },
          {
            label: '재무',
            feature: 'receivables',
            items: [
              { href: '/business/receivables', label: '수금/미수금 관리', feature: 'receivables' },
              { href: '/business/financial', label: '재무 현황', feature: 'financial' },
            ],
          },
          { href: '/business/users', label: '사용자 관리', badge: pendingUserCount, feature: 'users' },
          {
            label: '운영',
            feature: 'products',
            items: [
              { href: '/business/products', label: '바코드 제품 등록', feature: 'products' },
              { href: '/business/checklists', label: '체크리스트', feature: 'checklists' },
              { href: '/business/announcements', label: '공지사항 관리', feature: 'announcements' },
              { href: '/business/reports', label: '리포트', feature: 'reports' },
              { href: '/business/supply-requests', label: '물품 요청', feature: 'supply_requests' },
            ],
          },
          {
            label: '설정',
            feature: 'company',
            items: [
              { href: '/business/company', label: '회사 관리', feature: 'company' },
            ],
          },
        ]

        // 요금 플랜에 따라 허용된 메뉴만 표시 (단, 미관리 매장/프렌차이즈/바코드 제품은 베이직에서도 메뉴에 표시하고, 접근 시 업그레이드 안내)
        const allowedFeatures = getAllowedFeatures(subscriptionPlan, subscriptionStatus)
        const menuAlwaysVisible: BusinessFeatureKey[] = ['attendance_report', 'franchises', 'products']
        const hasFeature = (key?: BusinessFeatureKey) =>
          key != null && (allowedFeatures.includes(key) || menuAlwaysVisible.includes(key))
        const businessOwnerNav: (NavItem | NavGroup)[] = businessOwnerNavRaw
          .map((entry) => {
            if ('items' in entry && entry.items) {
              const group = entry as NavGroup
              const allowedItems = group.items!.filter((item) => hasFeature((item as NavItem).feature))
              if (allowedItems.length === 0) return null
              return { ...group, items: allowedItems }
            }
            const item = entry as NavItem
            return hasFeature(item.feature) ? item : null
          })
          .filter((x): x is NavItem | NavGroup => x != null)

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
    { href: '/admin/landing', label: '랜딩 페이지 관리' },
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
    // 정확한 경로 매칭
    if (pathname === href) {
      return true
    }
    
    // 하위 경로 매칭 (단, 특정 경로는 제외)
    // 예: /business/stores는 /business/stores/status와 구분되어야 함
    if (pathname.startsWith(href + '/')) {
      // /business/stores는 /business/stores/status와 구분
      if (href === '/business/stores') {
        // /business/stores/status는 제외
        return !pathname.startsWith('/business/stores/status')
      }
      return true
    }
    
    return false
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
    try {
      // 세션 ID 삭제
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session_id')
      }
      // 로그아웃 API 호출 (세션 삭제 포함)
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    // 로그아웃 페이지로 이동
    window.location.href = '/login'
  }

  if (!isClient) return null

  // 뒤로가기 핸들러
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      // 히스토리가 없으면 대시보드로 이동
      router.push('/mobile-dashboard')
    }
  }

  // 뒤로가기 가능 여부 확인 (루트 페이지가 아니고 히스토리가 있는 경우)
  const showBackButton = isIOS && canGoBack && pathname !== '/mobile-dashboard' && pathname !== '/'

  // 모바일에서는 간단한 헤더만 표시
  if (userRole === 'staff') {
    return (
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* 아이폰용 뒤로가기 버튼 */}
              {showBackButton && (
                <button
                  onClick={handleBack}
                  className="flex-shrink-0 px-2 py-1 md:px-3 md:py-2 bg-blue-700 hover:bg-blue-800 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                  aria-label="뒤로가기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">뒤로</span>
                </button>
              )}
              <Link href="/mobile-dashboard" className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2 flex-1 min-w-0">
                <span className="text-lg md:text-xl font-bold">무플 (MUPL)</span>
                <span className="text-xs lg:text-sm text-blue-200">무인·현장 운영 관리 플랫폼</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
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

  const renderNavItem = (item: NavItem | NavGroup, index: number, isMobile: boolean = false) => {
    // 단일 링크인 경우 (items가 없는 경우)
    if ('href' in item && !('items' in item)) {
      const navItem = item as NavItem
      const baseClasses = isMobile
        ? `block px-4 py-3 text-base font-medium transition-all duration-200 relative ${
            isActive(navItem.href)
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
          }`
        : `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative backdrop-blur-sm ${
            isActive(navItem.href)
              ? 'bg-white/20 text-white shadow-lg border border-white/30'
              : 'hover:bg-white/10 text-white/90 hover:text-white border border-transparent hover:border-white/20'
          }`
      
      return (
        <Link
          key={navItem.href}
          href={navItem.href}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={baseClasses}
        >
          {navItem.label}
          {navItem.badge !== undefined && navItem.badge > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full ml-2 shadow-lg ${
              isMobile ? 'relative' : 'absolute -top-1 -right-1'
            }`}>
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

    if (isMobile) {
      // 모바일에서는 아코디언 형태로 표시
      return (
        <div 
          key={`group-${index}`} 
          className="border-b border-gray-200/50"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenDropdown(isOpen ? null : `dropdown-${index}`)
            }}
            className={`w-full px-4 py-3 text-base font-medium transition-all duration-200 flex items-center justify-between ${
              isActiveGroup
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
            }`}
          >
            <span>{group.label}</span>
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isOpen && group.items && (
            <div 
              className="bg-gradient-to-b from-gray-50 to-white" 
              style={{ position: 'relative', zIndex: 1000 }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {group.items.map((subItem) => {
                const handleSubMenuClick = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (e.nativeEvent) {
                    e.nativeEvent.stopImmediatePropagation()
                  }
                  
                  // 메뉴 닫기
                  setOpenDropdown(null)
                  setIsMobileMenuOpen(false)
                  
                  // 페이지 이동 (window.location 사용으로 확실한 이동)
                  if (typeof window !== 'undefined') {
                    window.location.href = subItem.href
                  }
                }
                
                return (
                  <button
                    key={subItem.href}
                    type="button"
                    onClick={handleSubMenuClick}
                    onMouseDown={handleSubMenuClick}
                    onTouchStart={handleSubMenuClick}
                    className={`w-full text-left block px-8 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${
                      isActive(subItem.href) ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 font-semibold border-l-4 border-blue-600' : ''
                    }`}
                    style={{ 
                      pointerEvents: 'auto',
                      position: 'relative',
                      zIndex: 1001,
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {subItem.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // 데스크톱 버전
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
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 backdrop-blur-sm ${
            isActiveGroup
              ? 'bg-white/20 text-white shadow-lg border border-white/30'
              : 'hover:bg-white/10 text-white/90 hover:text-white border border-transparent hover:border-white/20'
          }`}
        >
          {group.label}
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && group.items && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl py-2 z-50 border border-gray-200/50 overflow-hidden">
            {group.items.map((subItem) => (
              <Link
                key={subItem.href}
                href={subItem.href}
                onClick={() => setOpenDropdown(null)}
                className={`block px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${
                  isActive(subItem.href) ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 font-semibold border-l-4 border-blue-600' : ''
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
    <>
    <nav className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-xl backdrop-blur-sm border-b border-white/10 relative z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 lg:space-x-6">
            {/* 햄버거 메뉴 버튼 (모바일에서만 표시, 왼쪽에 배치) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-all duration-200 active:scale-95"
              aria-label="메뉴 열기"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            <div className="flex items-center gap-2 lg:gap-4">
              {userRole === 'business_owner' ? (
                <Link href="/business/dashboard" className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2 group">
                  <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent group-hover:from-white group-hover:to-white transition-all duration-200">무플 (MUPL)</span>
                  <span className="text-xs lg:text-sm text-blue-100/80 hidden lg:inline">|</span>
                  <span className="text-xs lg:text-sm text-blue-100/70 group-hover:text-blue-100 transition-colors">무인·현장 운영 관리 플랫폼</span>
                </Link>
              ) : userRole === 'franchise_manager' ? (
                <Link href="/franchise/stores/status" className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2 group">
                  <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent group-hover:from-white group-hover:to-white transition-all duration-200">무플 (MUPL)</span>
                  <span className="text-xs lg:text-sm text-blue-100/80 hidden lg:inline">|</span>
                  <span className="text-xs lg:text-sm text-blue-100/70 group-hover:text-blue-100 transition-colors">무인·현장 운영 관리 플랫폼</span>
                </Link>
              ) : userRole === 'store_manager' ? (
                <Link href="/store-manager/dashboard" className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2 group">
                  <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent group-hover:from-white group-hover:to-white transition-all duration-200">무플 (MUPL)</span>
                  <span className="text-xs lg:text-sm text-blue-100/80 hidden lg:inline">|</span>
                  <span className="text-xs lg:text-sm text-blue-100/70 group-hover:text-blue-100 transition-colors">무인·현장 운영 관리 플랫폼</span>
                </Link>
              ) : (
                <Link href="/" className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent hover:from-white hover:to-white transition-all duration-200">
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
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:bg-white/5 backdrop-blur-sm text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 border border-white/20 disabled:opacity-50"
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
            <div className="hidden md:flex space-x-2">
              {navItems.map((item, index) => renderNavItem(item, index))}
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            {userName && (
              <span className="text-xs sm:text-sm hidden md:inline text-blue-100/90 font-medium">
                {userName} <span className="text-blue-200/70">({
                  userRole === 'manager' ? '매니저' : 
                  userRole === 'business_owner' ? '업체관리자' :
                  userRole === 'franchise_manager' ? '프렌차이즈관리자' :
                  userRole === 'store_manager' ? '매장관리자' :
                  userRole === 'platform_admin' ? '시스템관리자' :
                  '관리자'
                })</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 bg-red-500/90 hover:bg-red-600 backdrop-blur-sm rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 border border-red-400/30"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>

    {/* 모바일 메뉴 오버레이 및 사이드바 (nav 밖으로 분리) */}
    <>
      {/* 오버레이 배경 */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          pointerEvents: isMobileMenuOpen ? 'auto' : 'none'
        }}
        onClick={(e) => {
          // 사이드바 내부 클릭은 완전히 무시
          const target = e.target as HTMLElement
          if (mobileMenuRef.current && mobileMenuRef.current.contains(target)) {
            return
          }
          // 외부 클릭만 메뉴 닫기
          setIsMobileMenuOpen(false)
        }}
      />
      {/* 사이드바 (왼쪽에서 슬라이드) */}
      <div
        ref={mobileMenuRef}
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-gradient-to-b from-white via-gray-50 to-white shadow-2xl z-[110] transform transition-transform duration-300 ease-out md:hidden overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 모바일 메뉴 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="font-bold text-xl mb-1">{userName || '사용자'}</p>
              <p className="text-sm text-blue-100/90 font-medium">
                {userRole === 'manager' ? '매니저' : 
                 userRole === 'business_owner' ? '업체관리자' :
                 userRole === 'franchise_manager' ? '프렌차이즈관리자' :
                 userRole === 'store_manager' ? '매장관리자' :
                 userRole === 'platform_admin' ? '시스템관리자' :
                 '관리자'}
              </p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200 active:scale-95"
              aria-label="메뉴 닫기"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 모바일 메뉴 항목 */}
          <div className="flex-1 overflow-y-auto py-2">
            <nav>
              {navItems.map((item, index) => renderNavItem(item, index, true))}
            </nav>
          </div>

          {/* 모바일 메뉴 푸터 */}
          <div className="border-t border-gray-200/50 p-4 bg-gradient-to-t from-gray-50 to-white">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </>
    </>
  )
}

