'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { GPSLocation } from '@/types/db'

// GeoGuard 컴포넌트를 Dynamic Import로 로드 (GPS 기능이 필요할 때만 로드)
const GeoGuard = dynamic(
  () => import('@/components/GeoGuard').then(mod => ({ default: mod.GeoGuard })),
  {
    ssr: false,
  }
)
import { clockInAction, clockOutAction } from './actions'
import { createClient } from '@/lib/supabase/client'
import { Attendance } from '@/types/db'
import StoreSelector from './StoreSelector'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'
import { useTodayAttendance } from '@/contexts/AttendanceContext'
import { calculateChecklistProgress } from '@/lib/utils/checklist'

// 네트워크 상태 타입 확장
interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
    addEventListener?: (event: string, handler: () => void) => void
  }
  mozConnection?: NavigatorWithConnection['connection']
  webkitConnection?: NavigatorWithConnection['connection']
}

// 네트워크 상태 감지 함수
function getNetworkStatus(): 'online' | 'offline' | 'slow' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown'
  if (!navigator.onLine) return 'offline'
  
  const nav = navigator as NavigatorWithConnection
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection
  
  if (!connection) return 'unknown'
  
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    return 'slow'
  }
  
  return 'online'
}

interface AttendanceWithStore extends Attendance {
  stores?: { name: string }
}

export default function AttendancePage() {
  const router = useRouter()
  const [location, setLocation] = useState<GPSLocation | null>(null)
  const [todayAttendances, setTodayAttendances] = useState<AttendanceWithStore[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [checklistProgress, setChecklistProgress] = useState<Record<string, { completed: number; total: number; percentage: number }>>({})
  
  // Context의 refresh 함수 가져오기 (출근/퇴근 후 전역 상태 업데이트용)
  const { refresh: refreshAttendanceContext } = useTodayAttendance()
  // 출근 유형 관련 상태
  const [attendanceType, setAttendanceType] = useState<'regular' | 'rescheduled' | 'emergency'>('regular')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [problemReportId, setProblemReportId] = useState<string>('')
  const [changeReason, setChangeReason] = useState<string>('')
  
  // 네트워크 상태
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow' | 'unknown'>(() => getNetworkStatus())

  // 출근 유형 변경 시 매장 선택 초기화
  useEffect(() => {
    setSelectedStoreId('')
  }, [attendanceType])

  // 네트워크 상태 모니터링
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(getNetworkStatus())
    }

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
    
    const nav = navigator as NavigatorWithConnection
    if (nav.connection) {
      nav.connection.addEventListener?.('change', updateNetworkStatus)
    } else if (nav.mozConnection) {
      nav.mozConnection.addEventListener?.('change', updateNetworkStatus)
    } else if (nav.webkitConnection) {
      nav.webkitConnection.addEventListener?.('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
    }
  }, [])

  // 출근 중인 매장이 있는지 확인 (퇴근하지 않은 매장)
  const hasActiveAttendance = todayAttendances.some(a => !a.clock_out_at)

  useEffect(() => {
    loadTodayAttendance()
  }, [])

  // 출근 정보가 변경될 때마다 체크리스트 진행률 확인
  const loadChecklistProgress = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const activeAttendances = todayAttendances.filter(a => !a.clock_out_at)
    
    if (activeAttendances.length === 0) {
      setChecklistProgress({})
      return
    }

    // 각 출근 기록의 work_date를 기준으로 체크리스트 조회
    const checklistPromises = activeAttendances.map(async (attendance) => {
      const { data: checklists, error } = await supabase
        .from('checklist')
        .select('id, store_id, items')
        .eq('store_id', attendance.store_id)
        .eq('work_date', attendance.work_date)
        .eq('assigned_user_id', session.user.id)

      if (error) {
        console.error(`Error loading checklist for store ${attendance.store_id}:`, error)
        return { storeId: attendance.store_id, checklists: [] }
      }

      return { storeId: attendance.store_id, checklists: checklists || [] }
    })

    const checklistResults = await Promise.all(checklistPromises)
    
    // 모든 체크리스트를 하나의 배열로 합치기
    const allChecklists = checklistResults.flatMap(result => 
      result.checklists.map((cl: any) => ({ ...cl, _storeId: result.storeId }))
    )
    
    // 기존 로직과 호환을 위해 store_id로 그룹화
    const checklists = allChecklists

    const progress: Record<string, { completed: number; total: number; percentage: number }> = {}
    
    checklists?.forEach((checklist) => {
      // calculateChecklistProgress 함수 사용 (모든 항목 타입 올바르게 처리)
      const checklistProgress = calculateChecklistProgress(checklist)
      
      const storeId = checklist.store_id
      if (!progress[storeId]) {
        progress[storeId] = { completed: 0, total: 0, percentage: 0 }
      }
      progress[storeId].completed += checklistProgress.completedItems
      progress[storeId].total += checklistProgress.totalItems
    })

    // 각 매장별로 퍼센트 계산
    Object.keys(progress).forEach(storeId => {
      const p = progress[storeId]
      p.percentage = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
    })

    setChecklistProgress(progress)
  }, [todayAttendances])

  useEffect(() => {
    if (todayAttendances.length > 0) {
      loadChecklistProgress()
    } else {
      setChecklistProgress({})
    }
  }, [todayAttendances.length, loadChecklistProgress])

  // 체크리스트 업데이트 이벤트 리스너
  useEffect(() => {
    const handleChecklistUpdate = () => {
      loadChecklistProgress()
    }
    
    window.addEventListener('checklistUpdated', handleChecklistUpdate)
    
    return () => {
      window.removeEventListener('checklistUpdated', handleChecklistUpdate)
    }
  }, [loadChecklistProgress])

  const loadTodayAttendance = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const today = getTodayDateKST()
    const yesterday = getYesterdayDateKST()
    
    // 오늘 날짜의 출근 기록 조회
    const { data: todayData, error: todayError } = await supabase
      .from('attendance')
      .select(`
        id, 
        user_id, 
        store_id, 
        work_date, 
        clock_in_at, 
        clock_in_latitude, 
        clock_in_longitude, 
        clock_out_at, 
        clock_out_latitude, 
        clock_out_longitude, 
        selfie_url, 
        attendance_type,
        scheduled_date,
        problem_report_id,
        change_reason,
        created_at, 
        updated_at,
        stores:store_id (
          id,
          name
        )
      `)
      .eq('user_id', session.user.id)
      .eq('work_date', today)
      .order('clock_in_at', { ascending: false })

    // 어제 날짜의 출근 기록도 조회 (날짜 경계를 넘는 야간 근무 고려, 퇴근 완료 포함)
    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from('attendance')
      .select(`
        id, 
        user_id, 
        store_id, 
        work_date, 
        clock_in_at, 
        clock_in_latitude, 
        clock_in_longitude, 
        clock_out_at, 
        clock_out_latitude, 
        clock_out_longitude, 
        selfie_url, 
        attendance_type,
        scheduled_date,
        problem_report_id,
        change_reason,
        created_at, 
        updated_at,
        stores:store_id (
          id,
          name
        )
      `)
      .eq('user_id', session.user.id)
      .eq('work_date', yesterday)
      .order('clock_in_at', { ascending: false })
      .limit(10) // 최근 10개만 조회 (성능 최적화)

    const queryError = todayError || yesterdayError
    const allData = [...(todayData || []), ...(yesterdayData || [])]

    if (queryError) {
      console.error('Error loading attendance:', queryError)
    }

    // 중복 제거: 같은 id를 가진 기록은 하나만 유지 (최신 데이터 우선)
    const uniqueDataMap = new Map<string, any>()
    allData.forEach((item: any) => {
      if (!uniqueDataMap.has(item.id)) {
        uniqueDataMap.set(item.id, item)
      } else {
        // 이미 있는 경우, updated_at이 더 최신인 것으로 교체
        const existing = uniqueDataMap.get(item.id)
        if (item.updated_at > existing.updated_at) {
          uniqueDataMap.set(item.id, item)
        }
      }
    })
    const data = Array.from(uniqueDataMap.values())

    // 타입 변환: stores가 배열이면 첫 번째 요소 사용
    const transformedData: AttendanceWithStore[] = (data || []).map((item: any): AttendanceWithStore => {
      const storesData = Array.isArray(item.stores) && item.stores.length > 0 
        ? item.stores[0] 
        : (item.stores || undefined)
      
      return {
        id: item.id,
        user_id: item.user_id,
        store_id: item.store_id,
        work_date: item.work_date,
        clock_in_at: item.clock_in_at,
        clock_in_latitude: item.clock_in_latitude,
        clock_in_longitude: item.clock_in_longitude,
        clock_out_at: item.clock_out_at,
        clock_out_latitude: item.clock_out_latitude,
        clock_out_longitude: item.clock_out_longitude,
        selfie_url: item.selfie_url,
        attendance_type: item.attendance_type,
        scheduled_date: item.scheduled_date,
        problem_report_id: item.problem_report_id,
        change_reason: item.change_reason,
        created_at: item.created_at,
        updated_at: item.updated_at,
        stores: storesData ? { name: storesData.name || '' } : undefined,
      }
    })

    setTodayAttendances(transformedData)
    setLoading(false)
  }


  const handleClockIn = async () => {
    if (!location || !selectedStoreId) {
      setError('위치 정보와 매장을 선택해주세요.')
      return
    }

    // 출근일 변경 출근인 경우 원래 예정일 확인
    if (attendanceType === 'rescheduled' && !scheduledDate) {
      setError('원래 예정일을 선택해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    // 낙관적 업데이트: 서버 응답 전에 UI 업데이트
    const optimisticId = 'temp-' + Date.now()
    const optimisticAttendance: AttendanceWithStore = {
      id: optimisticId,
      user_id: '', // 서버 응답으로 채워짐
      store_id: selectedStoreId,
      work_date: getTodayDateKST(), // 임시값, 서버 응답으로 교체됨
      clock_in_at: new Date().toISOString(),
      clock_in_latitude: location.lat,
      clock_in_longitude: location.lng,
      clock_out_at: null,
      clock_out_latitude: null,
      clock_out_longitude: null,
      selfie_url: null,
      attendance_type: attendanceType,
      scheduled_date: attendanceType === 'rescheduled' ? scheduledDate : null,
      problem_report_id: attendanceType === 'emergency' ? problemReportId : null,
      change_reason: attendanceType === 'rescheduled' ? changeReason : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stores: undefined, // 나중에 로드됨
    }

    // 낙관적 업데이트 적용
    setTodayAttendances(prev => [...prev, optimisticAttendance])

    try {
      const result = await clockInAction(
        selectedStoreId,
        location,
        undefined, // selfie_url
        attendanceType,
        attendanceType === 'rescheduled' ? scheduledDate : null,
        attendanceType === 'emergency' ? (problemReportId || null) : null,
        attendanceType === 'rescheduled' ? (changeReason || null) : null
      )

      if (result.success && result.data) {
        // 미션 완료 이벤트 발생
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('missionComplete', {
            detail: { missionId: 'start_management' }
          }))
        }

        // 서버 응답 데이터로 낙관적 업데이트 교체
        const serverData = result.data as any
        setTodayAttendances(prev =>
          prev.map(a =>
            a.id === optimisticId
              ? { ...serverData, stores: a.stores } // stores는 나중에 로드
              : a
          )
        )

        setSubmitting(false)
        setSelectedStoreId('') // 매장 선택 초기화

        // 백그라운드에서 최신 데이터 동기화 (에러 무시)
        Promise.all([
          loadTodayAttendance().catch(() => {}),
          refreshAttendanceContext(),
        ]).then(() => {
          // 체크리스트 진행률 업데이트 (백그라운드)
          loadChecklistProgress().catch(() => {})
        })

        // 네트워크 상태에 따른 리다이렉트 딜레이
        const isSlowNetwork = networkStatus === 'slow' || networkStatus === 'offline'
        const redirectDelay = isSlowNetwork ? 500 : 0

        if (redirectDelay > 0) {
          setTimeout(() => {
            router.push('/mobile-dashboard')
          }, redirectDelay)
        } else {
          // 빠른 네트워크: 즉시 리다이렉트
          router.push('/mobile-dashboard')
        }
      } else {
        // 실패 시 롤백
        setTodayAttendances(prev => prev.filter(a => a.id !== optimisticId))
        setError(result.error || '관리시작 처리 실패')
        setSubmitting(false)
      }
    } catch (error) {
      // 네트워크 오류 등 예외 발생 시 롤백
      setTodayAttendances(prev => prev.filter(a => a.id !== optimisticId))
      setError(error instanceof Error ? error.message : '관리시작 처리 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  const handleClockOut = async (storeId: string) => {
    if (!location) {
      setError('위치 정보를 가져올 수 없습니다.')
      return
    }

    setSubmitting(true)
    setError(null)

    // 낙관적 업데이트: 퇴근 시간 즉시 반영
    const clockOutTime = new Date().toISOString()
    setTodayAttendances(prev =>
      prev.map(attendance =>
        attendance.store_id === storeId && !attendance.clock_out_at
          ? { ...attendance, clock_out_at: clockOutTime }
          : attendance
      )
    )

    try {
      console.log('Attempting clock-out for store:', storeId, { location })
      const result = await clockOutAction(storeId, location)

      if (result.success && result.data) {
        console.log('Clock-out successful:', result.data)
        setError(null)

        // 서버 응답 데이터로 업데이트
        const serverData = result.data as any
        setTodayAttendances(prev =>
          prev.map(attendance =>
            attendance.store_id === storeId
              ? { ...attendance, ...serverData }
              : attendance
          )
        )

        // 백그라운드에서 최신 데이터 동기화
        Promise.all([
          loadTodayAttendance().catch(() => {}),
          refreshAttendanceContext(),
        ])

        // 체크리스트 진행률 초기화
        setChecklistProgress({})
      } else {
        console.error('Clock-out failed:', result.error)
        // 실패 시 롤백
        setTodayAttendances(prev =>
          prev.map(attendance =>
            attendance.store_id === storeId && attendance.clock_out_at === clockOutTime
              ? { ...attendance, clock_out_at: null }
              : attendance
          )
        )
        setError(result.error || '관리완료 처리 실패')
      }
    } catch (error) {
      // 네트워크 오류 등 예외 발생 시 롤백
      setTodayAttendances(prev =>
        prev.map(attendance =>
          attendance.store_id === storeId && attendance.clock_out_at === clockOutTime
            ? { ...attendance, clock_out_at: null }
            : attendance
        )
      )
      setError(error instanceof Error ? error.message : '관리완료 처리 중 오류가 발생했습니다.')
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <GeoGuard
      onLocationReady={setLocation}
      className="max-w-2xl mx-auto px-2 md:px-4"
    >
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-16 md:mb-0">
        <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">관리시작/종료</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        {location && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
            위치: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </div>
        )}

        {/* 네트워크 상태 표시 */}
        {networkStatus === 'slow' && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
            ⚠️ 느린 네트워크가 감지되었습니다. 처리 시간이 다소 걸릴 수 있습니다.
          </div>
        )}
        {networkStatus === 'offline' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            ❌ 오프라인 상태입니다. 네트워크 연결을 확인해주세요.
          </div>
        )}

        {/* 새 매장 관리 섹션 */}
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gray-50 rounded-md border border-gray-200">
          <h2 className="text-base md:text-lg font-semibold mb-3">새 매장 관리</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                매장 선택 <span className="text-red-500">*</span>
              </label>
            <StoreSelector 
              key={`store-selector-${attendanceType}`} // 출근 유형 변경 시 재렌더링
              selectedStoreId={selectedStoreId} 
              onSelectStore={setSelectedStoreId} 
              disabled={hasActiveAttendance} // 출근 중인 매장이 있으면 비활성화
              excludeStoreIds={todayAttendances
                .filter(a => !a.clock_out_at) // 퇴근하지 않은 매장만 제외
                .map(a => a.store_id)}
              showOnlyTodayManagement={attendanceType === 'rescheduled' ? false : true} // 출근일 변경이면 오늘 관리 요일이 아닌 매장만
            />
            {hasActiveAttendance && (
              <p className="mt-2 text-sm text-orange-600">
                ⚠️ 먼저 관리 중인 매장의 관리완료 처리를 완료해주세요.
              </p>
            )}
          </div>

          {/* 관리 유형 선택 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관리 유형
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="attendanceType"
                  value="regular"
                  checked={attendanceType === 'regular'}
                  onChange={(e) => setAttendanceType(e.target.value as 'regular')}
                  className="mr-2"
                />
                <span className="text-sm">정규 관리(오늘)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="attendanceType"
                  value="rescheduled"
                  checked={attendanceType === 'rescheduled'}
                  onChange={(e) => setAttendanceType(e.target.value as 'rescheduled')}
                  className="mr-2"
                />
                <span className="text-sm">관리일 변경</span>
              </label>
              {/* 긴급 관리 옵션 임시 숨김 */}
              {/* <label className="flex items-center">
                <input
                  type="radio"
                  name="attendanceType"
                  value="emergency"
                  checked={attendanceType === 'emergency'}
                  onChange={(e) => setAttendanceType(e.target.value as 'emergency')}
                  className="mr-2"
                />
                <span className="text-sm">긴급 관리</span>
              </label> */}
            </div>
          </div>

          {/* 관리일 변경 관리인 경우 */}
          {attendanceType === 'rescheduled' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  원래 예정일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  변경 사유 (선택)
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="관리일 변경 사유를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* 긴급 관리인 경우 - 임시 숨김 */}
          {/* {attendanceType === 'emergency' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                관련 문제 ID (선택)
              </label>
              <input
                type="text"
                value={problemReportId}
                onChange={(e) => setProblemReportId(e.target.value)}
                placeholder="해결할 문제 보고 ID를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                긴급 관리로 해결할 문제 보고가 있으면 ID를 입력하세요.
              </p>
            </div>
          )} */}

          <button
            onClick={handleClockIn}
            disabled={!location || !selectedStoreId || submitting || hasActiveAttendance || (attendanceType === 'rescheduled' && !scheduledDate)}
            className="w-full mt-4 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation text-base md:text-sm"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>처리 중...</span>
              </>
            ) : (
              '관리시작'
            )}
          </button>
          </div>
        </div>

        {/* 오늘 관리한 매장 목록 */}
        <div className="space-y-3 md:space-y-4">
          <h2 className="text-base md:text-lg font-semibold">오늘 관리한 매장</h2>
          
          {todayAttendances.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
              아직 관리한 매장이 없습니다.
            </div>
          ) : (
            todayAttendances.map((attendance) => (
              <div key={attendance.id} className="p-3 md:p-4 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {(attendance as AttendanceWithStore).stores?.name || attendance.store_id}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      관리시작 시간: {new Date(attendance.clock_in_at).toLocaleString('ko-KR')}
                    </p>
                    {/* 관리 유형 표시 */}
                    {attendance.attendance_type && attendance.attendance_type !== 'regular' && (
                      <p className="text-xs text-gray-500 mt-1">
                        {attendance.attendance_type === 'rescheduled' && '📅 관리일 변경'}
                        {attendance.attendance_type === 'emergency' && '🚨 긴급 관리'}
                        {attendance.scheduled_date && attendance.attendance_type === 'rescheduled' && (
                          <span className="ml-1">(원래 예정일: {new Date(attendance.scheduled_date).toLocaleDateString('ko-KR')})</span>
                        )}
                      </p>
                    )}
                    {attendance.clock_out_at ? (
                      <>
                        <p className="text-sm text-gray-600 mt-1">
                          관리완료 시간: {new Date(attendance.clock_out_at).toLocaleString('ko-KR')}
                        </p>
                        <p className="text-sm text-green-600 mt-2 font-medium">
                          ✓ 관리완료
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-orange-600 mt-2 font-medium">
                          ⚠️ 관리 중
                        </p>
                        {checklistProgress[attendance.store_id] && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">체크리스트 진행률</span>
                              <span className="font-semibold text-blue-600">
                                {checklistProgress[attendance.store_id].percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${checklistProgress[attendance.store_id].percentage}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {checklistProgress[attendance.store_id].completed} / {checklistProgress[attendance.store_id].total} 완료
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {!attendance.clock_out_at && (
                    <button
                      onClick={() => handleClockOut(attendance.store_id)}
                      disabled={!location || submitting}
                      className="ml-2 md:ml-4 px-3 md:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-xs md:text-sm whitespace-nowrap flex items-center justify-center gap-2 touch-manipulation"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>처리 중...</span>
                        </>
                      ) : (
                        '관리완료'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GeoGuard>
  )
}

