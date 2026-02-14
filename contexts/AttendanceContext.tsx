'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attendance } from '@/types/db'

interface AttendanceContextType {
  attendances: Attendance[]
  attendance: Attendance | null
  storeId: string | null
  activeStoreIds: string[]
  isClockedIn: boolean
  isClockedOut: boolean
  loading: boolean
  error: string | null
  refresh: () => void
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined)

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAttendance = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLoading(false)
      return
    }

    // RLS 우회: API를 통해 서비스 역할로 attendance 조회
    try {
      const res = await fetch('/api/staff/attendance')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || '출근 정보를 불러올 수 없습니다.')
      }

      if (json.success && json.data) {
        setAttendances(json.data)
        setError(null)
      } else {
        setAttendances([])
        setError(json.error || null)
      }
    } catch (err: any) {
      console.error('Error loading attendance:', err)
      setError(err?.message || '출근 정보를 불러올 수 없습니다.')
      setAttendances([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  // 페이지 포커스/가시성 변경 시 자동 새로고침 (사파리 호환성 개선)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 페이지가 다시 보이면 출근 정보 새로고침
        loadAttendance()
      }
    }

    const handleFocus = () => {
      // 페이지 포커스 시에도 새로고침
      loadAttendance()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadAttendance])

  const refresh = () => {
    loadAttendance()
  }

  // 퇴근하지 않은 출근 기록들
  const activeAttendances = attendances.filter(a => !a.clock_out_at)
  
  // 가장 최근의 활성 출근 기록 (첫 번째)
  const activeAttendance = activeAttendances[0] || null
  
  // 모든 활성 출근 매장 ID 목록
  const activeStoreIds = activeAttendances.map(a => a.store_id)

  const value: AttendanceContextType = {
    attendances, // 모든 출근 기록
    attendance: activeAttendance, // 가장 최근 활성 출근 기록 (하위 호환성)
    storeId: activeAttendance?.store_id || null, // 가장 최근 활성 출근 매장 ID (하위 호환성)
    activeStoreIds, // 모든 활성 출근 매장 ID 목록
    isClockedIn: activeAttendances.length > 0, // 하나라도 출근 중이면 true
    isClockedOut: attendances.every(a => !!a.clock_out_at), // 모든 출근 기록이 퇴근 완료
    loading,
    error,
    refresh,
  }

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  )
}

export function useTodayAttendance() {
  const context = useContext(AttendanceContext)
  if (context === undefined) {
    throw new Error('useTodayAttendance must be used within an AttendanceProvider')
  }
  return context
}

