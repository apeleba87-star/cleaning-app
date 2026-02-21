'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { calculateChecklistProgress } from '@/lib/utils/checklist'
import { GeoGuard } from '@/components/GeoGuard'
import { clockInAction, clockOutAction } from '../attendance/actions'
import { GPSLocation } from '@/types/db'
import { getTodayDateKST, getCurrentHourKST, isWithinManagementPeriod, calculateWorkDateForNightShift } from '@/lib/utils/date'
import QuickStartGuide from '@/components/staff/QuickStartGuide'
import OperationMemoSection from '@/components/staff/OperationMemoSection'
import { useToast } from '@/components/Toast'

interface StoreWithAssignment {
  id: string
  name: string
  management_days: string | null
  isWorkDay: boolean
  attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out'
  attendanceWorkDate: string | null
  attendanceType?: string | null
  is_night_shift?: boolean
  work_start_hour?: number | null
  work_end_hour?: number | null
}

interface Request {
  id: string
  store_id: string
  store_name: string
  title: string
  category?: string
}

interface TodayWorkStats {
  store_id: string
  store_name: string
  checklist_completed: number
  request_completed: number
  store_problem_count: number
  vending_problem_count: number
  has_product_inflow: boolean
  has_storage_photo: boolean
}

interface WeeklyWorkStats {
  store_id: string
  store_name: string
  daily_checklists: { date: string; count: number }[]
  store_problem_count: number
  request_completed: number
  product_inflow_count: number
  vending_problem_count: number
  lost_item_count: number
}

type WorkHistoryTab = 'today' | 'weekly'

export default function MobileDashboardPage() {
  const router = useRouter()
  const { showToast, ToastContainer } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stores, setStores] = useState<StoreWithAssignment[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [workHistoryTab, setWorkHistoryTab] = useState<WorkHistoryTab>('today')
  const [todayWorkStats, setTodayWorkStats] = useState<TodayWorkStats[]>([])
  const [weeklyWorkStats, setWeeklyWorkStats] = useState<WeeklyWorkStats[]>([])
  // 최근업무기록 아코디언 상태 (매장별로 접었다 폈다)
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set())
  // 최근 업무 기록 전체 접기/펼치기 상태 (초기값: 접힘)
  const [isWorkHistoryExpanded, setIsWorkHistoryExpanded] = useState(false)
  // 최근 업무 기록 데이터 로딩 여부 (한 번만 로드)
  const [workHistoryDataLoaded, setWorkHistoryDataLoaded] = useState(false)
  // 체크리스트 진행율 (매장별)
  const [checklistProgress, setChecklistProgress] = useState<Record<string, { completed: number; total: number; percentage: number }>>({})
  // 요청란 미완료 건수 (매장별)
  const [incompleteRequests, setIncompleteRequests] = useState<Record<string, number>>({})
  // 체크리스트 미완료 건수 (매장별)
  const [incompleteChecklists, setIncompleteChecklists] = useState<Record<string, number>>({})
  // 위치 정보
  const [location, setLocation] = useState<GPSLocation | null>(null)
  // 퇴근 처리 중
  const [clockingOut, setClockingOut] = useState<string | null>(null)
  // 경고 메시지
  const [warningMessage, setWarningMessage] = useState<{ storeId: string; message: string; checklistCount: number; requestCount: number } | null>(null)
  // 야간매장 관리시작 확인 모달
  const [showNightShiftConfirmModal, setShowNightShiftConfirmModal] = useState<{ storeId: string; storeName: string; workStartHour: number } | null>(null)
  // 공지사항
  const [announcements, setAnnouncements] = useState<Array<{
    id: string
    title: string
    content: string
    created_at: string
    is_read: boolean
    read_at: string | null
  }>>([])
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<string | null>(null)
  // 물품 요청 상태
  const [supplyRequests, setSupplyRequests] = useState<Array<{
    id: string
    store_id: string
    store_name: string
    title: string
    category: string | null
    status: string
    created_at: string
    completed_at: string | null
  }>>([])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 세션 교체 알림 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionReplaced = localStorage.getItem('sessionReplaced')
      if (sessionReplaced === 'true') {
        showToast('동시 접속 제한으로 인해 기존 세션이 종료되었습니다. 다른 기기에서 로그인하셨다면 해당 기기에서 로그아웃되었습니다.', 'info', 5000)
        localStorage.removeItem('sessionReplaced')
      }
    }
  }, [showToast])

  const getKoreanDayName = useCallback((dayIndex: number): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[dayIndex]
  }, [])

  const todayDayIndex = useMemo(() => currentTime.getDay(), [currentTime])
  const todayDayName = useMemo(() => getKoreanDayName(todayDayIndex), [getKoreanDayName, todayDayIndex])

  const isTodayWorkDay = useCallback((managementDays: string | null, checkDate?: string | null, isNightShift?: boolean, workStartHour?: number | null, workEndHour?: number | null): boolean => {
    if (!managementDays) return false
    
    // 출근 기록의 work_date가 있으면 해당 날짜 기준으로 체크
    if (checkDate) {
      const checkDateObj = new Date(checkDate + 'T00:00:00+09:00')
      const checkDayIndex = checkDateObj.getDay()
      const dayNameToCheck = getKoreanDayName(checkDayIndex)
      const days = managementDays.split(',').map(d => d.trim())
      return days.includes(dayNameToCheck)
    }
    
    // 출근 기록이 없는 경우
    if (isNightShift && workEndHour !== null && workEndHour !== undefined) {
      // work_end_hour 기준으로 관리일에 속하는 날짜 결정
      const currentHour = getCurrentHourKST()
      const endHour = workEndHour ?? 8  // 기본값 8시 (하위 호환성)
      let dateToCheck: Date
      
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
      
      const dayNameToCheck = getKoreanDayName(dateToCheck.getDay())
      const days = managementDays.split(',').map(d => d.trim())
      return days.includes(dayNameToCheck)
    }
    
    // 일반 매장 또는 야간매장 정보가 없는 경우
    const days = managementDays.split(',').map(d => d.trim())
    return days.includes(todayDayName)
  }, [todayDayName, getKoreanDayName])

  const formatDate = useCallback((date: Date): string => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayName = getKoreanDayName(date.getDay())
    return `${year}년 ${month}월 ${day}일 ${dayName}요일`
  }, [getKoreanDayName])

  const formatTime = useCallback((date: Date): string => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    const period = hours >= 12 ? '오후' : '오전'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${period} ${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [])

  // 체크리스트 진행률 및 미완료 건수 API 호출 (RLS 우회)
  const fetchChecklistProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/checklist-progress')
      const json = await res.json()
      if (json.success && json.data) {
        setChecklistProgress(json.data.progress || {})
        setIncompleteChecklists(json.data.incompleteChecklists || {})
        setIncompleteRequests(json.data.incompleteRequests || {})
      } else {
        setChecklistProgress({})
        setIncompleteChecklists({})
        setIncompleteRequests({})
      }
    } catch (err) {
      console.error('Error loading checklist progress:', err)
      setChecklistProgress({})
      setIncompleteChecklists({})
      setIncompleteRequests({})
    }
  }, [])

  const loadAnnouncements = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/announcements')
      if (!response.ok) {
        console.error('Failed to load announcements:', response.status, response.statusText)
        return
      }
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid response type:', contentType)
        return
      }
      const data = await response.json()
      if (data.success && data.data) {
        // 읽은 공지사항은 3일 이내만 표시
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        
        const filteredAnnouncements = data.data.filter((ann: any) => {
          // 읽지 않은 공지사항은 모두 표시
          if (!ann.is_read) return true
          
          // 읽은 공지사항은 read_at이 3일 이내인 것만 표시
          if (ann.read_at) {
            const readDate = new Date(ann.read_at)
            return readDate >= threeDaysAgo
          }
          
          // read_at이 없으면 표시하지 않음
          return false
        })
        
        setAnnouncements(filteredAnnouncements)
      }
    } catch (error) {
      console.error('Error loading announcements:', error)
    }
  }, [])

  const handleMarkAsRead = useCallback(async (announcementId: string) => {
    try {
      const response = await fetch('/api/staff/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ announcement_id: announcementId }),
      })

      if (!response.ok) {
        console.error('Failed to mark announcement as read:', response.status, response.statusText)
        alert('확인 처리에 실패했습니다.')
        return
      }
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid response type:', contentType)
        alert('확인 처리에 실패했습니다.')
        return
      }
      const data = await response.json()
      if (data.success) {
        // 공지사항 목록 업데이트 및 3일 필터링 적용
        const updatedAnnouncements = announcements.map((ann) =>
          ann.id === announcementId
            ? { ...ann, is_read: true, read_at: new Date().toISOString() }
            : ann
        )
        
        // 읽은 공지사항은 3일 이내만 표시
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        
        const filteredAnnouncements = updatedAnnouncements.filter((ann) => {
          // 읽지 않은 공지사항은 모두 표시
          if (!ann.is_read) return true
          
          // 읽은 공지사항은 read_at이 3일 이내인 것만 표시
          if (ann.read_at) {
            const readDate = new Date(ann.read_at)
            return readDate >= threeDaysAgo
          }
          
          // read_at이 없으면 표시하지 않음
          return false
        })
        
        setAnnouncements(filteredAnnouncements)
        setShowAnnouncementModal(null)
      }
    } catch (error) {
      console.error('Error marking announcement as read:', error)
      alert('확인 처리에 실패했습니다.')
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    
    const loadDashboardData = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (!session) {
          setLoading(false)
          router.push('/login')
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('id', session.user.id)
          .single()

        if (!isMounted) return

        if (userError) {
          console.error('Error loading user:', userError)
          setLoading(false)
          return
        }

        setUser(userData)

        // 배정된 매장 + 출근 상태 조회 (API 사용 - RLS 우회)
        const assignRes = await fetch('/api/staff/assigned-stores?include_attendance=1')
        const assignJson = await assignRes.json()
        const apiStores = assignJson.success && assignJson.data ? assignJson.data : []

        const storesData: StoreWithAssignment[] = apiStores
          .map((store: any) => {
            const attendanceStatus = store.attendanceStatus || 'not_clocked_in'
            const attendanceWorkDate = store.attendanceWorkDate || null
            const attendanceType = store.attendanceType || null

            // 출근일 변경으로 출근한 경우, isWorkDay가 false여도 출근 상태로 처리
            const isRescheduledAttendance = attendanceType === 'rescheduled' && attendanceStatus === 'clocked_in'

            const calculatedIsWorkDay = isTodayWorkDay(
              store.management_days,
              attendanceWorkDate,
              store.is_night_shift,
              store.work_start_hour,
              store.work_end_hour
            ) || isRescheduledAttendance

            return {
              id: store.id,
              name: store.name,
              management_days: store.management_days,
              isWorkDay: calculatedIsWorkDay,
              attendanceStatus,
              attendanceWorkDate,
              attendanceType,
              is_night_shift: store.is_night_shift,
              work_start_hour: store.work_start_hour,
              work_end_hour: store.work_end_hour,
            }
          })
          .sort((a, b) => {
            // 정렬 순서: 1. 출근중, 2. 출근전, 3. 퇴근완료, 4. 휴무
            const getSortOrder = (store: StoreWithAssignment) => {
              if (!store.isWorkDay) return 4 // 미관리일
              if (store.attendanceStatus === 'clocked_in') return 1 // 관리중
              if (store.attendanceStatus === 'not_clocked_in') return 2 // 관리전
              if (store.attendanceStatus === 'clocked_out') return 3 // 관리완료
              return 5
            }
            return getSortOrder(a) - getSortOrder(b)
          })

        setStores(storesData)

        const today = getTodayDateKST()
        const storeIds = storesData.map(s => s.id)

        // 병렬로 데이터 로딩 (성능 최적화)
        const loadPromises: Promise<any>[] = []

        // 요청란 조회
        if (storeIds.length > 0) {
          loadPromises.push(
            fetch('/api/staff/requests')
              .then(async (res) => {
                if (!res.ok) {
                  console.error('Failed to load requests:', res.status, res.statusText)
                  return null
                }
                const contentType = res.headers.get('content-type')
                if (!contentType || !contentType.includes('application/json')) {
                  console.error('Invalid response type:', contentType)
                  return null
                }
                return res.json()
              })
              .then(data => {
                if (data && data.success && data.data) {
                  const requestsData: Request[] = data.data.map((req: any) => ({
                    id: req.id,
                    store_id: req.store_id,
                    store_name: req.stores?.name || '',
                    title: req.title,
                    category: req.title,
                  }))
                  setRequests(requestsData)
                }
              })
              .catch(error => {
                console.error('Error loading requests:', error)
                // 에러 발생 시 빈 배열로 설정하여 앱이 계속 작동하도록 함
                setRequests([])
              })
          )
        }

        // 오늘 업무 통계 및 최근 1주일 업무 통계는 접힌 상태이므로 초기 로딩 시 불러오지 않음
        // 사용자가 섹션을 펼칠 때만 로드됨 (아래 useEffect 참조)

        // 공지사항 로드
        loadPromises.push(loadAnnouncements())

        // 물품 요청 상태 로드 (API 사용 - RLS 우회)
        loadPromises.push(
          fetch('/api/staff/supply-requests')
            .then(async (res) => {
              const json = await res.json()
              if (json.success && json.data) {
                const supplyRequestsList = json.data.map((req: any) => ({
                  id: req.id,
                  store_id: req.store_id,
                  store_name: req.stores?.name || '',
                  title: req.title,
                  category: req.category,
                  status: req.status,
                  created_at: req.created_at,
                  completed_at: req.completed_at,
                }))
                setSupplyRequests(supplyRequestsList)
              }
            })
            .catch((err) => {
              console.error('Error loading supply requests:', err)
            })
        )

        // 체크리스트 진행율 및 미완료 건수 로드 (API 사용 - RLS 우회)
        if (storeIds.length > 0) {
          loadPromises.push(fetch('/api/staff/checklist-progress').then(async (res) => {
            const json = await res.json()
            if (json.success && json.data) {
              setChecklistProgress(json.data.progress || {})
              setIncompleteChecklists(json.data.incompleteChecklists || {})
              setIncompleteRequests(json.data.incompleteRequests || {})
            }
          }).catch((err) => {
            console.error('Error loading checklist progress:', err)
          }))
        }

        // 모든 데이터를 병렬로 로딩
        await Promise.all(loadPromises)

        setLoading(false)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [router])

  // 최근 업무 기록 섹션이 펼쳐질 때만 데이터 로드 (API 사용 - RLS 우회)
  useEffect(() => {
    if (isWorkHistoryExpanded && !workHistoryDataLoaded && stores.length > 0 && user) {
      const loadWorkHistoryData = async () => {
        try {
          const res = await fetch('/api/staff/work-stats')
          const json = await res.json()

          if (!res.ok || !json.success) return

          const { todayStats, weeklyStats } = json.data || {}
          if (todayStats) setTodayWorkStats(todayStats)
          if (weeklyStats) setWeeklyWorkStats(weeklyStats)
          setWorkHistoryDataLoaded(true)
        } catch (error) {
          console.error('Error loading work history data:', error)
        }
      }

      loadWorkHistoryData()
    }
  }, [isWorkHistoryExpanded, workHistoryDataLoaded, stores.length, user])


  // 체크리스트 업데이트 이벤트 리스너 (API 사용 - RLS 우회)
  const handleChecklistUpdate = useCallback(async () => {
    if (stores.length === 0) return
    await fetchChecklistProgress()
  }, [stores, fetchChecklistProgress])

  useEffect(() => {
    window.addEventListener('checklistUpdated', handleChecklistUpdate)
    
    return () => {
      window.removeEventListener('checklistUpdated', handleChecklistUpdate)
    }
  }, [handleChecklistUpdate])

  // Hooks는 조건부 return 이전에 호출되어야 함
  const totalStores = useMemo(() => stores.length, [stores.length])
  const hasRequests = useMemo(() => requests.length > 0, [requests.length])
  // 출근 중인 매장이 있는지 확인
  const hasActiveAttendance = useMemo(() => stores.some(s => s.attendanceStatus === 'clocked_in'), [stores])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center px-4">
          <p className="text-red-600 mb-4">사용자 정보를 불러올 수 없습니다.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* 헤더 - 반응형 */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">📅</span>
            <span className="text-xs sm:text-sm text-gray-600">Today</span>
            <span className="text-xs sm:text-sm font-medium truncate">{formatDate(currentTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">🕐</span>
            <span className="text-xs sm:text-sm font-medium">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* 직원 기본 정보 - 반응형 */}
      <Link href="/profile" className="block mb-4">
        <div className="bg-blue-600 text-white p-4 sm:p-6 hover:bg-blue-700 transition-colors cursor-pointer rounded-lg">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-400 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
              👤
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg font-semibold mb-1 truncate">{user.name || '직원'}</div>
              <div className="text-xs sm:text-sm text-blue-100">
                총 {totalStores}개 매장 관리
              </div>
            </div>
            <div className="text-white text-xl">›</div>
          </div>
        </div>
      </Link>

      <div className="px-3 sm:px-4 space-y-4">
        {/* 공지사항 - 최상단 */}
        {announcements.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg sm:text-xl">📢</span>
              <h2 className="text-base sm:text-lg font-semibold">공지사항</h2>
            </div>
            <div className="space-y-2">
              {announcements.map((announcement) => {
                // 읽은 공지사항은 3일 이내만 표시 (이미 loadAnnouncements에서 필터링됨)
                // 여기서는 읽은 공지사항만 연하게 표시
                const isRead = announcement.is_read
                
                return (
                <div
                  key={announcement.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isRead
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-yellow-50 border-yellow-300 hover:shadow-md'
                  }`}
                  onClick={() => setShowAnnouncementModal(announcement.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!announcement.is_read && (
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                        )}
                        <h3
                          className={`font-semibold text-sm sm:text-base truncate ${
                            announcement.is_read ? 'text-gray-600' : 'text-yellow-900'
                          }`}
                        >
                          {announcement.title}
                        </h3>
                      </div>
                      <p
                        className={`text-xs sm:text-sm line-clamp-2 ${
                          announcement.is_read ? 'text-gray-500' : 'text-yellow-800'
                        }`}
                      >
                        {announcement.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 빠른 시작 가이드 - 임시 숨김 처리 */}
        {/* {user && <QuickStartGuide userId={user.id} />} */}

        {/* 매장 관리 현황 - 반응형 */}
        <GeoGuard onLocationReady={setLocation}>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg sm:text-xl">📍</span>
              <h2 className="text-base sm:text-lg font-semibold">매장 관리 현황</h2>
            </div>
            <div className="space-y-2">
              {stores.length === 0 ? (
                <div className="text-xs sm:text-sm text-gray-500 text-center py-4">
                  배정된 매장이 없습니다.
                </div>
              ) : (
                stores.map((store) => {
                  let boxBgColor = 'bg-gray-50'
                  let boxBorderColor = 'border-gray-300'
                  let boxTextColor = 'text-gray-700'
                  
                  if (!store.isWorkDay) {
                    boxBgColor = 'bg-gray-100'
                    boxBorderColor = 'border-gray-300'
                    boxTextColor = 'text-gray-600'
                  } else if (store.attendanceStatus === 'not_clocked_in') {
                    boxBgColor = 'bg-red-50'
                    boxBorderColor = 'border-red-400'
                    boxTextColor = 'text-red-700'
                  } else if (store.attendanceStatus === 'clocked_in') {
                    boxBgColor = 'bg-orange-50'
                    boxBorderColor = 'border-orange-400'
                    boxTextColor = 'text-orange-700'
                  } else if (store.attendanceStatus === 'clocked_out') {
                    boxBgColor = 'bg-blue-50'
                    boxBorderColor = 'border-blue-400'
                    boxTextColor = 'text-blue-700'
                  }

                  // 실제 출근 처리 함수
                  const performClockIn = async (targetStore: StoreWithAssignment) => {
                    if (!location) {
                      alert('위치 정보를 가져올 수 없습니다.')
                      return
                    }
                    const result = await clockInAction(targetStore.id, location)
                    if (result.success && result.data) {
                      // 출근 상태를 즉시 업데이트 (출근 기록의 work_date 사용)
                      const attendanceData = result.data as { work_date?: string }
                      const workDate = attendanceData.work_date || getTodayDateKST()
                      
                      // 출근 기록의 work_date 기준으로 isWorkDay 재계산
                      const updatedIsWorkDay = isTodayWorkDay(
                        targetStore.management_days,
                        workDate, // 출근 기록의 work_date
                        targetStore.is_night_shift,
                        targetStore.work_start_hour,
                        targetStore.work_end_hour
                      )
                      
                      setStores((prevStores) =>
                        prevStores.map((s) =>
                          s.id === targetStore.id
                            ? {
                                ...s,
                                attendanceStatus: 'clocked_in' as const,
                                attendanceWorkDate: workDate,
                                isWorkDay: updatedIsWorkDay, // work_date 기준으로 재계산
                              }
                            : s
                        )
                      )
                      // 출근 후 체크리스트 진행율 등 데이터 다시 로드
                      fetchChecklistProgress()
                    } else {
                      alert(result.error || '관리시작 처리에 실패했습니다.')
                    }
                  }

                  const handleClockIn = async (e: React.MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!location) {
                      alert('위치 정보를 가져올 수 없습니다.')
                      return
                    }
                    
                    // 야간매장 금지 시간대 체크 (work_end_hour ~ work_start_hour 사이)
                    if (store.is_night_shift) {
                      const currentHour = getCurrentHourKST()
                      const endHour = store.work_end_hour ?? 8  // 기본값 8시
                      const startHour = store.work_start_hour ?? 18  // 기본값 18시
                      
                      // 금지 시간대: work_end_hour <= currentHour < work_start_hour
                      if (currentHour >= endHour && currentHour < startHour) {
                        alert(`야간 관리 시간이 아닙니다.\n관리 시작 시간: ${startHour < 12 ? `오전 ${startHour === 0 ? 12 : startHour}시` : `오후 ${startHour === 12 ? 12 : startHour - 12}시`}`)
                        return
                      }
                    }
                    
                    // 일반 매장이거나 야간 관리 시간이면 바로 출근 처리
                    await performClockIn(store)
                  }

                  const handleClockOut = async (e: React.MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!location) {
                      alert('위치 정보를 가져올 수 없습니다.')
                      return
                    }

                    const checklistCount = incompleteChecklists[store.id] || 0
                    const requestCount = incompleteRequests[store.id] || 0

                    if (checklistCount > 0 || requestCount > 0) {
                      setWarningMessage({
                        storeId: store.id,
                        message: '금일 수행 미션이 남아 있습니다',
                        checklistCount,
                        requestCount
                      })
                      return
                    }

                    setClockingOut(store.id)
                    const result = await clockOutAction(store.id, location)
                    setClockingOut(null)
                    
                    if (result.success) {
                      // 퇴근 상태를 즉시 업데이트
                      setStores((prevStores) =>
                        prevStores.map((s) =>
                          s.id === store.id
                            ? {
                                ...s,
                                attendanceStatus: 'clocked_out' as const,
                              }
                            : s
                        )
                      )
                      // 퇴근 후 체크리스트 진행율 제거
                      setChecklistProgress((prev) => {
                        const updated = { ...prev }
                        delete updated[store.id]
                        return updated
                      })
                      setIncompleteChecklists((prev) => {
                        const updated = { ...prev }
                        delete updated[store.id]
                        return updated
                      })
                      setIncompleteRequests((prev) => {
                        const updated = { ...prev }
                        delete updated[store.id]
                        return updated
                      })
                    } else {
                      alert(result.error || '관리완료 처리에 실패했습니다.')
                    }
                  }

                  const handleChecklistClick = (e: React.MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push('/checklist')
                  }
                  
                  return (
                    <div key={store.id}>
                    <div 
                      className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border-2 ${boxBgColor} ${boxBorderColor}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              !store.isWorkDay ? 'bg-gray-400' :
                              store.attendanceStatus === 'not_clocked_in' ? 'bg-red-500' :
                              store.attendanceStatus === 'clocked_in' ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                          ></div>
                          <span className={`font-medium text-sm sm:text-base truncate ${boxTextColor}`}>{store.name}</span>
                          {store.is_night_shift && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded flex-shrink-0">
                              야간
                            </span>
                          )}
                        </div>
                        {store.management_days && (() => {
                          // 요일을 월요일 기준으로 정렬
                          const dayOrder = ['월', '화', '수', '목', '금', '토', '일']
                          const days = store.management_days.split(',').map(d => d.trim())
                          const sortedDays = days.sort((a, b) => {
                            const aIndex = dayOrder.findIndex(day => a.includes(day))
                            const bIndex = dayOrder.findIndex(day => b.includes(day))
                            return aIndex - bIndex
                          })
                          // 야간매장 관리 시작 시간 표시
                          const timeDisplay = store.is_night_shift && store.work_start_hour !== null && store.work_start_hour !== undefined
                            ? `🕐 ${store.work_start_hour < 12 
                                ? `오전 ${store.work_start_hour === 0 ? 12 : store.work_start_hour}시`
                                : `오후 ${store.work_start_hour === 12 ? 12 : store.work_start_hour - 12}시`} 시작`
                            : null
                          return (
                            <div className={`text-xs ml-4 ${boxTextColor} flex items-center gap-2 flex-wrap`}>
                              {timeDisplay && (
                                <span className="text-purple-600 font-medium">{timeDisplay}</span>
                              )}
                              {timeDisplay && <span className="text-gray-400">|</span>}
                              <span>{sortedDays.join(',')}</span>
                            </div>
                          )
                        })()}
                          {/* 체크리스트 진행율 표시 (관리 중인 경우만) */}
                          {store.attendanceStatus === 'clocked_in' && checklistProgress[store.id] && (
                            <div className="mt-2 ml-4">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span 
                                  className="text-gray-600 cursor-pointer hover:text-blue-600 underline"
                                  onClick={handleChecklistClick}
                                >
                                  체크리스트 진행률
                                </span>
                                <span className="font-semibold text-blue-600">
                                  {checklistProgress[store.id].percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${checklistProgress[store.id].percentage}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {checklistProgress[store.id].completed} / {checklistProgress[store.id].total} 완료
                              </p>
                            </div>
                          )}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                          {store.isWorkDay ? (
                            store.attendanceStatus === 'not_clocked_in' ? (
                              <>
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 mb-1">
                                  관리전
                                </span>
                        <button
                                  onClick={handleClockIn}
                                  disabled={!location || hasActiveAttendance}
                                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                  관리시작
                        </button>
                              </>
                            ) : store.attendanceStatus === 'clocked_in' ? (
                              <>
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 mb-1">
                                  {store.attendanceType === 'rescheduled' ? '관리일 변경 관리중' : '관리중'}
                                </span>
                                <button
                                  onClick={handleClockOut}
                                  disabled={!location || clockingOut === store.id}
                                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                  {clockingOut === store.id ? '처리 중...' : '관리완료'}
                                </button>
                              </>
                            ) : (
                              // 관리완료 상태에서는 버튼을 표시하지 않음
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                                관리완료
                          </span>
                            )
                          ) : (
                            // 관리일 변경으로 관리 시작한 경우 관리완료 버튼 표시
                            store.attendanceStatus === 'clocked_in' && store.attendanceType === 'rescheduled' ? (
                              <>
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 mb-1">
                                  관리일 변경 관리중
                                </span>
                                <button
                                  onClick={handleClockOut}
                                  disabled={!location || clockingOut === store.id}
                                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                  {clockingOut === store.id ? '처리 중...' : '관리완료'}
                                </button>
                              </>
                            ) : (
                              <button
                                disabled
                                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-gray-200 text-gray-600 cursor-not-allowed"
                              >
                                미관리일
                              </button>
                            )
                          )}
                      </div>
                      </div>
                      {/* 운영 메모 (관리중일 때만, 매장명 바로 아래 접이식) */}
                      {store.attendanceStatus === 'clocked_in' && (
                        <OperationMemoSection storeId={store.id} storeName={store.name} />
                      )}
                      {/* 경고 메시지 */}
                      {warningMessage && warningMessage.storeId === store.id && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-semibold text-yellow-800 mb-2">
                            {warningMessage.message}
                          </p>
                          <div className="space-y-1 text-xs text-yellow-700">
                            {warningMessage.checklistCount > 0 && (
                              <p 
                                className="cursor-pointer hover:text-yellow-900 underline"
                                onClick={handleChecklistClick}
                              >
                                - 체크리스트 {warningMessage.checklistCount}건
                              </p>
                            )}
                            {warningMessage.requestCount > 0 && (
                              <p>
                                - 요청란 {warningMessage.requestCount}건
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setWarningMessage(null)}
                            className="mt-2 px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300"
                          >
                            확인
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </GeoGuard>

        {/* 요청란 - 반응형 */}
        <Link href="/requests" className="block">
          <div className={`rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
            hasRequests
              ? 'bg-yellow-50 border border-yellow-200 hover:shadow-md'
              : 'bg-gray-100 border border-gray-300'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-lg sm:text-xl ${hasRequests ? 'text-orange-500' : 'text-gray-400'}`}>⚠️</span>
              <h2 className={`text-base sm:text-lg font-semibold ${hasRequests ? 'text-yellow-800' : 'text-gray-600'}`}>
                요청란
              </h2>
              {hasRequests && (
                <span className="ml-auto px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded">
                  {requests.length}건
                </span>
              )}
            </div>
            {hasRequests ? (
              <div className="space-y-2">
                {requests.slice(0, 3).map((request) => {
                  // 해당 매장의 출근 상태 확인
                  const store = stores.find(s => s.id === request.store_id)
                  const isClockedIn = store?.attendanceStatus === 'clocked_in'
                  const isClockedOut = store?.attendanceStatus === 'clocked_out'
                  const isNotClockedIn = store?.attendanceStatus === 'not_clocked_in' || !store
                  
                  return (
                    <div 
                      key={request.id} 
                      className={`flex items-start gap-2 ${isNotClockedIn ? 'opacity-60' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        isNotClockedIn ? 'bg-gray-400' : 'bg-orange-500'
                      }`}></div>
                    <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-medium truncate ${
                          isNotClockedIn ? 'text-gray-600' : 'text-yellow-900'
                        }`}>
                          {request.store_name}
                    </div>
                        <div className={`text-xs sm:text-sm truncate ${
                          isNotClockedIn ? 'text-gray-500' : 'text-yellow-800'
                        }`}>
                          {request.category || request.title}
                  </div>
                      </div>
                    </div>
                  )
                })}
                {requests.length > 3 && (
                  <div className="text-xs text-yellow-700 text-center pt-2">
                    +{requests.length - 3}건 더 보기
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-xs sm:text-sm text-gray-600">
                요청 사항이 없습니다.
              </div>
            )}
          </div>
        </Link>

        {/* 물품 요청 상태 */}
        <Link href="/supplies" className="block">
          <div className="rounded-lg p-3 sm:p-4 bg-white border border-gray-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg sm:text-xl">📦</span>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                물품 요청 상태
              </h2>
              {supplyRequests.length > 0 && (
                <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                  {supplyRequests.length}건
                </span>
              )}
            </div>
            {supplyRequests.length > 0 ? (
              <div className="space-y-2">
                {supplyRequests.slice(0, 3).map((request) => {
                  const getStatusLabel = (status: string) => {
                    switch (status) {
                      case 'received':
                        return '접수'
                      case 'in_progress':
                        return '처리중'
                      case 'manager_in_progress':
                        return '점주 처리중'
                      case 'completed':
                        return '처리 완료'
                      default:
                        return status
                    }
                  }

                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'received':
                        return 'bg-gray-100 text-gray-800'
                      case 'in_progress':
                        return 'bg-blue-100 text-blue-800'
                      case 'manager_in_progress':
                        return 'bg-purple-100 text-purple-800'
                      case 'completed':
                        return 'bg-green-100 text-green-800'
                      default:
                        return 'bg-gray-100 text-gray-800'
                    }
                  }

                  const isCompleted = request.status === 'completed'
                  
                  return (
                    <div 
                      key={request.id} 
                      className={`flex items-start gap-2 ${isCompleted ? 'opacity-60' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        isCompleted ? 'bg-green-400' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`text-xs sm:text-sm font-medium truncate ${
                            isCompleted ? 'text-gray-500' : 'text-gray-900'
                          }`}>
                            {request.store_name}
                          </div>
                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </div>
                        <div className={`text-xs sm:text-sm truncate ${
                          isCompleted ? 'text-gray-400' : 'text-gray-700'
                        }`}>
                          {request.title}
                        </div>
                        {request.category && (
                          <div className={`text-xs truncate mt-0.5 ${
                            isCompleted ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {request.category}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {supplyRequests.length > 3 && (
                  <div className="text-xs text-blue-700 text-center pt-2">
                    +{supplyRequests.length - 3}건 더 보기
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-xs sm:text-sm text-gray-600">
                물품 요청이 없습니다.
              </div>
            )}
          </div>
        </Link>

        {/* 최근 업무 기록 - 탭 구조 */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
          <button
            onClick={() => setIsWorkHistoryExpanded(!isWorkHistoryExpanded)}
            className="w-full flex items-center justify-between gap-2 mb-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl">🕐</span>
              <h2 className="text-base sm:text-lg font-semibold">최근 관리 기록</h2>
            </div>
            <span className={`text-gray-400 transition-transform ${isWorkHistoryExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {isWorkHistoryExpanded && (
            <>
          
          {/* 탭 버튼 */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button
              onClick={() => setWorkHistoryTab('today')}
              className={`flex-1 py-2 text-sm sm:text-base font-medium transition-colors ${
                workHistoryTab === 'today'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              오늘
            </button>
            <button
              onClick={() => setWorkHistoryTab('weekly')}
              className={`flex-1 py-2 text-sm sm:text-base font-medium transition-colors ${
                workHistoryTab === 'weekly'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              최근 1주일
            </button>
          </div>

          {/* 오늘 탭 */}
          {workHistoryTab === 'today' && (() => {
            // 업무 기록이 있는 매장만 필터링
            const filteredStats = todayWorkStats.filter(stat => {
              return stat.checklist_completed > 0 ||
                     stat.request_completed > 0 ||
                     stat.store_problem_count > 0 ||
                     stat.vending_problem_count > 0 ||
                     stat.has_product_inflow ||
                     stat.has_storage_photo
            })
            
            return (
              <div className="space-y-3">
                {filteredStats.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-sm text-gray-500">오늘의 업무 기록이 없습니다.</div>
                  </div>
                ) : (
                  filteredStats.map((stat) => {
                    const isExpanded = expandedStores.has(stat.store_id)
                    const hasActivity = stat.checklist_completed > 0 || stat.request_completed > 0 || 
                                       stat.store_problem_count > 0 || stat.vending_problem_count > 0
                    
                    return (
                      <div key={stat.store_id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <button
                          onClick={() => {
                            setExpandedStores((prev) => {
                              const newSet = new Set(prev)
                              if (isExpanded) {
                                newSet.delete(stat.store_id)
                              } else {
                                newSet.add(stat.store_id)
                              }
                              return newSet
                            })
                          }}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                              📍
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-base text-gray-900 truncate">{stat.store_name}</div>
                              {!isExpanded && hasActivity && (
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  {stat.checklist_completed > 0 && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                      체크리스트 {stat.checklist_completed}
                                    </span>
                                  )}
                                  {stat.request_completed > 0 && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                      요청 {stat.request_completed}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-3">
                            <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                            <div className="grid grid-cols-2 gap-3 pt-4">
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-blue-500 text-sm">✅</span>
                                  <span className="text-xs text-gray-600 font-medium">체크리스트</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.checklist_completed}</div>
                                <div className="text-xs text-gray-500">완료</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-green-500 text-sm">📝</span>
                                  <span className="text-xs text-gray-600 font-medium">요청 완료</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.request_completed}</div>
                                <div className="text-xs text-gray-500">건</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-orange-500 text-sm">⚠️</span>
                                  <span className="text-xs text-gray-600 font-medium">매장 문제</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.store_problem_count}</div>
                                <div className="text-xs text-gray-500">건</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-purple-500 text-sm">🔧</span>
                                  <span className="text-xs text-gray-600 font-medium">자판기 문제</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.vending_problem_count}</div>
                                <div className="text-xs text-gray-500">건</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-teal-500 text-sm">📦</span>
                                  <span className="text-xs text-gray-600 font-medium">제품 입고</span>
                                </div>
                                <div className={`text-lg font-bold ${stat.has_product_inflow ? 'text-green-600' : 'text-gray-400'}`}>
                                  {stat.has_product_inflow ? '완료' : '-'}
                                </div>
                                <div className="text-xs text-gray-500">처리</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-indigo-500 text-sm">📸</span>
                                  <span className="text-xs text-gray-600 font-medium">보관사진</span>
                                </div>
                                <div className={`text-lg font-bold ${stat.has_storage_photo ? 'text-green-600' : 'text-gray-400'}`}>
                                  {stat.has_storage_photo ? '완료' : '-'}
                                </div>
                                <div className="text-xs text-gray-500">처리</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )
          })()}

          {/* 최근 1주일 탭 */}
          {workHistoryTab === 'weekly' && (() => {
            // 업무 기록이 있는 매장만 필터링
            const filteredStats = weeklyWorkStats.filter(stat => {
              return stat.daily_checklists.length > 0 ||
                     stat.store_problem_count > 0 ||
                     stat.request_completed > 0 ||
                     stat.product_inflow_count > 0 ||
                     stat.vending_problem_count > 0 ||
                     stat.lost_item_count > 0
            })
            
            return (
              <div className="space-y-3">
                {filteredStats.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📊</div>
                    <div className="text-sm text-gray-500">최근 1주일 업무 기록이 없습니다.</div>
                  </div>
                ) : (
                  filteredStats.map((stat) => {
                    const isExpanded = expandedStores.has(stat.store_id)
                    const totalChecklists = stat.daily_checklists.reduce((sum, d) => sum + d.count, 0)
                    const hasActivity = totalChecklists > 0 || stat.request_completed > 0 || 
                                       stat.store_problem_count > 0 || stat.vending_problem_count > 0
                    
                    return (
                      <div key={stat.store_id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <button
                          onClick={() => {
                            setExpandedStores((prev) => {
                              const newSet = new Set(prev)
                              if (isExpanded) {
                                newSet.delete(stat.store_id)
                              } else {
                                newSet.add(stat.store_id)
                              }
                              return newSet
                            })
                          }}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                              📍
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-base text-gray-900 truncate">{stat.store_name}</div>
                              {!isExpanded && hasActivity && (
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  {totalChecklists > 0 && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                      체크리스트 {totalChecklists}
                                    </span>
                                  )}
                                  {stat.request_completed > 0 && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                      요청 {stat.request_completed}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-3">
                            <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                            {/* 날짜별 체크리스트 건수 */}
                            {stat.daily_checklists.length > 0 && (
                              <div className="mb-4 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-purple-500">📅</span>
                                  <div className="text-sm font-semibold text-gray-700">날짜별 체크리스트</div>
                                </div>
                                <div className="space-y-2">
                                  {stat.daily_checklists.map((daily, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                                      <span className="text-sm text-gray-700">{daily.date}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900">{daily.count}</span>
                                        <span className="text-xs text-gray-500">건</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 최근 7일간 통계 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-orange-500 text-sm">⚠️</span>
                                  <span className="text-xs text-gray-600 font-medium">매장 문제</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.store_problem_count}</div>
                                <div className="text-xs text-gray-500">건</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-green-500 text-sm">📝</span>
                                  <span className="text-xs text-gray-600 font-medium">요청 완료</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.request_completed}</div>
                                <div className="text-xs text-gray-500">건</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-teal-500 text-sm">📦</span>
                                  <span className="text-xs text-gray-600 font-medium">제품 입고</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.product_inflow_count}</div>
                                <div className="text-xs text-gray-500">건</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-purple-500 text-sm">🔧</span>
                                  <span className="text-xs text-gray-600 font-medium">자판기 문제</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.vending_problem_count}</div>
                                <div className="text-xs text-gray-500">건</div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100 col-span-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-yellow-500 text-sm">🔍</span>
                                  <span className="text-xs text-gray-600 font-medium">분실물</span>
                                </div>
                                <div className="text-lg font-bold text-gray-900">{stat.lost_item_count}</div>
                                <div className="text-xs text-gray-500">건</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )
          })()}
            </>
          )}
        </div>

        {/* 메뉴 버튼들 - 반응형 */}
        <div className="space-y-2 pt-4">
          <Link
            href="/attendance"
            className="block bg-white rounded-lg shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                ⏰
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">관리시작/종료</div>
                <div className="text-xs sm:text-sm text-gray-600">GPS 기반 매장 관리</div>
              </div>
              <div className="text-gray-400 text-xl">›</div>
            </div>
          </Link>

          <Link
            href="/checklist"
            className="block bg-white rounded-lg shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                ✅
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">체크리스트</div>
                <div className="text-xs sm:text-sm text-gray-600">배정된 체크리스트 수행</div>
              </div>
              <div className="text-gray-400 text-xl">›</div>
            </div>
          </Link>

          <Link
            href="/issues"
            className="block bg-white rounded-lg shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-lg flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                ⚠️
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">매장문제보고</div>
                <div className="text-xs sm:text-sm text-gray-600">매장 문제, 자판기 내부 문제, 분실물 습득</div>
              </div>
              <div className="text-gray-400 text-xl">›</div>
            </div>
          </Link>

          <Link
            href="/product-photos"
            className="block bg-white rounded-lg shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-500 rounded-lg flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                📸
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">제품 입고 및 보관 사진</div>
                <div className="text-xs sm:text-sm text-gray-600">제품 입고 사진, 보관 사진 업로드</div>
              </div>
              <div className="text-gray-400 text-xl">›</div>
            </div>
          </Link>

          <Link
            href="/supplies"
            className="block bg-white rounded-lg shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 rounded-lg flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                📦
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">물품 요청</div>
                <div className="text-xs sm:text-sm text-gray-600">물품 요청 및 조회</div>
              </div>
              <div className="text-gray-400 text-xl">›</div>
            </div>
          </Link>

          <Link
            href="/product-search"
            className="block bg-white rounded-lg shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                🔍
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">바코드 제품 찾기</div>
                <div className="text-xs sm:text-sm text-gray-600">바코드 스캔 또는 제품명 검색</div>
              </div>
              <div className="text-gray-400 text-xl">›</div>
            </div>
          </Link>
        </div>
      </div>

      {/* 공지사항 모달 */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {announcements
              .filter((a) => a.id === showAnnouncementModal)
              .map((announcement) => (
                <div key={announcement.id}>
                  <h2 className="text-xl font-bold mb-4">{announcement.title}</h2>
                  <div className="text-sm text-gray-500 mb-4">
                    {new Date(announcement.created_at).toLocaleString('ko-KR')}
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap mb-6">
                    {announcement.content}
                  </div>
                  {!announcement.is_read && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowAnnouncementModal(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                      >
                        닫기
                      </button>
                      <button
                        onClick={() => handleMarkAsRead(announcement.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        확인
                      </button>
                    </div>
                  )}
                  {announcement.is_read && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowAnnouncementModal(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                      >
                        닫기
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 야간매장 관리시작 확인 모달 */}
      {showNightShiftConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-4 text-gray-900">관리 시작 시간 안내</h2>
            <p className="text-gray-700 mb-6">
              관리 시작 시간은 {showNightShiftConfirmModal.workStartHour < 12 
                ? `오전 ${showNightShiftConfirmModal.workStartHour === 0 ? 12 : showNightShiftConfirmModal.workStartHour}시`
                : `오후 ${showNightShiftConfirmModal.workStartHour === 12 ? 12 : showNightShiftConfirmModal.workStartHour - 12}시`}입니다.
              <br />
              지금 관리를 시작하시겠습니까?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNightShiftConfirmModal(null)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
              >
                돌아가기
              </button>
              <button
                onClick={async () => {
                  const storeId = showNightShiftConfirmModal.storeId
                  const targetStore = stores.find(s => s.id === storeId)
                  if (!targetStore) {
                    alert('매장 정보를 찾을 수 없습니다.')
                    setShowNightShiftConfirmModal(null)
                    return
                  }
                  setShowNightShiftConfirmModal(null)
                  if (!location) {
                    alert('위치 정보를 가져올 수 없습니다.')
                    return
                  }
                  const result = await clockInAction(targetStore.id, location)
                  if (result.success && result.data) {
                    // 출근 상태를 즉시 업데이트 (출근 기록의 work_date 사용)
                    const attendanceData = result.data as { work_date?: string }
                    const workDate = attendanceData.work_date || getTodayDateKST()
                    
                    // 출근 기록의 work_date 기준으로 isWorkDay 재계산
                    const updatedIsWorkDay = isTodayWorkDay(
                      targetStore.management_days,
                      workDate, // 출근 기록의 work_date
                      targetStore.is_night_shift,
                      targetStore.work_start_hour,
                      targetStore.work_end_hour
                    )
                    
                    setStores((prevStores) =>
                      prevStores.map((s) =>
                        s.id === targetStore.id
                          ? {
                              ...s,
                              attendanceStatus: 'clocked_in' as const,
                              attendanceWorkDate: workDate,
                              isWorkDay: updatedIsWorkDay, // work_date 기준으로 재계산
                            }
                          : s
                      )
                    )
                    // 출근 후 체크리스트 진행율 등 데이터 다시 로드
                    fetchChecklistProgress()
                  } else {
                    alert(result.error || '관리시작 처리에 실패했습니다.')
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                관리시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
