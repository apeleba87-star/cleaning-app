'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MobileHeaderProps {
  userName: string
}

export default function MobileHeader({ userName }: MobileHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const checkRefreshStatus = () => {
      if (typeof window !== 'undefined' && (window as any).isRefreshingStoreStatuses !== undefined) {
        setIsRefreshing((window as any).isRefreshingStoreStatuses)
      }
    }
    
    checkRefreshStatus()
    const interval = setInterval(checkRefreshStatus, 100) // 100ms마다 확인
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="md:hidden bg-blue-600 text-white border-b border-blue-700 sticky top-0 z-40">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/store-manager/dashboard" className="flex flex-col">
            <span className="text-base font-bold">무플 (MUPL)</span>
            <span className="text-xs text-blue-200">무인·현장 운영 관리 플랫폼</span>
          </Link>
          {/* 모바일 새로고침 버튼 */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).refreshStoreStatuses) {
                ;(window as any).refreshStoreStatuses()
              }
            }}
            disabled={isRefreshing}
            className="px-2 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-500 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1"
            title="새로고침"
          >
            <svg
              className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
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
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-200 hidden sm:inline">{userName}</span>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded-md text-xs font-medium text-white transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

