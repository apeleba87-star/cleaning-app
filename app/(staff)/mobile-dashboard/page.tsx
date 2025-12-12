'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NavRoleSwitch } from '@/components/NavRoleSwitch'
import { calculateChecklistProgress } from '@/lib/utils/checklist'

interface StoreWithAssignment {
  id: string
  name: string
  management_days: string | null
  isWorkDay: boolean
  attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out'
}

interface TodayRequest {
  id: string
  store_id: string
  store_name: string
  title: string
}

interface TodayTask {
  store_id: string
  store_name: string
  checklist_count: number
  checklist_completed: number
  photo_count: number
  photo_completed: number
  completion_rate: number
}

interface RecentWork {
  id: string
  store_name: string
  work_date: string
  description: string
}

export default function MobileDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stores, setStores] = useState<StoreWithAssignment[]>([])
  const [todayRequests, setTodayRequests] = useState<TodayRequest[]>([])
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([])
  const [recentWorks, setRecentWorks] = useState<RecentWork[]>([])

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 요일 번호를 한글 요일로 변환
  const getKoreanDayName = (dayIndex: number): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[dayIndex]
  }

  // 오늘 요일 확인
  const todayDayIndex = currentTime.getDay()
  const todayDayName = getKoreanDayName(todayDayIndex)

  // management_days 문자열에서 오늘이 근무일인지 확인
  const isTodayWorkDay = (managementDays: string | null): boolean => {
    if (!managementDays) return false
    // "월,수,금" 형식에서 오늘 요일이 포함되어 있는지 확인
    const days = managementDays.split(',').map(d => d.trim())
    return days.includes(todayDayName)
  }

  // 날짜 포맷팅
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
    let timeoutId: NodeJS.Timeout | null = null
    
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

        // 사용자 정보 로드
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

        // 배정된 매장 정보 로드
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

        // 오늘 날짜
        const today = new Date().toISOString().split('T')[0]

        // 오늘 출근 정보 로드 (clock_out_at 포함)
        const { data: todayAttendance, error: attendanceError } = await supabase
          .from('attendance')
          .select('store_id, clock_out_at')
          .eq('user_id', session.user.id)
          .eq('work_date', today)

        // 매장별 출근 상태 맵 생성
        const attendanceMap = new Map<string, 'not_clocked_in' | 'clocked_in' | 'clocked_out'>()
        if (todayAttendance) {
          todayAttendance.forEach((attendance: any) => {
            if (attendance.clock_out_at) {
              attendanceMap.set(attendance.store_id, 'clocked_out')
            } else {
              attendanceMap.set(attendance.store_id, 'clocked_in')
            }
          })
        }

        // 매장 정보 처리
        const storesData: StoreWithAssignment[] = (
          storeAssignments || []
        )
          .map((assignment: any) => {
            const store = assignment.stores
            if (!store) return null
            
            // 출근 상태 결정
            let attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
            if (attendanceMap.has(store.id)) {
              attendanceStatus = attendanceMap.get(store.id) || 'not_clocked_in'
            }
            
            return {
              id: store.id,
              name: store.name,
              management_days: store.management_days,
              isWorkDay: isTodayWorkDay(store.management_days),
              attendanceStatus,
            }
          })
          .filter((s: any): s is StoreWithAssignment => s !== null)
          .sort((a, b) => {
            // 출근일이 먼저 (파란색), 휴무일이 나중에 (회색)
            if (a.isWorkDay && !b.isWorkDay) return -1
            if (!a.isWorkDay && b.isWorkDay) return 1
            return 0
          })

        setStores(storesData)

        // 오늘의 요청 사항 (issues)
        const storeIds = storesData.map(s => s.id)
        if (storeIds.length > 0) {
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const todayEnd = new Date()
          todayEnd.setHours(23, 59, 59, 999)

          const { data: issues, error: issuesError } = await supabase
            .from('issues')
            .select(`
              id,
              store_id,
              title,
              stores:store_id (
                name
              )
            `)
            .in('store_id', storeIds)
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())
            .eq('status', 'submitted')

          if (!issuesError && issues) {
            const requests: TodayRequest[] = issues.map((issue: any) => ({
              id: issue.id,
              store_id: issue.store_id,
              store_name: issue.stores?.name || '',
              title: issue.title,
            }))
            setTodayRequests(requests)
          } else {
            // 에러가 발생하거나 데이터가 없으면 빈 배열로 설정
            setTodayRequests([])
          }
        } else {
          // 배정된 매장이 없으면 빈 배열로 설정
          setTodayRequests([])
        }

        // 오늘 해야할 업무 (체크리스트 + 관리 사진) - 오늘이 출근일인 매장만
        if (storeIds.length > 0) {
          const tasks: TodayTask[] = []

          // 오늘이 출근일인 매장만 필터링
          const workDayStores = storesData.filter(store => store.isWorkDay)

          for (const store of workDayStores) {
            // 오늘의 체크리스트
            const { data: checklists, error: checklistError } = await supabase
              .from('checklist')
              .select('*')
              .eq('store_id', store.id)
              .eq('work_date', today)
              .eq('assigned_user_id', session.user.id)

            let checklistCount = 0
            let checklistCompleted = 0

            if (!checklistError && checklists) {
              checklistCount = checklists.length
              checklists.forEach((checklist: any) => {
                const progress = calculateChecklistProgress(checklist)
                if (progress.percentage === 100) {
                  checklistCompleted++
                }
              })
            }

            let photoCount = 0
            let photoCompleted = 0

            // 체크리스트에서 사진 항목 개수 계산
            if (checklists && checklists.length > 0) {
              checklists.forEach((checklist: any) => {
                const items = checklist.items || []
                const photoItems = items.filter((item: any) => 
                  item.type === 'photo' && item.area?.trim()
                )
                
                photoItems.forEach((item: any) => {
                  // 각 사진 항목은 before + after 2개
                  photoCount += 2
                  if (item.before_photo_url && item.after_photo_url) {
                    photoCompleted += 2
                  } else if (item.before_photo_url || item.after_photo_url) {
                    photoCompleted += 1
                  }
                })
              })
            }

            const totalTasks = checklistCount + photoCount
            const totalCompleted = checklistCompleted + photoCompleted
            const completionRate = totalTasks > 0 
              ? Math.round((totalCompleted / totalTasks) * 100) 
              : 0

            tasks.push({
              store_id: store.id,
              store_name: store.name,
              checklist_count: checklistCount,
              checklist_completed: checklistCompleted,
              photo_count: photoCount,
              photo_completed: photoCompleted,
              completion_rate: completionRate,
            })
          }

          setTodayTasks(tasks)
        }

        // 최근 업무 기록 (최근 1주일)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0]

        const { data: recentAttendance, error: recentError } = await supabase
          .from('attendance')
          .select(`
            id,
            store_id,
            work_date,
            clock_out_at,
            stores:store_id (
              name
            )
          `)
          .eq('user_id', session.user.id)
          .gte('work_date', oneWeekAgoStr)
          .not('clock_out_at', 'is', null)
          .order('work_date', { ascending: false })
          .limit(10)

        if (!recentError && recentAttendance) {
          const works: RecentWork[] = recentAttendance.map((attendance: any) => ({
            id: attendance.id,
            store_name: attendance.stores?.name || '',
            work_date: attendance.work_date,
            description: `${attendance.stores?.name || ''} 관리 완료`,
          }))
          setRecentWorks(works)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // 타임아웃 설정 (5초 후 강제로 로딩 해제)
    timeoutId = setTimeout(() => {
      console.warn('Loading timeout - forcing load to complete')
      if (isMounted) {
        setLoading(false)
      }
    }, 5000)

    loadDashboardData()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">사용자 정보를 불러올 수 없습니다.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    )
  }

  const totalStores = stores.length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className="text-sm text-gray-600">Today</span>
          <span className="text-sm font-medium">{formatDate(currentTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🕐</span>
          <span className="text-sm font-medium">{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* 직원 기본 정보 */}
      <div className="bg-blue-600 text-white p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-400 rounded-full flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <div className="text-lg font-semibold mb-1">{user.name || '직원'}</div>
            <div className="text-sm text-blue-100">
              총 {totalStores}개 매장 관리
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* 매장 출근 현황 */}
        <Link href="/attendance" className="block">
          <div className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <span>📍</span>
              <h2 className="text-lg font-semibold">매장 출근 현황</h2>
            </div>
          <div className="space-y-2">
            {stores.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                배정된 매장이 없습니다.
              </div>
            ) : (
              stores.map((store) => {
                // 박스 색상 결정
                let boxBgColor = 'bg-gray-50'
                let boxBorderColor = 'border-gray-300'
                let boxTextColor = 'text-gray-700'
                
                if (!store.isWorkDay) {
                  // 휴무일 - 회색
                  boxBgColor = 'bg-gray-100'
                  boxBorderColor = 'border-gray-300'
                  boxTextColor = 'text-gray-600'
                } else if (store.attendanceStatus === 'not_clocked_in') {
                  // 출근일이고 출근전 - 빨간색
                  boxBgColor = 'bg-red-50'
                  boxBorderColor = 'border-red-400'
                  boxTextColor = 'text-red-700'
                } else if (store.attendanceStatus === 'clocked_in') {
                  // 출근일이고 출근중 - 주황색
                  boxBgColor = 'bg-orange-50'
                  boxBorderColor = 'border-orange-400'
                  boxTextColor = 'text-orange-700'
                } else if (store.attendanceStatus === 'clocked_out') {
                  // 출근일이고 퇴근 - 파란색
                  boxBgColor = 'bg-blue-50'
                  boxBorderColor = 'border-blue-400'
                  boxTextColor = 'text-blue-700'
                }
                
                return (
                  <div 
                    key={store.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${boxBgColor} ${boxBorderColor}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            !store.isWorkDay ? 'bg-gray-400' :
                            store.attendanceStatus === 'not_clocked_in' ? 'bg-red-500' :
                            store.attendanceStatus === 'clocked_in' ? 'bg-orange-500' : 'bg-blue-500'
                          }`}
                        ></div>
                        <span className={`font-medium ${boxTextColor}`}>{store.name}</span>
                      </div>
                      {store.management_days && (
                        <div className={`text-xs ml-4 ${boxTextColor}`}>
                          {store.management_days}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          !store.isWorkDay
                            ? 'bg-gray-200 text-gray-600'
                            : store.attendanceStatus === 'not_clocked_in'
                            ? 'bg-red-600 text-white'
                            : store.attendanceStatus === 'clocked_in'
                            ? 'bg-orange-500 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                        disabled
                      >
                        {store.isWorkDay ? '출근일' : '휴무'}
                      </button>
                      {store.isWorkDay && (
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-medium ${
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

        {/* 오늘의 요청 사항 */}
        {todayRequests.length > 0 ? (
          <Link href="/issues" className="block">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-500">⚠️</span>
                <h2 className="text-lg font-semibold text-yellow-800">오늘의 요청 사항</h2>
              </div>
              <div className="space-y-2">
                {todayRequests.map((request) => (
                  <div key={request.id} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-yellow-900">{request.store_name}</span>
                      <span className="text-yellow-800 ml-2">{request.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-orange-500">⚠️</span>
              <h2 className="text-lg font-semibold text-yellow-800">오늘의 요청 사항</h2>
            </div>
            <div className="text-center py-4 text-yellow-700 text-sm">
              오늘 요청 사항이 없습니다.
            </div>
          </div>
        )}

        {/* 오늘 해야할 업무 */}
        {todayTasks.length > 0 && (
          <Link href="/checklist" className="block">
            <div className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span>📋</span>
                <h2 className="text-lg font-semibold">오늘 해야할 업무</h2>
              </div>
            <div className="space-y-4">
              {todayTasks.map((task) => {
                // 매장 출근 상태 찾기
                const store = stores.find(s => s.id === task.store_id)
                let boxBgColor = 'bg-gray-50'
                let boxBorderColor = 'border-gray-300'
                let progressColor = 'bg-gray-400'
                let textColor = 'text-gray-600'
                
                if (!store?.isWorkDay) {
                  // 휴무일 - 회색
                  boxBgColor = 'bg-gray-100'
                  boxBorderColor = 'border-gray-300'
                  progressColor = 'bg-gray-400'
                  textColor = 'text-gray-600'
                } else if (store.attendanceStatus === 'not_clocked_in') {
                  // 출근일이고 출근전 - 빨간색
                  boxBgColor = 'bg-red-50'
                  boxBorderColor = 'border-red-400'
                  progressColor = 'bg-red-500'
                  textColor = 'text-red-600'
                } else if (store.attendanceStatus === 'clocked_in') {
                  // 출근일이고 출근중 - 주황색
                  boxBgColor = 'bg-orange-50'
                  boxBorderColor = 'border-orange-400'
                  progressColor = 'bg-orange-500'
                  textColor = 'text-orange-600'
                } else if (store.attendanceStatus === 'clocked_out') {
                  // 출근일이고 퇴근 - 파란색
                  boxBgColor = 'bg-blue-50'
                  boxBorderColor = 'border-blue-400'
                  progressColor = 'bg-blue-500'
                  textColor = 'text-blue-600'
                }
                
                return (
                  <div key={task.store_id} className={`border-2 rounded-lg p-3 ${boxBgColor} ${boxBorderColor}`}>
                    <div className={`font-medium mb-2 ${textColor}`}>{task.store_name}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className={`${progressColor} h-2.5 rounded-full transition-all`}
                        style={{ width: `${task.completion_rate}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span>✓</span>
                          <span className={`${textColor}`}>체크리스트</span>
                          <span className={`font-medium ${textColor}`}>
                            {task.checklist_completed}/{task.checklist_count}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📷</span>
                          <span className={`${textColor}`}>관리 사진</span>
                          <span className={`font-medium ${textColor}`}>
                            {task.photo_completed}/{task.photo_count}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`${textColor}`}>↑</span>
                        <span className={`font-medium ${textColor}`}>{task.completion_rate}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            </div>
          </Link>
        )}

        {/* 최근 업무 기록 */}
        {recentWorks.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>🕐</span>
                <h2 className="text-lg font-semibold">최근 업무 기록</h2>
              </div>
              <span className="text-sm text-gray-500">최근 1주일</span>
            </div>
            <div className="space-y-2">
              {recentWorks.map((work) => (
                <div key={work.id} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <span className="text-gray-800">{work.description}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      - {work.work_date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메뉴 버튼들 */}
        <div className="space-y-2 pt-4">
          <Link
            href="/attendance"
            className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl">
                ⏰
              </div>
              <div className="flex-1">
                <div className="font-semibold">출퇴근</div>
                <div className="text-sm text-gray-600">GPS 기반 출퇴근 관리</div>
              </div>
              <div className="text-gray-400">›</div>
            </div>
          </Link>

          <Link
            href="/checklist"
            className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">
                ✅
              </div>
              <div className="flex-1">
                <div className="font-semibold">체크리스트</div>
                <div className="text-sm text-gray-600">배정된 체크리스트 수행</div>
              </div>
              <div className="text-gray-400">›</div>
            </div>
          </Link>

          <Link
            href="/photos"
            className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-2xl">
                📷
              </div>
              <div className="flex-1">
                <div className="font-semibold">청소 사진</div>
                <div className="text-sm text-gray-600">청소 전후 사진 업로드</div>
              </div>
              <div className="text-gray-400">›</div>
            </div>
          </Link>

          <Link
            href="/issues"
            className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div className="flex-1">
                <div className="font-semibold">매장문제보고</div>
                <div className="text-sm text-gray-600">매장 문제, 자판기 내부 문제, 분실물 습득</div>
              </div>
              <div className="text-gray-400">›</div>
            </div>
          </Link>

          <Link
            href="/product-photos"
            className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center text-2xl">
                📸
              </div>
              <div className="flex-1">
                <div className="font-semibold">제품 입고 및 보관 사진</div>
                <div className="text-sm text-gray-600">제품 입고 사진, 보관 사진 업로드</div>
              </div>
              <div className="text-gray-400">›</div>
            </div>
          </Link>

          <Link
            href="/supplies"
            className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center text-2xl">
                📦
              </div>
              <div className="flex-1">
                <div className="font-semibold">물품 요청</div>
                <div className="text-sm text-gray-600">물품 요청 및 조회</div>
              </div>
              <div className="text-gray-400">›</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
