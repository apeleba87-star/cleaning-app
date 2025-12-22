'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attendance } from '@/types/db'
import { getTodayDateKST } from '@/lib/utils/date'

export function useTodayAttendance() {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAttendance()
  }, [])

  const loadAttendance = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLoading(false)
      return
    }

    const today = getTodayDateKST()
    // 오늘 출근 기록만 조회 (한국 시간대 기준)
    const { data: todayData, error: todayError } = await supabase
      .from('attendance')
      .select('id, user_id, store_id, work_date, clock_in_at, clock_in_latitude, clock_in_longitude, clock_out_at, clock_out_latitude, clock_out_longitude, selfie_url, created_at, updated_at')
      .eq('user_id', session.user.id)
      .eq('work_date', today)
    
    // 오늘 날짜의 출근 기록만 사용 (어제 기록 제외)
    const allData = (todayData || []).sort((a, b) => {
      const dateA = new Date(a.clock_in_at).getTime()
      const dateB = new Date(b.clock_in_at).getTime()
      return dateB - dateA // 내림차순 (최신순)
    })
    
    if (todayError) {
      console.error('Error loading attendance:', todayError)
      setError(todayError.message)
    } else {
      setAttendances(allData)
    }
    setLoading(false)
  }

  const refresh = () => {
    loadAttendance()
  }

  // 퇴근하지 않은 출근 기록들
  const activeAttendances = attendances.filter(a => !a.clock_out_at)
  
  // 가장 최근의 활성 출근 기록 (첫 번째)
  const activeAttendance = activeAttendances[0] || null
  
  // 모든 활성 출근 매장 ID 목록
  const activeStoreIds = activeAttendances.map(a => a.store_id)

  return {
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
}

