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
  const [checklistBadge, setChecklistBadge] = useState(0)
  const [supplyBadge, setSupplyBadge] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 체크리스트 및 물품 요청 배지 수 로드
  useEffect(() => {
    if (!mounted) return
    
    const loadBadgeCounts = async () => {
      try {
        const supabase = await import('@/lib/supabase/client').then(m => m.createClient())
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // 체크리스트 미완료 건수
        const { data: attendances } = await supabase
          .from('attendance')
          .select('store_id, clock_out_at')
          .eq('user_id', session.user.id)
          .gte('work_date', new Date().toISOString().split('T')[0])
          .is('clock_out_at', null)

        if (attendances && attendances.length > 0) {
          const storeIds = attendances.map(a => a.store_id)
          let incompleteCount = 0

          for (const storeId of storeIds) {
            try {
              const { data: checklists } = await supabase
                .from('checklist')
                .select('items')
                .eq('store_id', storeId)
                .eq('work_date', new Date().toISOString().split('T')[0])
                .limit(1)

              if (checklists && checklists.length > 0) {
                const checklist = checklists[0]
                const { calculateChecklistProgress } = await import('@/lib/utils/checklist')
                const progress = calculateChecklistProgress(checklist as any, 'all')
                if (progress.percentage < 100) {
                  incompleteCount += (progress.total - progress.completed)
                }
              }
            } catch (err) {
              console.error('Error loading checklist progress:', err)
            }
          }

          setChecklistBadge(incompleteCount > 0 ? incompleteCount : 0)
        }

        // 물품 요청 대기 건수는 필요시 추가
        // 현재는 0으로 유지
        setSupplyBadge(0)
      } catch (error) {
        console.error('Error loading badge counts:', error)
      }
    }

    loadBadgeCounts()
    // 30초마다 배지 업데이트
    const interval = setInterval(loadBadgeCounts, 30000)
    return () => clearInterval(interval)
  }, [mounted])

  if (!mounted) {
    return null
  }

  const navItems: BottomNavItem[] = [
    {
      href: '/mobile-dashboard',
      label: '대시보드',
      icon: '🏠',
    },
    {
      href: '/attendance',
      label: '출퇴근',
      icon: '⏰',
    },
    {
      href: '/checklist',
      label: '체크리스트',
      icon: '✅',
      badge: checklistBadge,
    },
    {
      href: '/photos',
      label: '청소 사진',
      icon: '📸',
    },
    {
      href: '/supplies',
      label: '물품 요청',
      icon: '📦',
      badge: supplyBadge,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/mobile-dashboard') {
      return pathname === '/mobile-dashboard'
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

