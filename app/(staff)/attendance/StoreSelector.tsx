'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Store } from '@/types/db'
import { getCurrentHourKST } from '@/lib/utils/date'

interface StoreSelectorProps {
  selectedStoreId: string
  onSelectStore: (storeId: string) => void
  disabled?: boolean // 출근 후 매장 선택 불가
  excludeStoreIds?: string[] // 제외할 매장 ID 목록 (이미 출근한 매장)
  showOnlyTodayManagement?: boolean // true: 오늘 관리 요일인 매장만, false: 오늘 관리 요일이 아닌 매장만, undefined: 모든 매장
  onSelectableStoresChange?: (stores: { id: string; name: string }[]) => void // 선택 가능한 매장 목록 (버튼 라벨·개수 표시용)
}

// StoreSelector에서 사용하는 최소 필드 타입
type StoreSelectorStore = Pick<Store, 'id' | 'name' | 'company_id' | 'deleted_at' | 'management_days' | 'is_night_shift' | 'work_start_hour' | 'work_end_hour' | 'service_active'>

const isDev = process.env.NODE_ENV !== 'production'
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args)
}

export default function StoreSelector({ selectedStoreId: propSelectedStoreId, onSelectStore, disabled = false, excludeStoreIds = [], showOnlyTodayManagement = true, onSelectableStoresChange }: StoreSelectorProps) {
  const [stores, setStores] = useState<StoreSelectorStore[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>(propSelectedStoreId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // excludeStoreIds는 값 기준 비교(문자열화)로 불필요한 재요청 방지
  const excludeStoreIdsKey = (excludeStoreIds ?? []).slice().sort().join(',')
  useEffect(() => {
    loadAssignedStores()
  }, [showOnlyTodayManagement, excludeStoreIdsKey])

  const loadAssignedStores = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    try {
      const res = await fetch('/api/staff/assigned-stores')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || '매장 목록을 불러오는데 실패했습니다.')
      }

      if (!json.success || !json.data) {
        setStores([])
        setCurrentUserRole(json.role ?? null)
        setLoading(false)
        return
      }

      setCurrentUserRole(json.role ?? null)
      const storesData: StoreSelectorStore[] = json.data
      devLog('Assigned stores from API:', storesData.length, storesData)

      // 오늘의 요일 확인
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[dayOfWeek]
    
    // 어제의 요일 확인 (야간 매장 날짜 경계 처리용)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDayOfWeek = yesterday.getDay()
    const yesterdayDayName = dayNames[yesterdayDayOfWeek]
    
    // 현재 시간 (KST)
    const currentHour = getCurrentHourKST()
    
    // showOnlyTodayManagement에 따라 필터링
    const filteredStores = (storesData || []).filter((store) => {
      // 비활성 매장은 직원앱에서 제외
      if (store.service_active === false) return false
      // management_days가 없으면 모든 요일 허용 (기존 매장 호환성)
      const mdCheck = store.management_days
      const mdStr = Array.isArray(mdCheck) ? mdCheck.join(',') : (mdCheck || '')
      if (!mdStr || mdStr.trim() === '') {
        // management_days가 없으면 showOnlyTodayManagement가 false일 때만 포함
        return showOnlyTodayManagement === false
      }
      
      // 야간 매장인 경우 날짜 경계 처리
      let checkDayName = todayDayName
      let isManagementDay = false
      
      if (store.is_night_shift) {
        // work_end_hour 기준으로 관리일에 속하는 날짜 결정
        let dateToCheck: Date
        const endHour = store.work_end_hour ?? 8  // 기본값 8시 (하위 호환성)
        
        if (currentHour < endHour) {
          // work_end_hour 이전 = 전날 관리일 확인
          const yesterday = new Date()
          const kstOffset = 9 * 60
          const utc = yesterday.getTime() + (yesterday.getTimezoneOffset() * 60 * 1000)
          const kst = new Date(utc + (kstOffset * 60 * 1000))
          kst.setDate(kst.getDate() - 1)
          dateToCheck = kst
        } else {
          // work_start_hour 이후 = 당일 관리일 확인
          const today = new Date()
          const kstOffset = 9 * 60
          const utc = today.getTime() + (today.getTimezoneOffset() * 60 * 1000)
          dateToCheck = new Date(utc + (kstOffset * 60 * 1000))
        }
        
        checkDayName = dayNames[dateToCheck.getDay()]
        const workDate = dateToCheck.toISOString().split('T')[0]
        devLog(`🌙 야간 매장 ${store.name}: work_end_hour(${endHour}) 기준 → work_date(${workDate}, ${checkDayName}요일)`)
      }
      
      // management_days에서 확인할 요일이 포함되어 있는지 확인
      // 형식: "월,수,금" 또는 "월수금" 또는 배열 ["월","수","금"] 둘 다 처리
      const mdRaw = store.management_days
      const managementDays = (Array.isArray(mdRaw) ? mdRaw.join(',') : (mdRaw || '')).replace(/\s/g, '')
      const dayList = managementDays.split(',').map(d => d.trim())
      
      // 쉼표로 구분된 경우와 그렇지 않은 경우 모두 처리
      if (dayList.length > 1) {
        // "월,수,금" 형식
        isManagementDay = dayList.includes(checkDayName)
      } else {
        // "월수금" 형식 - 각 요일 글자 하나씩 확인
        isManagementDay = managementDays.includes(checkDayName)
      }
      
      // showOnlyTodayManagement에 따라 반환
      if (showOnlyTodayManagement === true) {
        return isManagementDay // 확인한 날짜가 관리 요일인 매장만
      } else if (showOnlyTodayManagement === false) {
        return !isManagementDay // 확인한 날짜가 관리 요일이 아닌 매장만
      } else {
        return true // 모든 매장
      }
    })

    devLog('Today:', todayDayName)
    devLog('Filtered stores:', filteredStores)
    devLog('showOnlyTodayManagement:', showOnlyTodayManagement)

    // excludeStoreIds에는 이미 출근한 매장만 포함 (퇴근 완료된 매장은 제외하지 않음)
    // 따라서 퇴근 완료된 매장은 다시 출근 가능
    const availableStores = filteredStores.filter(
      store => !excludeStoreIds.includes(store.id)
    )
    
    setStores(availableStores)
    onSelectableStoresChange?.(availableStores.map(s => ({ id: s.id, name: s.name })))
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
    } catch (err) {
      console.error('Error fetching assigned stores:', err)
      setError(err instanceof Error ? err.message : '매장 목록을 불러오는데 실패했습니다.')
      setLoading(false)
    }
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
        {currentUserRole === 'business_owner' && showOnlyTodayManagement !== false ? (
          <p className="text-xs text-yellow-700 mt-1">
            직원모드로 사용하려면{' '}
            <Link href="/business/users" className="underline font-medium text-blue-700 hover:text-blue-800">
              사용자 등록/관리
            </Link>
            에서 본인에게 매장을 배정해 주세요.
          </p>
        ) : (
          <p className="text-xs text-yellow-700 mt-1">
            관리자에게 문의하거나 매장의 관리 요일을 확인하세요.
          </p>
        )}
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
