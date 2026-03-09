'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import OperationMemoSection from '@/components/staff/OperationMemoSection'
import { getTodayDateKST } from '@/lib/utils/date'
import { useTodayAttendance } from '@/contexts/AttendanceContext'
import { calculateChecklistProgress } from '@/lib/utils/checklist'
import { useToast } from '@/components/Toast'

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
  // 요청란/체크리스트 미완료 건수 (매장별) — 관리종료 버튼 차단용 (대시보드와 동일)
  const [incompleteChecklists, setIncompleteChecklists] = useState<Record<string, number>>({})
  const [incompleteRequests, setIncompleteRequests] = useState<Record<string, number>>({})
  // 금일 수행 미션 남음 경고 (대시보드와 동일 UI)
  const [pendingMissionWarning, setPendingMissionWarning] = useState<{ storeId: string; checklistCount: number; requestCount: number } | null>(null)
  
  // Context의 refresh 함수 가져오기 (출근/퇴근 후 전역 상태 업데이트용)
  const { refresh: refreshAttendanceContext } = useTodayAttendance()
  // 출근 유형 관련 상태
  const [attendanceType, setAttendanceType] = useState<'regular' | 'rescheduled' | 'emergency'>('regular')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [problemReportId, setProblemReportId] = useState<string>('')
  const [changeReason, setChangeReason] = useState<string>('')
  
  // 네트워크 상태
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow' | 'unknown'>(() => getNetworkStatus())
  // 선택 가능한 매장 목록 (StoreSelector 콜백, 버튼 라벨·개수 표시용)
  const [selectableStores, setSelectableStores] = useState<{ id: string; name: string }[]>([])
  const { showToast, ToastContainer } = useToast()
  const selectedStoreName = selectableStores.find(s => s.id === selectedStoreId)?.name
  // 오늘 관리한 매장 카드 접기/펼치기 (id별)
  const [expandedAttendanceIds, setExpandedAttendanceIds] = useState<Set<string>>(new Set())
  const completedCount = todayAttendances.filter(a => a.clock_out_at).length
  const allCompletedToday = todayAttendances.length > 0 && completedCount === todayAttendances.length
  // 참조 안정화: 매 렌더마다 새 배열이면 StoreSelector useEffect가 무한 호출됨
  const excludeStoreIds = useMemo(
    () => todayAttendances.map(a => a.store_id),
    [todayAttendances]
  )

  // 출근 유형 변경 시 매장 선택 초기화
  useEffect(() => {
    setSelectedStoreId('')
  }, [attendanceType])

  // 오늘 이미 출근한 매장이 선택돼 있으면 선택 해제 (관리완료 후 드롭다운 정리)
  useEffect(() => {
    const attendedIds = todayAttendances.map(a => a.store_id)
    if (selectedStoreId && attendedIds.includes(selectedStoreId)) {
      setSelectedStoreId('')
    }
  }, [todayAttendances, selectedStoreId])

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
  // 관리종료 버튼용: 현재 관리 중인 매장 1개 (퇴근 전)
  const activeAttendance = todayAttendances.find(a => !a.clock_out_at)
  const activeStoreName = activeAttendance ? (activeAttendance as AttendanceWithStore).stores?.name : null
  // 해당 매장에 미수행 요청란/체크리스트가 있는지 (관리종료 차단용, 대시보드와 동일)
  const hasPendingMissions = useCallback((storeId: string) => {
    return (incompleteChecklists[storeId] ?? 0) > 0 || (incompleteRequests[storeId] ?? 0) > 0
  }, [incompleteChecklists, incompleteRequests])
  // 선택한 매장이 오늘 이미 관리완료된 매장인지 (관리시작 버튼 비활성화용)
  const isSelectedStoreCompletedToday = Boolean(
    selectedStoreId && todayAttendances.some(
      a => a.store_id === selectedStoreId && a.clock_out_at
    )
  )

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

  // 관리 중인 매장이 있을 때 요청란/체크리스트 미완료 건수 로드 (대시보드와 동일 — 관리종료 차단용)
  useEffect(() => {
    const clockedIn = todayAttendances.filter(a => !a.clock_out_at)
    if (clockedIn.length === 0) {
      setIncompleteChecklists({})
      setIncompleteRequests({})
      setPendingMissionWarning(null)
      return
    }
    let cancelled = false
    fetch('/api/staff/checklist-progress')
      .then(res => res.json())
      .then(json => {
        if (cancelled || !json?.success || !json?.data) return
        setIncompleteChecklists(json.data.incompleteChecklists || {})
        setIncompleteRequests(json.data.incompleteRequests || {})
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [todayAttendances])

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
    try {
      const res = await fetch('/api/staff/attendance')
      const json = await res.json()
      if (!res.ok || !json.success) {
        console.error('Error loading attendance:', json.error)
        setTodayAttendances([])
        setLoading(false)
        return
      }
      const data = json.data || []
      const todayKST = getTodayDateKST()
      const todayOnly = data.filter((a: AttendanceWithStore) => a.work_date === todayKST)
      setTodayAttendances(todayOnly as AttendanceWithStore[])
    } catch (err) {
      console.error('Error loading attendance:', err)
      setTodayAttendances([])
    } finally {
      setLoading(false)
    }
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

    // 대시보드와 동일: 요청란/체크리스트 미수행이 있으면 관리종료 불가
    const checklistCount = incompleteChecklists[storeId] ?? 0
    const requestCount = incompleteRequests[storeId] ?? 0
    if (checklistCount > 0 || requestCount > 0) {
      setPendingMissionWarning({ storeId, checklistCount, requestCount })
      setError('금일 수행 미션이 남아 있습니다. 체크리스트와 요청란을 완료한 뒤 관리종료해 주세요.')
      return
    }
    setPendingMissionWarning(null)
    setError(null)

    setSubmitting(true)

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
        setPendingMissionWarning(null)
        const storeName = (todayAttendances.find(a => a.store_id === storeId) as AttendanceWithStore)?.stores?.name
        showToast(`${storeName || '매장'} 관리가 완료되었습니다.`, 'success')

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
    <>
    <ToastContainer />
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
          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium">1</span>
            <span>매장 선택</span>
            <span className="text-gray-300">→</span>
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium">2</span>
            <span>관리시작</span>
          </div>
          <h2 className="text-base md:text-lg font-semibold mb-3">새 매장 관리</h2>

          {/* 위치: 카드 안쪽 상단, 확인 시 체크 표시 */}
          <div className={`mb-4 p-3 rounded-md border text-sm flex items-center gap-2 ${location ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
            {location ? (
              <>
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">✓</span>
                <span>위치 확인됨</span>
                <span className="text-xs opacity-80 ml-auto">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent flex-shrink-0" />
                <span>위치 확인 중...</span>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                매장 선택 <span className="text-red-500">*</span>
                {selectableStores.length > 0 && (
                  <span className="text-gray-500 font-normal ml-1">({selectableStores.length}개 매장 중 선택)</span>
                )}
              </label>
            <StoreSelector 
              key={`store-selector-${attendanceType}`} // 출근 유형 변경 시 재렌더링
              selectedStoreId={selectedStoreId} 
              onSelectStore={setSelectedStoreId} 
              disabled={hasActiveAttendance} // 출근 중인 매장이 있으면 비활성화
              excludeStoreIds={excludeStoreIds}
              showOnlyTodayManagement={attendanceType === 'rescheduled' ? false : true} // 출근일 변경이면 오늘 관리 요일이 아닌 매장만
              onSelectableStoresChange={setSelectableStores}
            />
            {/* 매장 선택 시 운영 메모 (관리시작 전 출입정보 확인용) */}
            {selectedStoreId && !hasActiveAttendance && (
              <OperationMemoSection
                storeId={selectedStoreId}
                storeName={selectedStoreName || ''}
                className="mt-3"
              />
            )}
            {hasActiveAttendance && (
              <p className="mt-2 text-sm text-orange-600">
                ⚠️ 먼저 관리 중인 매장의 관리완료 처리를 완료해주세요.
              </p>
            )}
            {hasActiveAttendance && activeAttendance && (
              <>
                {pendingMissionWarning && pendingMissionWarning.storeId === activeAttendance.store_id && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                    <p className="font-medium mb-1">금일 수행 미션이 남아 있습니다</p>
                    <div className="space-y-0.5 text-xs text-yellow-700">
                      {pendingMissionWarning.checklistCount > 0 && (
                        <p>- 체크리스트 {pendingMissionWarning.checklistCount}건</p>
                      )}
                      {pendingMissionWarning.requestCount > 0 && (
                        <p>- 요청란 {pendingMissionWarning.requestCount}건</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPendingMissionWarning(null); setError(null); }}
                      className="mt-2 px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300"
                    >
                      확인
                    </button>
                  </div>
                )}
                {hasPendingMissions(activeAttendance.store_id) && !pendingMissionWarning && (
                  <p className="mt-2 text-sm text-amber-600">
                    체크리스트와 요청란을 모두 완료한 뒤 관리종료할 수 있습니다.
                  </p>
                )}
                <button
                  onClick={() => handleClockOut(activeAttendance.store_id)}
                  disabled={!location || submitting || hasPendingMissions(activeAttendance.store_id)}
                  className="w-full mt-4 px-4 py-3 min-h-[44px] bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation text-base"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      <span>처리 중...</span>
                    </>
                  ) : (
                    activeStoreName ? `${activeStoreName} 관리종료` : '관리종료'
                  )}
                </button>
              </>
            )}
            {isSelectedStoreCompletedToday && (
              <p className="mt-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-md">
                ✓ 이 매장은 오늘 이미 관리가 완료되었습니다.
              </p>
            )}
          </div>

          {/* 관리 유형 선택 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관리 유형
            </label>
            <div className="space-y-1">
              <label className="flex items-center py-2 cursor-pointer rounded hover:bg-gray-100 px-1 -mx-1">
                <input
                  type="radio"
                  name="attendanceType"
                  value="regular"
                  checked={attendanceType === 'regular'}
                  onChange={(e) => setAttendanceType(e.target.value as 'regular')}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-sm">정규 관리(오늘)</span>
              </label>
              <label className="flex items-center py-2 cursor-pointer rounded hover:bg-gray-100 px-1 -mx-1">
                <input
                  type="radio"
                  name="attendanceType"
                  value="rescheduled"
                  checked={attendanceType === 'rescheduled'}
                  onChange={(e) => setAttendanceType(e.target.value as 'rescheduled')}
                  className="mr-3 w-4 h-4"
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

          {!hasActiveAttendance && (
          <button
            onClick={handleClockIn}
            disabled={!location || !selectedStoreId || submitting || isSelectedStoreCompletedToday || (attendanceType === 'rescheduled' && !scheduledDate)}
            className="w-full mt-4 px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation text-base"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>처리 중...</span>
              </>
            ) : (
              selectedStoreName ? `${selectedStoreName} 관리시작` : '관리시작'
            )}
          </button>
          )}
          </div>
        </div>

        {/* 오늘 관리한 매장 목록 */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base md:text-lg font-semibold">오늘 관리한 매장</h2>
            {todayAttendances.length > 0 && (
              <span className="text-sm text-gray-500">
                오늘 완료: {completedCount}개 매장
              </span>
            )}
          </div>

          {allCompletedToday && todayAttendances.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm font-medium flex items-center gap-2">
              <span className="text-lg">🎉</span>
              오늘 할 일을 모두 완료했어요
            </div>
          )}

          {todayAttendances.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
              아직 관리한 매장이 없습니다.
            </div>
          ) : (
            todayAttendances.map((attendance) => {
              const storeName = (attendance as AttendanceWithStore).stores?.name || attendance.store_id
              const isExpanded = expandedAttendanceIds.has(attendance.id)
              const startStr = new Date(attendance.clock_in_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
              const endStr = attendance.clock_out_at
                ? new Date(attendance.clock_out_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                : null
              const durationMin = attendance.clock_out_at
                ? Math.round((new Date(attendance.clock_out_at).getTime() - new Date(attendance.clock_in_at).getTime()) / 60000)
                : null

              return (
                <div key={attendance.id} className="p-3 md:p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{storeName}</h3>
                      {/* 요약: 시작·완료 시간 또는 관리중 */}
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {attendance.clock_out_at ? (
                          <span className="text-sm text-gray-600">
                            {startStr} 시작 · {endStr} 완료
                            {durationMin != null && durationMin >= 0 && (
                              <span className="text-gray-500 ml-1">(약 {durationMin}분)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-sm text-orange-600 font-medium">⚠️ 관리 중</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedAttendanceIds(prev => {
                            const next = new Set(prev)
                            if (next.has(attendance.id)) next.delete(attendance.id)
                            else next.add(attendance.id)
                            return next
                          })}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {isExpanded ? '상세 접기' : '상세 보기'}
                        </button>
                      </div>
                      {attendance.clock_out_at && (
                        <p className="text-sm text-green-600 mt-1 font-medium">✓ 관리완료</p>
                      )}

                      {/* 펼친 상세 */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-blue-200 space-y-1 text-sm text-gray-600">
                          <p>관리시작: {new Date(attendance.clock_in_at).toLocaleString('ko-KR')}</p>
                          {attendance.clock_out_at && (
                            <p>관리완료: {new Date(attendance.clock_out_at).toLocaleString('ko-KR')}</p>
                          )}
                          {attendance.attendance_type && attendance.attendance_type !== 'regular' && (
                            <p className="text-xs text-gray-500">
                              {attendance.attendance_type === 'rescheduled' && '📅 관리일 변경'}
                              {attendance.attendance_type === 'emergency' && '🚨 긴급 관리'}
                              {attendance.scheduled_date && attendance.attendance_type === 'rescheduled' && (
                                <span className="ml-1">(원래 예정일: {new Date(attendance.scheduled_date).toLocaleDateString('ko-KR')})</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {/* 관리 중일 때 체크리스트 진행률 */}
                      {!attendance.clock_out_at && checklistProgress[attendance.store_id] && (
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
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {checklistProgress[attendance.store_id].completed} / {checklistProgress[attendance.store_id].total} 완료
                          </p>
                        </div>
                      )}
                    </div>
                    {!attendance.clock_out_at && (
                      <button
                        onClick={() => handleClockOut(attendance.store_id)}
                        disabled={!location || submitting || hasPendingMissions(attendance.store_id)}
                        className="flex-shrink-0 ml-2 px-3 md:px-4 py-2 min-h-[44px] bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-xs md:text-sm whitespace-nowrap flex items-center justify-center gap-2 touch-manipulation"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            <span>처리 중...</span>
                          </>
                        ) : (
                          '관리완료'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </GeoGuard>
    </>
  )
}

