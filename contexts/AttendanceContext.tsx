'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attendance } from '@/types/db'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

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

    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()
    
    // 오늘 출근 기록 조회
    const { data: todayData, error: todayError } = await supabase
      .from('attendance')
      .select('id, user_id, store_id, work_date, clock_in_at, clock_in_latitude, clock_in_longitude, clock_out_at, clock_out_latitude, clock_out_longitude, selfie_url, attendance_type, scheduled_date, problem_report_id, change_reason, created_at, updated_at')
      .eq('user_id', session.user.id)
      .eq('work_date', today)
    
    // 어제 날짜의 미퇴근 기록도 조회 (출근일 변경 케이스 및 날짜 경계를 넘는 야간 근무 고려)
    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from('attendance')
      .select('id, user_id, store_id, work_date, clock_in_at, clock_in_latitude, clock_in_longitude, clock_out_at, clock_out_latitude, clock_out_longitude, selfie_url, attendance_type, scheduled_date, problem_report_id, change_reason, created_at, updated_at')
      .eq('user_id', session.user.id)
      .eq('work_date', yesterday)
      .is('clock_out_at', null) // 미퇴근 기록만
    
    // 오늘 기록과 어제 미퇴근 기록 합치기
    const allData = [
      ...(todayData || []),
      ...(yesterdayData || [])
    ].sort((a, b) => {
      const dateA = new Date(a.clock_in_at).getTime()
      const dateB = new Date(b.clock_in_at).getTime()
      return dateB - dateA // 내림차순 (최신순)
    })
    
    if (todayError || yesterdayError) {
      console.error('Error loading attendance:', todayError || yesterdayError)
      setError((todayError || yesterdayError)?.message || '출근 정보를 불러올 수 없습니다.')
    } else {
      setAttendances(allData)
      setError(null)
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

