'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { calculateChecklistProgress } from '@/lib/utils/checklist'

interface StoreWithAssignment {
  id: string
  name: string
  management_days: string | null
  isWorkDay: boolean
  attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out'
  attendanceWorkDate: string | null
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
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stores, setStores] = useState<StoreWithAssignment[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [workHistoryTab, setWorkHistoryTab] = useState<WorkHistoryTab>('today')
  const [todayWorkStats, setTodayWorkStats] = useState<TodayWorkStats[]>([])
  const [weeklyWorkStats, setWeeklyWorkStats] = useState<WeeklyWorkStats[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getKoreanDayName = (dayIndex: number): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[dayIndex]
  }

  const todayDayIndex = currentTime.getDay()
  const todayDayName = getKoreanDayName(todayDayIndex)

  const isTodayWorkDay = (managementDays: string | null): boolean => {
    if (!managementDays) return false
    const days = managementDays.split(',').map(d => d.trim())
    return days.includes(todayDayName)
  }

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayName = getKoreanDayName(date.getDay())
    return `${year}년 ${month}월 ${day}일 ${dayName}요일`
  }

  const formatTime = (date: Date): string => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    const period = hours >= 12 ? '오후' : '오전'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${period} ${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

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

        const { data: storeAssignments, error: assignError } = await supabase
          .from('store_assign')
          .select(`
            store_id,
            stores:store_id (
              id,
              name,
              management_days
            )
          `)
          .eq('user_id', session.user.id)

        if (assignError) {
          console.error('Error loading store assignments:', assignError)
        }

        const today = new Date().toISOString().split('T')[0]

        const [todayResult, pastResult] = await Promise.all([
          supabase
            .from('attendance')
            .select('store_id, clock_out_at, work_date')
            .eq('user_id', session.user.id)
            .eq('work_date', today),
          supabase
            .from('attendance')
            .select('store_id, clock_out_at, work_date')
            .eq('user_id', session.user.id)
            .is('clock_out_at', null)
            .lt('work_date', today)
        ])
        
        const todayAttendance = [
          ...(todayResult.data || []),
          ...(pastResult.data || [])
        ]

        const attendanceMap = new Map<string, { status: 'not_clocked_in' | 'clocked_in' | 'clocked_out', workDate: string | null }>()
        if (todayAttendance) {
          todayAttendance.forEach((attendance: any) => {
            const existing = attendanceMap.get(attendance.store_id)
            if (attendance.work_date === today || !existing) {
              if (attendance.clock_out_at) {
                attendanceMap.set(attendance.store_id, { status: 'clocked_out', workDate: attendance.work_date })
              } else {
                attendanceMap.set(attendance.store_id, { status: 'clocked_in', workDate: attendance.work_date })
              }
            }
          })
        }

        const storesData: StoreWithAssignment[] = (
          storeAssignments || []
        )
          .map((assignment: any) => {
            const store = assignment.stores
            if (!store) return null
            
            let attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
            let attendanceWorkDate: string | null = null
            if (attendanceMap.has(store.id)) {
              const attendanceData = attendanceMap.get(store.id)
              attendanceStatus = attendanceData?.status || 'not_clocked_in'
              attendanceWorkDate = attendanceData?.workDate || null
            }
            
            return {
              id: store.id,
              name: store.name,
              management_days: store.management_days,
              isWorkDay: isTodayWorkDay(store.management_days),
              attendanceStatus,
              attendanceWorkDate,
            }
          })
          .filter((s: any): s is StoreWithAssignment => s !== null)
          .sort((a, b) => {
            if (a.isWorkDay && !b.isWorkDay) return -1
            if (!a.isWorkDay && b.isWorkDay) return 1
            return 0
          })

        setStores(storesData)

        const storeIds = storesData.map(s => s.id)

        // 요청란 조회
        if (storeIds.length > 0) {
          try {
            const response = await fetch('/api/staff/requests')
            const data = await response.json()
            if (data.success && data.data) {
              const requestsData: Request[] = data.data.map((req: any) => ({
                id: req.id,
                store_id: req.store_id,
                store_name: req.stores?.name || '',
                title: req.title,
                category: req.title, // title이 카테고리 정보를 포함
              }))
              setRequests(requestsData)
            }
          } catch (error) {
            console.error('Error loading requests:', error)
          }
        }

        // 오늘 업무 통계
        if (storeIds.length > 0) {
          await loadTodayWorkStats(storesData, session.user.id, today, supabase)
        }

        // 최근 1주일 업무 통계
        if (storeIds.length > 0) {
          await loadWeeklyWorkStats(storesData, session.user.id, supabase)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const loadTodayWorkStats = async (storesData: StoreWithAssignment[], userId: string, today: string, supabase: any) => {
      const stats: TodayWorkStats[] = []

      for (const store of storesData) {
        const checklistDate = store.attendanceStatus === 'clocked_in' && store.attendanceWorkDate
          ? store.attendanceWorkDate
          : today

        // 체크리스트 완료 건수
        const { data: checklists } = await supabase
          .from('checklist')
          .select('*')
          .eq('store_id', store.id)
          .eq('work_date', checklistDate)
          .eq('assigned_user_id', userId)

        let checklistCompleted = 0
        if (checklists) {
          checklists.forEach((checklist: any) => {
            const progress = calculateChecklistProgress(checklist)
            if (progress.percentage === 100) {
              checklistCompleted++
            }
          })
        }

        // 요청 완료 건수 (오늘)
        const todayStart = new Date(today + 'T00:00:00')
        const todayEnd = new Date(today + 'T23:59:59')
        const { data: completedRequests } = await supabase
          .from('requests')
          .select('id')
          .eq('store_id', store.id)
          .eq('status', 'completed')
          .gte('updated_at', todayStart.toISOString())
          .lte('updated_at', todayEnd.toISOString())

        // 매장 문제 보고 건수 (오늘)
        const { data: storeProblems } = await supabase
          .from('problem_reports')
          .select('id')
          .eq('store_id', store.id)
          .eq('category', 'other')
          .like('title', '매장 문제%')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())

        // 자판기 문제 보고 건수 (오늘)
        const { data: vendingProblems } = await supabase
          .from('problem_reports')
          .select('id')
          .eq('store_id', store.id)
          .not('vending_machine_number', 'is', null)
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())

        // 제품 입고 유무 (오늘)
        const { data: productInflow } = await supabase
          .from('product_photos')
          .select('id')
          .eq('store_id', store.id)
          .eq('type', 'receipt')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .limit(1)

        // 보관사진 유무 (오늘)
        const { data: storagePhotos } = await supabase
          .from('product_photos')
          .select('id')
          .eq('store_id', store.id)
          .eq('type', 'storage')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .limit(1)

        stats.push({
          store_id: store.id,
          store_name: store.name,
          checklist_completed: checklistCompleted,
          request_completed: completedRequests?.length || 0,
          store_problem_count: storeProblems?.length || 0,
          vending_problem_count: vendingProblems?.length || 0,
          has_product_inflow: (productInflow?.length || 0) > 0,
          has_storage_photo: (storagePhotos?.length || 0) > 0,
        })
      }

      setTodayWorkStats(stats)
    }

    const loadWeeklyWorkStats = async (storesData: StoreWithAssignment[], userId: string, supabase: any) => {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      const stats: WeeklyWorkStats[] = []

      for (const store of storesData) {
        // 날짜별 체크리스트 건수
        const { data: checklists } = await supabase
          .from('checklist')
          .select('work_date')
          .eq('store_id', store.id)
          .eq('assigned_user_id', userId)
          .gte('work_date', oneWeekAgoStr)
          .lte('work_date', today)

        const dailyChecklists: { [key: string]: number } = {}
        if (checklists) {
          checklists.forEach((cl: any) => {
            const date = cl.work_date
            dailyChecklists[date] = (dailyChecklists[date] || 0) + 1
          })
        }

        const dailyChecklistArray = Object.entries(dailyChecklists)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => b.date.localeCompare(a.date))

        // 최근 7일간 건수
        const { data: storeProblems } = await supabase
          .from('problem_reports')
          .select('id')
          .eq('store_id', store.id)
          .eq('category', 'other')
          .like('title', '매장 문제%')
          .gte('created_at', oneWeekAgo.toISOString())

        const { data: completedRequests } = await supabase
          .from('requests')
          .select('id')
          .eq('store_id', store.id)
          .eq('status', 'completed')
          .gte('updated_at', oneWeekAgo.toISOString())

        const { data: productInflow } = await supabase
          .from('product_photos')
          .select('id')
          .eq('store_id', store.id)
          .eq('type', 'receipt')
          .gte('created_at', oneWeekAgo.toISOString())

        const { data: vendingProblems } = await supabase
          .from('problem_reports')
          .select('id')
          .eq('store_id', store.id)
          .not('vending_machine_number', 'is', null)
          .gte('created_at', oneWeekAgo.toISOString())

        const { data: lostItems } = await supabase
          .from('lost_items')
          .select('id')
          .eq('store_id', store.id)
          .gte('created_at', oneWeekAgo.toISOString())

        stats.push({
          store_id: store.id,
          store_name: store.name,
          daily_checklists: dailyChecklistArray,
          store_problem_count: storeProblems?.length || 0,
          request_completed: completedRequests?.length || 0,
          product_inflow_count: productInflow?.length || 0,
          vending_problem_count: vendingProblems?.length || 0,
          lost_item_count: lostItems?.length || 0,
        })
      }

      setWeeklyWorkStats(stats)
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [router])

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

  const totalStores = stores.length
  const hasRequests = requests.length > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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
      <div className="bg-blue-600 text-white p-4 sm:p-6 mb-4">
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
        </div>
      </div>

      <div className="px-3 sm:px-4 space-y-4">
        {/* 매장 출근 현황 - 반응형 */}
        <Link href="/attendance" className="block">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg sm:text-xl">📍</span>
              <h2 className="text-base sm:text-lg font-semibold">매장 출근 현황</h2>
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
                  
                  return (
                    <div 
                      key={store.id} 
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
                        </div>
                        {store.management_days && (
                          <div className={`text-xs ml-4 ${boxTextColor}`}>
                            {store.management_days}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <button
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                            !store.isWorkDay
                              ? 'bg-gray-200 text-gray-600'
                              : 'bg-blue-600 text-white'
                          }`}
                          disabled
                        >
                          {store.isWorkDay ? '출근일' : '휴무'}
                        </button>
                        {store.isWorkDay && (
                          <span
                            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium ${
                              store.attendanceStatus === 'not_clocked_in'
                                ? 'bg-red-100 text-red-700'
                                : store.attendanceStatus === 'clocked_in'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {store.attendanceStatus === 'not_clocked_in'
                              ? '출근전'
                              : store.attendanceStatus === 'clocked_in'
                              ? '출근중'
                              : '퇴근완료'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </Link>

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
                {requests.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-yellow-900 truncate">{request.store_name}</div>
                      <div className="text-xs sm:text-sm text-yellow-800 truncate">{request.category || request.title}</div>
                    </div>
                  </div>
                ))}
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

        {/* 최근 업무 기록 - 탭 구조 */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg sm:text-xl">🕐</span>
            <h2 className="text-base sm:text-lg font-semibold">최근 업무 기록</h2>
          </div>
          
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
          {workHistoryTab === 'today' && (
            <div className="space-y-3">
              {todayWorkStats.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  오늘의 업무 기록이 없습니다.
                </div>
              ) : (
                todayWorkStats.map((stat) => (
                  <div key={stat.store_id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                    <div className="font-semibold text-sm sm:text-base mb-3 text-gray-800">{stat.store_name}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-600">체크리스트 완료:</span>
                        <span className="ml-1 font-medium">{stat.checklist_completed}건</span>
                      </div>
                      <div>
                        <span className="text-gray-600">요청 완료:</span>
                        <span className="ml-1 font-medium">{stat.request_completed}건</span>
                      </div>
                      <div>
                        <span className="text-gray-600">매장 문제:</span>
                        <span className="ml-1 font-medium">{stat.store_problem_count}건</span>
                      </div>
                      <div>
                        <span className="text-gray-600">자판기 문제:</span>
                        <span className="ml-1 font-medium">{stat.vending_problem_count}건</span>
                      </div>
                      <div>
                        <span className="text-gray-600">제품 입고:</span>
                        <span className={`ml-1 font-medium ${stat.has_product_inflow ? 'text-green-600' : 'text-gray-400'}`}>
                          {stat.has_product_inflow ? '있음' : '없음'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">보관사진:</span>
                        <span className={`ml-1 font-medium ${stat.has_storage_photo ? 'text-green-600' : 'text-gray-400'}`}>
                          {stat.has_storage_photo ? '있음' : '없음'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 최근 1주일 탭 */}
          {workHistoryTab === 'weekly' && (
            <div className="space-y-4">
              {weeklyWorkStats.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  최근 1주일 업무 기록이 없습니다.
                </div>
              ) : (
                weeklyWorkStats.map((stat) => (
                  <div key={stat.store_id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                    <div className="font-semibold text-sm sm:text-base mb-3 text-gray-800">{stat.store_name}</div>
                    
                    {/* 날짜별 체크리스트 건수 */}
                    {stat.daily_checklists.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">날짜별 체크리스트 건수</div>
                        <div className="space-y-1">
                          {stat.daily_checklists.map((daily, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs sm:text-sm bg-white rounded px-2 sm:px-3 py-1.5">
                              <span className="text-gray-700">{daily.date}</span>
                              <span className="font-medium text-gray-900">{daily.count}건</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 최근 7일간 건수 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-600">매장 문제:</span>
                        <span className="ml-1 font-medium">{stat.store_problem_count}건</span>
                      </div>
                      <div>
                        <span className="text-gray-600">요청 완료:</span>
                        <span className="ml-1 font-medium">{stat.request_completed}건</span>
                      </div>
                      <div>
                        <span className="text-gray-600">제품 입고:</span>
                        <span className="ml-1 font-medium">{stat.product_inflow_count}건</span>
                      </div>
                      <div>
                        <span className="text-gray-600">자판기 문제:</span>
                        <span className="ml-1 font-medium">{stat.vending_problem_count}건</span>
                      </div>
                      <div>
                        <span className="text-gray-600">분실물:</span>
                        <span className="ml-1 font-medium">{stat.lost_item_count}건</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                <div className="font-semibold text-sm sm:text-base">출퇴근</div>
                <div className="text-xs sm:text-sm text-gray-600">GPS 기반 출퇴근 관리</div>
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
        </div>
      </div>
    </div>
  )
}
