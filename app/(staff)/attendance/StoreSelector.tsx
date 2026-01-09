'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Store } from '@/types/db'
import { getCurrentHourKST, isWithinManagementPeriod, calculateWorkDateForNightShift, getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

interface StoreSelectorProps {
  selectedStoreId: string
  onSelectStore: (storeId: string) => void
  disabled?: boolean // 출근 후 매장 선택 불가
  excludeStoreIds?: string[] // 제외할 매장 ID 목록 (이미 출근한 매장)
  showOnlyTodayManagement?: boolean // true: 오늘 관리 요일인 매장만, false: 오늘 관리 요일이 아닌 매장만, undefined: 모든 매장
}

// StoreSelector에서 사용하는 최소 필드 타입
type StoreSelectorStore = Pick<Store, 'id' | 'name' | 'company_id' | 'deleted_at' | 'management_days' | 'is_night_shift' | 'work_start_hour' | 'work_end_hour'>

export default function StoreSelector({ selectedStoreId: propSelectedStoreId, onSelectStore, disabled = false, excludeStoreIds = [], showOnlyTodayManagement = true }: StoreSelectorProps) {
  const [stores, setStores] = useState<StoreSelectorStore[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>(propSelectedStoreId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAssignedStores()
  }, [showOnlyTodayManagement, excludeStoreIds])

  const loadAssignedStores = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    // 배정된 매장 조회
    console.log('=== StoreSelector Debug ===')
    console.log('User ID:', session.user.id)
    console.log('User Email:', session.user.email)
    
    const { data: assignments, error: assignError } = await supabase
      .from('store_assign')
      .select('store_id, id, created_at')
      .eq('user_id', session.user.id)

    console.log('Store Assign Query Result:')
    console.log('  - Data:', assignments)
    console.log('  - Error:', assignError)
    console.log('  - Error Code:', assignError?.code)
    console.log('  - Error Message:', assignError?.message)
    console.log('  - Error Details:', assignError?.details)
    console.log('  - Error Hint:', assignError?.hint)

    if (assignError) {
      console.error('Error fetching store assignments:', assignError)
      setError(`매장 배정 정보를 불러오는 데 실패했습니다: ${assignError.message} (코드: ${assignError.code || 'N/A'})`)
      setLoading(false)
      return
    }

    if (!assignments || assignments.length === 0) {
      console.log('No store assignments found for user:', session.user.id)
      setLoading(false)
      return
    }

    console.log('Found store assignments:', assignments)

    const storeIds = assignments.map((a) => a.store_id)
    console.log('Store IDs to fetch:', storeIds)
    console.log('Number of store IDs:', storeIds.length)
    
    if (storeIds.length === 0) {
      console.log('No store IDs to fetch')
      setLoading(false)
      return
    }
    
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('id, name, company_id, deleted_at, management_days, is_night_shift, work_start_hour, work_end_hour')
      .in('id', storeIds)
      .is('deleted_at', null)

    console.log('=== Stores Query Result ===')
    console.log('  - Data:', storesData)
    console.log('  - Data Length:', storesData?.length || 0)
    console.log('  - Error:', storesError)
    console.log('  - Error Code:', storesError?.code)
    console.log('  - Error Message:', storesError?.message)
    console.log('  - Error Details:', storesError?.details)
    console.log('  - Error Hint:', storesError?.hint)
    
    if (storesData && storesData.length > 0) {
      console.log('✅ Successfully fetched stores:', storesData.map(s => ({ id: s.id, name: s.name })))
    } else if (!storesError) {
      console.warn('⚠️ No stores returned, but no error. Possible RLS issue.')
    }

    if (storesError) {
      console.error('Error fetching store details:', storesError)
      setError(`매장 정보를 불러오는 데 실패했습니다: ${storesError.message} (코드: ${storesError.code || 'N/A'})`)
      setLoading(false)
      return
    }

    console.log('Final stores:', storesData)

    // 출근 기록 조회 (연속 관리일 체크용)
    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()
    
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('store_id, clock_out_at, work_date')
      .eq('user_id', session.user.id)
      .eq('work_date', today)

    const { data: yesterdayAttendance } = await supabase
      .from('attendance')
      .select('store_id, clock_out_at, work_date')
      .eq('user_id', session.user.id)
      .eq('work_date', yesterday)
      .order('clock_in_at', { ascending: false })
      .limit(10)

    // 출근 기록 맵 생성
    const attendanceMap = new Map<string, { status: 'not_clocked_in' | 'clocked_in' | 'clocked_out', workDate: string | null }>()
    
    if (todayAttendance) {
      todayAttendance.forEach((attendance: any) => {
        if (attendance.work_date === today) {
          if (attendance.clock_out_at) {
            attendanceMap.set(attendance.store_id, { status: 'clocked_out', workDate: attendance.work_date })
          } else {
            attendanceMap.set(attendance.store_id, { status: 'clocked_in', workDate: attendance.work_date })
          }
        }
      })
    }
    
    if (yesterdayAttendance) {
      yesterdayAttendance.forEach((attendance: any) => {
        if (!attendanceMap.has(attendance.store_id)) {
          if (attendance.clock_out_at) {
            attendanceMap.set(attendance.store_id, { status: 'clocked_out', workDate: attendance.work_date })
          } else {
            attendanceMap.set(attendance.store_id, { status: 'clocked_in', workDate: attendance.work_date })
          }
        }
      })
    }

    // 오늘의 요일 확인
    const todayDate = new Date()
    const dayOfWeek = todayDate.getDay() // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[dayOfWeek]
    
    // 현재 시간 (KST)
    const currentHour = getCurrentHourKST()
    
    // 관리일 확인 헬퍼 함수
    const checkIfDateIsManagementDay = (dateStr: string, managementDays: string): boolean => {
      const dateObj = new Date(dateStr + 'T00:00:00+09:00')
      const dayIndex = dateObj.getDay()
      const dayName = dayNames[dayIndex]
      const days = managementDays.split(',').map(d => d.trim())
      return days.includes(dayName)
    }
    
    // showOnlyTodayManagement에 따라 필터링
    const filteredStores = (storesData || []).filter((store) => {
      // management_days가 없으면 모든 요일 허용 (기존 매장 호환성)
      if (!store.management_days || store.management_days.trim() === '') {
        // management_days가 없으면 showOnlyTodayManagement가 false일 때만 포함
        return showOnlyTodayManagement === false
      }
      
      // 출근 기록 확인
      const attendanceData = attendanceMap.get(store.id)
      const attendanceWorkDate = attendanceData?.workDate || null
      const attendanceStatus = attendanceData?.status || 'not_clocked_in'
      
      // 야간 매장의 경우: 출근 기록이 있으면 work_date 기준으로만 판단 (단순화)
      if (store.is_night_shift && attendanceWorkDate) {
        const workDateIsManagementDay = checkIfDateIsManagementDay(attendanceWorkDate, store.management_days)
        
        // 출근 완료 상태이고 연속 관리일인 경우: work_start_hour 이후에만 새로운 관리일로 인정
        if (attendanceStatus === 'clocked_out' && 
            store.work_start_hour !== null && 
            store.work_start_hour !== undefined) {
          const currentDate = getTodayDateKST()
          const currentDateIsManagementDay = checkIfDateIsManagementDay(currentDate, store.management_days)
          
          // 연속 관리일이고 work_start_hour 이후면 새로운 관리일 시작
          if (workDateIsManagementDay && currentDateIsManagementDay && currentHour >= store.work_start_hour) {
            const isManagementDay = true  // 새로운 관리일 시작
            if (showOnlyTodayManagement === true) {
              return isManagementDay
            } else if (showOnlyTodayManagement === false) {
              return !isManagementDay
            } else {
              return true
            }
          }
        }
        
        // 출근 기록의 work_date 기준으로만 판단
        const isManagementDay = workDateIsManagementDay
        if (showOnlyTodayManagement === true) {
          return isManagementDay
        } else if (showOnlyTodayManagement === false) {
          return !isManagementDay
        } else {
          return true
        }
      }
      
      // 출근 기록이 없는 경우 (야간 매장 또는 일반 매장)
      if (!attendanceWorkDate) {
        if (store.is_night_shift && store.work_start_hour !== null && store.work_start_hour !== undefined) {
          // 야간 매장: 현재 날짜가 관리일이고 work_start_hour 이후인지 확인
          const currentDate = getTodayDateKST()
          const currentDateIsManagementDay = checkIfDateIsManagementDay(currentDate, store.management_days)
          const isManagementDay = currentDateIsManagementDay && currentHour >= store.work_start_hour
          
          if (showOnlyTodayManagement === true) {
            return isManagementDay
          } else if (showOnlyTodayManagement === false) {
            return !isManagementDay
          } else {
            return true
          }
        } else {
          // 일반 매장 또는 work_start_hour가 없는 경우: 현재 날짜가 관리일인지 확인
          const currentDate = getTodayDateKST()
          const isManagementDay = checkIfDateIsManagementDay(currentDate, store.management_days)
          
          if (showOnlyTodayManagement === true) {
            return isManagementDay
          } else if (showOnlyTodayManagement === false) {
            return !isManagementDay
          } else {
            return true
          }
        }
      }
      
      // 일반 매장의 경우: 출근 기록의 work_date 기준으로 판단
      const workDateIsManagementDay = checkIfDateIsManagementDay(attendanceWorkDate, store.management_days)
      if (showOnlyTodayManagement === true) {
        return workDateIsManagementDay
      } else if (showOnlyTodayManagement === false) {
        return !workDateIsManagementDay
      } else {
        return true
      }
    })

    console.log('Today:', todayDayName)
    console.log('Filtered stores:', filteredStores)
    console.log('showOnlyTodayManagement:', showOnlyTodayManagement)

    // excludeStoreIds에는 이미 출근한 매장만 포함 (퇴근 완료된 매장은 제외하지 않음)
    // 따라서 퇴근 완료된 매장은 다시 출근 가능
    const availableStores = filteredStores.filter(
      store => !excludeStoreIds.includes(store.id)
    )
    
    setStores(availableStores)
    if (availableStores.length > 0) {
      if (!propSelectedStoreId) {
        setSelectedStoreId(availableStores[0].id)
        onSelectStore(availableStores[0].id)
      } else if (availableStores.find(s => s.id === propSelectedStoreId)) {
        setSelectedStoreId(propSelectedStoreId)
      } else {
        setSelectedStoreId(availableStores[0].id)
        onSelectStore(availableStores[0].id)
      }
    }
    setLoading(false)
  }

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId)
    onSelectStore(storeId)
  }

  if (loading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
        <p className="text-sm text-gray-500">매장 목록 로딩 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    )
  }

  if (stores.length === 0) {
    if (error) {
      return (
        <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )
    }
    
    // 오늘의 요일 확인
    const today = new Date()
    const dayOfWeek = today.getDay()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[dayOfWeek]
    
    if (excludeStoreIds.length > 0 && showOnlyTodayManagement) {
      return (
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-50">
          <p className="text-sm text-blue-800">
            {showOnlyTodayManagement 
              ? `오늘(${todayDayName}요일) 관리 요일인 모든 매장에 출근했습니다.`
              : '모든 매장에 출근했습니다.'}
          </p>
        </div>
      )
    }
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50">
        <p className="text-sm text-yellow-800">
          {showOnlyTodayManagement === false
            ? `오늘(${todayDayName}요일) 관리 요일이 아닌 배정 매장이 없습니다.`
            : showOnlyTodayManagement === true
            ? `오늘(${todayDayName}요일) 관리 요일인 배정 매장이 없습니다.`
            : '배정된 매장이 없습니다.'}
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          관리자에게 문의하거나 매장의 관리 요일을 확인하세요.
        </p>
      </div>
    )
  }

  return (
    <div>
      <select
        value={selectedStoreId}
        onChange={(e) => handleStoreChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      >
        <option value="">매장을 선택하세요</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
      {disabled && (
        <p className="mt-1 text-xs text-orange-600">
          관리시작 후에는 매장을 변경할 수 없습니다.
        </p>
      )}
    </div>
  )
}
