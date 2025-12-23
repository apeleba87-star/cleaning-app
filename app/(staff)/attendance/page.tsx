'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GeoGuard } from '@/components/GeoGuard'
import { GPSLocation } from '@/types/db'
import { clockInAction, clockOutAction } from './actions'
import { createClient } from '@/lib/supabase/client'
import { Attendance } from '@/types/db'
import StoreSelector from './StoreSelector'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

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
  // 출근 유형 관련 상태
  const [attendanceType, setAttendanceType] = useState<'regular' | 'rescheduled' | 'emergency'>('regular')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [problemReportId, setProblemReportId] = useState<string>('')
  const [changeReason, setChangeReason] = useState<string>('')

  // 출근 유형 변경 시 매장 선택 초기화
  useEffect(() => {
    setSelectedStoreId('')
  }, [attendanceType])

  // 출근 중인 매장이 있는지 확인 (퇴근하지 않은 매장)
  const hasActiveAttendance = todayAttendances.some(a => !a.clock_out_at)

  useEffect(() => {
    loadTodayAttendance()
  }, [])

  // 출근 정보가 변경될 때마다 체크리스트 진행률 확인
  useEffect(() => {
    if (todayAttendances.length > 0) {
      loadChecklistProgress()
    } else {
      setChecklistProgress({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayAttendances.length])

  // 체크리스트 업데이트 이벤트 리스너
  useEffect(() => {
    const handleChecklistUpdate = () => {
      loadChecklistProgress()
    }
    
    window.addEventListener('checklistUpdated', handleChecklistUpdate)
    
    return () => {
      window.removeEventListener('checklistUpdated', handleChecklistUpdate)
    }
  }, [])

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

    // 어제 날짜의 미퇴근 기록도 조회 (날짜 경계를 넘는 야간 근무 고려)
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
        created_at, 
        updated_at,
        stores:store_id (
          id,
          name
        )
      `)
      .eq('user_id', session.user.id)
      .eq('work_date', yesterday)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })

    const queryError = todayError || yesterdayError
    const data = [...(todayData || []), ...(yesterdayData || [])]

    if (queryError) {
      console.error('Error loading attendance:', queryError)
    }

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
        created_at: item.created_at,
        updated_at: item.updated_at,
        stores: storesData ? { name: storesData.name || '' } : undefined,
      }
    })

    setTodayAttendances(transformedData)
    setLoading(false)
  }

  const loadChecklistProgress = async () => {
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

    if (error) {
      console.error('Error loading checklist progress:', error)
      return
    }

    const progress: Record<string, { completed: number; total: number; percentage: number }> = {}
    
    checklists?.forEach((checklist) => {
      const validItems = (checklist.items as any[]).filter((item: any) => item.area?.trim())
      const total = validItems.length
      const completed = validItems.filter((item: any) => {
        if (item.type === 'check') {
          if (!item.checked) return false
          if (item.status === 'bad' && !item.comment?.trim()) return false
          return true
        } else if (item.type === 'photo') {
          return !!(item.before_photo_url && item.after_photo_url)
        }
        return false
      }).length

      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      
      if (!progress[checklist.store_id]) {
        progress[checklist.store_id] = { completed: 0, total: 0, percentage: 0 }
      }
      
      progress[checklist.store_id].completed += completed
      progress[checklist.store_id].total += total
    })

    // 각 매장별로 전체 백분율 계산
    Object.keys(progress).forEach(storeId => {
      const { completed, total } = progress[storeId]
      progress[storeId].percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    })

    setChecklistProgress(progress)
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
      // 출근 정보 다시 로드 (매장 정보 포함)
      await loadTodayAttendance()
      setSelectedStoreId('') // 매장 선택 초기화
      
      // 출근 완료 후 체크리스트 진행률 업데이트
      setTimeout(() => {
        loadChecklistProgress()
      }, 500)
      
      // 출근 완료 후 대시보드로 리다이렉트하여 메뉴 갱신
      setTimeout(() => {
        router.push('/mobile-dashboard')
      }, 1000) // 1초 후 리다이렉트 (성공 메시지 확인 시간)
    } else {
      setError(result.error || '출근 처리 실패')
    }

    setSubmitting(false)
  }

  const handleClockOut = async (storeId: string) => {
    if (!location) {
      setError('위치 정보를 가져올 수 없습니다.')
      return
    }

    setSubmitting(true)
    setError(null)

    console.log('Attempting clock-out for store:', storeId, { location })
    const result = await clockOutAction(storeId, location)

    if (result.success && result.data) {
      console.log('Clock-out successful:', result.data)
      setError(null)
      
      // 즉시 로컬 상태 업데이트 (새로고침 없이 UI 반영)
      const clockOutTime = (result.data as any)?.clock_out_at || new Date().toISOString()
      setTodayAttendances(prev => 
        prev.map(attendance => 
          attendance.store_id === storeId && !attendance.clock_out_at
            ? { ...attendance, clock_out_at: clockOutTime }
            : attendance
        )
      )
      
      // 퇴근 정보 다시 로드 (최신 데이터로 동기화)
      await loadTodayAttendance()
      
      // 체크리스트 진행률 초기화
      setChecklistProgress({})
    } else {
      console.error('Clock-out failed:', result.error)
      setError(result.error || '퇴근 처리 실패')
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
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-lg shadow-md p-6 mb-20 md:mb-0">
        <h1 className="text-2xl font-bold mb-6">출퇴근 관리</h1>

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

        {/* 새 출근하기 섹션 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-3">새 매장 출근</h2>
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
                ⚠️ 먼저 출근 중인 매장의 퇴근 처리를 완료해주세요.
              </p>
            )}
          </div>

          {/* 출근 유형 선택 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              출근 유형
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
                <span className="text-sm">정규 출근 (오늘)</span>
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
                <span className="text-sm">출근일 변경</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="attendanceType"
                  value="emergency"
                  checked={attendanceType === 'emergency'}
                  onChange={(e) => setAttendanceType(e.target.value as 'emergency')}
                  className="mr-2"
                />
                <span className="text-sm">긴급 출동</span>
              </label>
            </div>
          </div>

          {/* 출근일 변경 출근인 경우 */}
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
                  placeholder="출근일 변경 사유를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* 긴급 출동인 경우 */}
          {attendanceType === 'emergency' && (
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
                긴급 출동으로 해결할 문제 보고가 있으면 ID를 입력하세요.
              </p>
            </div>
          )}

          <button
            onClick={handleClockIn}
            disabled={!location || !selectedStoreId || submitting || hasActiveAttendance || (attendanceType === 'rescheduled' && !scheduledDate)}
            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? '처리 중...' : '출근하기'}
          </button>
          </div>
        </div>

        {/* 오늘 출근한 매장 목록 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">오늘 출근한 매장</h2>
          {todayAttendances.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
              아직 출근한 매장이 없습니다.
            </div>
          ) : (
            todayAttendances.map((attendance) => (
              <div key={attendance.id} className="p-4 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {(attendance as AttendanceWithStore).stores?.name || attendance.store_id}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      출근 시간: {new Date(attendance.clock_in_at).toLocaleString('ko-KR')}
                    </p>
                    {/* 출근 유형 표시 */}
                    {attendance.attendance_type && attendance.attendance_type !== 'regular' && (
                      <p className="text-xs text-gray-500 mt-1">
                        {attendance.attendance_type === 'rescheduled' && '📅 출근일 변경'}
                        {attendance.attendance_type === 'emergency' && '🚨 긴급 출동'}
                        {attendance.scheduled_date && attendance.attendance_type === 'rescheduled' && (
                          <span className="ml-1">(원래 예정일: {new Date(attendance.scheduled_date).toLocaleDateString('ko-KR')})</span>
                        )}
                      </p>
                    )}
                    {attendance.clock_out_at ? (
                      <>
                        <p className="text-sm text-gray-600 mt-1">
                          퇴근 시간: {new Date(attendance.clock_out_at).toLocaleString('ko-KR')}
                        </p>
                        <p className="text-sm text-green-600 mt-2 font-medium">
                          ✓ 퇴근 완료
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-orange-600 mt-2 font-medium">
                          ⚠️ 출근 중
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
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm whitespace-nowrap"
                    >
                      {submitting ? '처리 중...' : '퇴근'}
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

