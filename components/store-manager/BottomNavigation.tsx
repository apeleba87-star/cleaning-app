'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface BottomNavItem {
  href: string
  label: string
  icon: string
  badge?: number
}

export default function BottomNavigation() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [supplyRequestBadge, setSupplyRequestBadge] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 물품 요청 배지 수 계산 함수
  const calculateBadgeCount = (storeStatuses: any[]) => {
    if (!storeStatuses || !Array.isArray(storeStatuses)) return 0
    return storeStatuses.reduce((sum: number, store: any) => {
      return sum + (store.manager_in_progress_supply_request_count || 0)
    }, 0)
  }

  // 물품 요청 배지 수 로드
  useEffect(() => {
    if (!mounted) return
    
    const updateBadge = () => {
      // 전역 함수를 통해 대시보드의 데이터를 사용
      if (typeof window !== 'undefined' && (window as any).getStoreStatuses) {
        const storeStatuses = (window as any).getStoreStatuses()
        if (storeStatuses && Array.isArray(storeStatuses) && storeStatuses.length > 0) {
          const count = calculateBadgeCount(storeStatuses)
          setSupplyRequestBadge(count)
          return
        }
      }

      // 전역 데이터가 없으면 초기 로드만 (한 번만)
      const loadBadgeCount = async () => {
        try {
          const lastLoadKey = 'bottomNav_lastLoad'
          const lastLoadTime = localStorage.getItem(lastLoadKey)
          const now = Date.now()
          const MIN_INTERVAL = 60000 // 1분

          if (lastLoadTime && now - parseInt(lastLoadTime, 10) < MIN_INTERVAL) {
            // 최소 간격 미달, 스킵
            return
          }

          const response = await fetch('/api/store-manager/stores/status')
          if (response.ok) {
            const data = await response.json()
            if (data.data && Array.isArray(data.data)) {
              const count = calculateBadgeCount(data.data)
              setSupplyRequestBadge(count)
              localStorage.setItem(lastLoadKey, now.toString())
            }
          }
        } catch (error) {
          console.error('Error loading supply request badge:', error)
        }
      }

      loadBadgeCount()
    }

    // 초기 로드
    updateBadge()

    // 대시보드에서 데이터 업데이트 시 이벤트 리스너
    const handleStoreStatusesUpdated = (event: any) => {
      if (event.detail && Array.isArray(event.detail)) {
        const count = calculateBadgeCount(event.detail)
        setSupplyRequestBadge(count)
      }
    }

    window.addEventListener('storeStatusesUpdated', handleStoreStatusesUpdated as EventListener)
    
    return () => {
      window.removeEventListener('storeStatusesUpdated', handleStoreStatusesUpdated as EventListener)
    }
  }, [mounted])

  if (!mounted) {
    return null
  }

  const navItems: BottomNavItem[] = [
    {
      href: '/store-manager/dashboard',
      label: '대시보드',
      icon: '📊',
    },
    {
      href: '/store-manager/supplies',
      label: '물품요청란',
      icon: '📦',
      badge: supplyRequestBadge,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/store-manager/dashboard') {
      return pathname === '/store-manager/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 transition-colors touch-manipulation ${
                active
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <span className="text-2xl mb-1">{item.icon}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium truncate w-full text-center ${active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

