'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { calculateChecklistProgress } from '@/lib/utils/checklist'
import { GeoGuard } from '@/components/GeoGuard'
import { clockInAction, clockOutAction } from '../attendance/actions'
import { GPSLocation } from '@/types/db'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'

interface StoreWithAssignment {
  id: string
  name: string
  management_days: string | null
  isWorkDay: boolean
  attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out'
  attendanceWorkDate: string | null
  attendanceType?: string | null // 출근 유형 (regular, rescheduled, emergency)
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
  // 최근업무기록 아코디언 상태 (매장별로 접었다 폈다)
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set())
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getKoreanDayName = useCallback((dayIndex: number): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[dayIndex]
  }, [])

  const todayDayIndex = useMemo(() => currentTime.getDay(), [currentTime])
  const todayDayName = useMemo(() => getKoreanDayName(todayDayIndex), [getKoreanDayName, todayDayIndex])

  const isTodayWorkDay = useCallback((managementDays: string | null): boolean => {
    if (!managementDays) return false
    const days = managementDays.split(',').map(d => d.trim())
    return days.includes(todayDayName)
  }, [todayDayName])

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

  // 단일 매장의 체크리스트 진행율을 로드하는 함수
  const loadChecklistProgressForStore = useCallback(async (storeId: string, workDate: string, userId: string) => {
    const supabase = createClient()
    const { data: checklists, error } = await supabase
      .from('checklist')
      .select('id, store_id, items')
      .eq('store_id', storeId)
      .eq('work_date', workDate)
      .eq('assigned_user_id', userId)

    if (error) {
      console.error('Error loading checklist progress:', error)
      return
    }

    if (!checklists || checklists.length === 0) {
      return
    }

    let totalCompleted = 0
    let totalItems = 0

    checklists.forEach((checklist: any) => {
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

      totalCompleted += completed
      totalItems += total
    })

    const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
    
    setChecklistProgress((prev) => ({
      ...prev,
      [storeId]: { completed: totalCompleted, total: totalItems, percentage }
    }))
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
        setAnnouncements(data.data)
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
        // 공지사항 목록 업데이트
        setAnnouncements((prev) =>
          prev.map((ann) =>
            ann.id === announcementId
              ? { ...ann, is_read: true, read_at: new Date().toISOString() }
              : ann
          )
        )
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

        const today = getTodayDateKST()
        const yesterday = getYesterdayDateKST()

        // 오늘 날짜의 출근 기록 조회 (attendance_type 포함)
        const { data: todayAttendance, error: todayAttendanceError } = await supabase
            .from('attendance')
            .select('store_id, clock_out_at, work_date, attendance_type')
            .eq('user_id', session.user.id)
          .eq('work_date', today)

        // 어제 날짜의 미퇴근 기록도 조회 (날짜 경계를 넘는 야간 근무 고려)
        const { data: yesterdayAttendance, error: yesterdayAttendanceError } = await supabase
            .from('attendance')
            .select('store_id, clock_out_at, work_date, attendance_type')
            .eq('user_id', session.user.id)
          .eq('work_date', yesterday)
          .is('clock_out_at', null)

        if (todayAttendanceError || yesterdayAttendanceError) {
          console.error('Error loading attendance:', todayAttendanceError || yesterdayAttendanceError)
        }

        const attendanceMap = new Map<string, { status: 'not_clocked_in' | 'clocked_in' | 'clocked_out', workDate: string | null, attendanceType: string | null }>()
        
        // 오늘 날짜의 출근 기록 처리
        if (todayAttendance) {
          todayAttendance.forEach((attendance: any) => {
            if (attendance.work_date === today) {
              if (attendance.clock_out_at) {
                attendanceMap.set(attendance.store_id, { status: 'clocked_out', workDate: attendance.work_date, attendanceType: attendance.attendance_type || null })
              } else {
                attendanceMap.set(attendance.store_id, { status: 'clocked_in', workDate: attendance.work_date, attendanceType: attendance.attendance_type || null })
              }
            }
          })
        }
        
        // 어제 날짜의 미퇴근 기록 처리 (오늘 출근 기록이 없는 경우에만)
        if (yesterdayAttendance) {
          yesterdayAttendance.forEach((attendance: any) => {
            // 오늘 날짜로 이미 처리된 매장이 아니고, 미퇴근인 경우만 처리
            if (!attendanceMap.has(attendance.store_id) && !attendance.clock_out_at) {
              attendanceMap.set(attendance.store_id, { status: 'clocked_in', workDate: attendance.work_date, attendanceType: attendance.attendance_type || null })
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
            let attendanceType: string | null = null
            if (attendanceMap.has(store.id)) {
              const attendanceData = attendanceMap.get(store.id)
              attendanceStatus = attendanceData?.status || 'not_clocked_in'
              attendanceWorkDate = attendanceData?.workDate || null
              attendanceType = attendanceData?.attendanceType || null
            }
            
            // 출근일 변경으로 출근한 경우, isWorkDay가 false여도 출근 상태로 처리
            const isRescheduledAttendance = attendanceType === 'rescheduled' && attendanceStatus === 'clocked_in'
            
            return {
              id: store.id,
              name: store.name,
              management_days: store.management_days,
              isWorkDay: isTodayWorkDay(store.management_days) || isRescheduledAttendance, // 출근일 변경 출근도 근무일로 처리
              attendanceStatus,
              attendanceWorkDate,
              attendanceType,
            }
          })
          .filter((s: any): s is StoreWithAssignment => s !== null)
          .sort((a, b) => {
            // 정렬 순서: 1. 출근중, 2. 출근전, 3. 퇴근완료, 4. 휴무
            const getSortOrder = (store: StoreWithAssignment) => {
              if (!store.isWorkDay) return 4 // 휴무
              if (store.attendanceStatus === 'clocked_in') return 1 // 출근중
              if (store.attendanceStatus === 'not_clocked_in') return 2 // 출근전
              if (store.attendanceStatus === 'clocked_out') return 3 // 퇴근완료
              return 5
            }
            return getSortOrder(a) - getSortOrder(b)
          })

        setStores(storesData)

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

        // 오늘 업무 통계
        if (storeIds.length > 0) {
          loadPromises.push(
            loadTodayWorkStats(storesData, session.user.id, today, supabase)
          )
        }

        // 최근 1주일 업무 통계
        if (storeIds.length > 0) {
          loadPromises.push(
            loadWeeklyWorkStats(storesData, session.user.id, supabase)
          )
        }

        // 공지사항 로드
        loadPromises.push(loadAnnouncements())

        // 체크리스트 진행율 및 미완료 건수 로드
        if (storeIds.length > 0) {
          loadPromises.push(
            loadChecklistProgress(storesData, session.user.id, today, supabase)
          )
          
          // 미완료 건수 로드 (병렬 처리)
          const clockedInStores = storesData.filter(s => s.attendanceStatus === 'clocked_in')
          
          if (clockedInStores.length > 0) {
            const incompletePromises = clockedInStores.map(async (store) => {
              const checklistDate = store.attendanceWorkDate || today
              
              // 병렬로 체크리스트와 요청 조회
              const [checklistsResult, requestsResult] = await Promise.all([
                supabase
                  .from('checklist')
                  .select('id, items')
                  .eq('store_id', store.id)
                  .eq('work_date', checklistDate)
                  .eq('assigned_user_id', session.user.id),
                supabase
                  .from('requests')
                  .select('id, status')
                  .eq('store_id', store.id)
                  .eq('status', 'in_progress')
              ])

              const checklists = checklistsResult.data
              let incompleteCount = 0
              if (checklists) {
                checklists.forEach((checklist: any) => {
                  const validItems = (checklist.items as any[]).filter((item: any) => item.area?.trim())
                  if (validItems.length === 0) {
                    incompleteCount++
                    return
                  }
                  const allCompleted = validItems.every((item: any) => {
                    if (item.type === 'check') {
                      if (!item.checked) return false
                      if (item.status === 'bad' && !item.comment?.trim()) return false
                      return true
                    } else if (item.type === 'photo') {
                      return !!(item.before_photo_url && item.after_photo_url)
        }
                    return false
                  })
                  if (!allCompleted) {
                    incompleteCount++
                  }
                })
              }

              return {
                storeId: store.id,
                incompleteChecklist: incompleteCount,
                incompleteRequest: requestsResult.data?.length || 0,
              }
            })

            loadPromises.push(
              Promise.all(incompletePromises).then((results) => {
                const incompleteChecklistsMap: Record<string, number> = {}
                const incompleteRequestsMap: Record<string, number> = {}
                
                results.forEach((result) => {
                  incompleteChecklistsMap[result.storeId] = result.incompleteChecklist
                  incompleteRequestsMap[result.storeId] = result.incompleteRequest
                })

                setIncompleteChecklists(incompleteChecklistsMap)
                setIncompleteRequests(incompleteRequestsMap)
              })
            )
          }
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

    const loadTodayWorkStats = async (storesData: StoreWithAssignment[], userId: string, today: string, supabase: any) => {
      const todayStart = new Date(today + 'T00:00:00')
      const todayEnd = new Date(today + 'T23:59:59')

      // 모든 매장의 통계를 병렬로 조회
      const statsPromises = storesData.map(async (store) => {
        const checklistDate = store.attendanceStatus === 'clocked_in' && store.attendanceWorkDate
          ? store.attendanceWorkDate
          : today

        // 병렬로 모든 데이터 조회
        const [
          checklistsResult,
          completedRequestsResult,
          storeProblemsResult,
          vendingProblemsResult,
          productInflowResult,
          storagePhotosResult
        ] = await Promise.all([
          supabase
          .from('checklist')
          .select('*')
          .eq('store_id', store.id)
          .eq('work_date', checklistDate)
            .eq('assigned_user_id', userId),
          supabase
          .from('requests')
          .select('id')
          .eq('store_id', store.id)
          .eq('status', 'completed')
          .gte('updated_at', todayStart.toISOString())
            .lte('updated_at', todayEnd.toISOString()),
          supabase
          .from('problem_reports')
          .select('id')
          .eq('store_id', store.id)
          .eq('category', 'other')
          .like('title', '매장 문제%')
          .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString()),
          supabase
          .from('problem_reports')
          .select('id')
          .eq('store_id', store.id)
          .not('vending_machine_number', 'is', null)
          .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString()),
          supabase
          .from('product_photos')
          .select('id')
          .eq('store_id', store.id)
          .eq('type', 'receipt')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
            .limit(1),
          supabase
          .from('product_photos')
          .select('id')
          .eq('store_id', store.id)
          .eq('type', 'storage')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .limit(1)
        ])

        const checklists = checklistsResult.data
        let checklistCompleted = 0
        if (checklists) {
          checklists.forEach((checklist: any) => {
            const progress = calculateChecklistProgress(checklist)
            if (progress.percentage === 100) {
              checklistCompleted++
            }
          })
        }

        return {
          store_id: store.id,
          store_name: store.name,
          checklist_completed: checklistCompleted,
          request_completed: completedRequestsResult.data?.length || 0,
          store_problem_count: storeProblemsResult.data?.length || 0,
          vending_problem_count: vendingProblemsResult.data?.length || 0,
          has_product_inflow: (productInflowResult.data?.length || 0) > 0,
          has_storage_photo: (storagePhotosResult.data?.length || 0) > 0,
        }
      })

      const stats = await Promise.all(statsPromises)
      setTodayWorkStats(stats)
    }

    const loadChecklistProgress = async (storesData: StoreWithAssignment[], userId: string, today: string, supabase: any) => {
      // 출근 중인 매장만 체크리스트 진행율 표시
      const clockedInStores = storesData.filter(s => s.attendanceStatus === 'clocked_in')
      
      if (clockedInStores.length === 0) {
        setChecklistProgress({})
        return
      }
      
      // 병렬로 모든 매장의 체크리스트 진행율 조회
      const progressPromises = clockedInStores.map(async (store) => {
        const checklistDate = store.attendanceWorkDate || today
        
        const { data: checklists, error } = await supabase
          .from('checklist')
          .select('id, store_id, items')
          .eq('store_id', store.id)
          .eq('work_date', checklistDate)
          .eq('assigned_user_id', userId)

        if (error) {
          console.error('Error loading checklist progress:', error)
          return { storeId: store.id, progress: null }
        }

        if (!checklists || checklists.length === 0) {
          return { storeId: store.id, progress: null }
        }

        let totalCompleted = 0
        let totalItems = 0

        checklists.forEach((checklist: any) => {
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

          totalCompleted += completed
          totalItems += total
        })

        const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
        return {
          storeId: store.id,
          progress: { completed: totalCompleted, total: totalItems, percentage }
        }
      })

      const results = await Promise.all(progressPromises)
      const progress: Record<string, { completed: number; total: number; percentage: number }> = {}
      
      results.forEach((result) => {
        if (result.progress) {
          progress[result.storeId] = result.progress
        }
      })

      setChecklistProgress(progress)
    }



    const loadWeeklyWorkStats = async (storesData: StoreWithAssignment[], userId: string, supabase: any) => {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      const oneWeekAgoISO = oneWeekAgo.toISOString()

      // 모든 매장의 통계를 병렬로 조회
      const statsPromises = storesData.map(async (store) => {
        // 병렬로 모든 데이터 조회
        const [
          checklistsResult,
          storeProblemsResult,
          completedRequestsResult,
          productInflowResult,
          vendingProblemsResult,
          lostItemsResult
        ] = await Promise.all([
          supabase
          .from('checklist')
          .select('work_date')
          .eq('store_id', store.id)
          .eq('assigned_user_id', userId)
          .gte('work_date', oneWeekAgoStr)
            .lte('work_date', today),
          supabase
          .from('problem_reports')
          .select('id')
          .eq('store_id', store.id)
          .eq('category', 'other')
          .like('title', '매장 문제%')
            .gte('created_at', oneWeekAgoISO),
          supabase
          .from('requests')
          .select('id')
          .eq('store_id', store.id)
          .eq('status', 'completed')
            .gte('updated_at', oneWeekAgoISO),
          supabase
          .from('product_photos')
          .select('id')
          .eq('store_id', store.id)
          .eq('type', 'receipt')
            .gte('created_at', oneWeekAgoISO),
          supabase
          .from('problem_reports')
          .select('id')
          .eq('store_id', store.id)
          .not('vending_machine_number', 'is', null)
            .gte('created_at', oneWeekAgoISO),
          supabase
          .from('lost_items')
          .select('id')
          .eq('store_id', store.id)
            .gte('created_at', oneWeekAgoISO)
        ])

        const checklists = checklistsResult.data
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

        return {
          store_id: store.id,
          store_name: store.name,
          daily_checklists: dailyChecklistArray,
          store_problem_count: storeProblemsResult.data?.length || 0,
          request_completed: completedRequestsResult.data?.length || 0,
          product_inflow_count: productInflowResult.data?.length || 0,
          vending_problem_count: vendingProblemsResult.data?.length || 0,
          lost_item_count: lostItemsResult.data?.length || 0,
        }
      })

      const stats = await Promise.all(statsPromises)
      setWeeklyWorkStats(stats)
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [router])

  // 체크리스트 업데이트 이벤트 리스너 (통합 및 최적화)
  const handleChecklistUpdate = useCallback(async () => {
    if (stores.length === 0) return
    
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) return

    const today = getTodayDateKST()
    
    // 출근 중인 매장만 확인
    const clockedInStores = stores.filter(s => s.attendanceStatus === 'clocked_in')
    
    if (clockedInStores.length === 0) {
      setChecklistProgress({})
      setIncompleteChecklists({})
      setIncompleteRequests({})
      return
    }
    
    // 병렬로 모든 매장의 데이터 조회
    const storePromises = clockedInStores.map(async (store) => {
      const checklistDate = store.attendanceWorkDate || today
      
      // 병렬로 체크리스트와 요청 조회
      const [checklistsResult, requestsResult] = await Promise.all([
        supabase
          .from('checklist')
          .select('id, store_id, items')
          .eq('store_id', store.id)
          .eq('work_date', checklistDate)
          .eq('assigned_user_id', session.user.id),
        supabase
          .from('requests')
          .select('id, status')
          .eq('store_id', store.id)
          .eq('status', 'in_progress')
      ])

      const checklists = checklistsResult.data
      
      // 진행율 계산
      let totalCompleted = 0
      let totalItems = 0
      let incompleteCount = 0

      if (checklists) {
        checklists.forEach((checklist: any) => {
          const validItems = (checklist.items as any[]).filter((item: any) => item.area?.trim())
          const total = validItems.length
          
          if (total === 0) {
            incompleteCount++
            return
          }

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

          totalCompleted += completed
          totalItems += total

          // 미완료 체크
          const allCompleted = validItems.every((item: any) => {
            if (item.type === 'check') {
              if (!item.checked) return false
              if (item.status === 'bad' && !item.comment?.trim()) return false
              return true
            } else if (item.type === 'photo') {
              return !!(item.before_photo_url && item.after_photo_url)
            }
            return false
          })

          if (!allCompleted) {
            incompleteCount++
          }
        })
      }

      const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0

      return {
        storeId: store.id,
        progress: { completed: totalCompleted, total: totalItems, percentage },
        incompleteChecklist: incompleteCount,
        incompleteRequest: requestsResult.data?.length || 0,
      }
    })

    // 모든 매장 데이터를 병렬로 처리
    const results = await Promise.all(storePromises)

    // 결과를 state에 반영
    const progressMap: Record<string, { completed: number; total: number; percentage: number }> = {}
    const incompleteChecklistsMap: Record<string, number> = {}
    const incompleteRequestsMap: Record<string, number> = {}

    results.forEach((result) => {
      progressMap[result.storeId] = result.progress
      incompleteChecklistsMap[result.storeId] = result.incompleteChecklist
      incompleteRequestsMap[result.storeId] = result.incompleteRequest
    })

    setChecklistProgress(progressMap)
    setIncompleteChecklists(incompleteChecklistsMap)
    setIncompleteRequests(incompleteRequestsMap)
  }, [stores])

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
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    announcement.is_read
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
              ))}
            </div>
          </div>
        )}

        {/* 매장 출근 현황 - 반응형 */}
        <GeoGuard onLocationReady={setLocation}>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
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

                  const handleClockIn = async (e: React.MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!location) {
                      alert('위치 정보를 가져올 수 없습니다.')
                      return
                    }
                    const result = await clockInAction(store.id, location)
                    if (result.success && result.data) {
                      // 출근 상태를 즉시 업데이트 (출근 기록의 work_date 사용)
                      const workDate = result.data.work_date || getTodayDateKST()
                      setStores((prevStores) =>
                        prevStores.map((s) =>
                          s.id === store.id
                            ? {
                                ...s,
                                attendanceStatus: 'clocked_in' as const,
                                attendanceWorkDate: workDate,
                              }
                            : s
                        )
                      )
                      // 출근 후 체크리스트 진행율 등 데이터 다시 로드
                      const supabase = createClient()
                      supabase.auth.getSession().then(({ data: { session } }) => {
                        if (session) {
                          // 체크리스트 진행율 다시 로드 (출근일 기준)
                          loadChecklistProgressForStore(store.id, workDate, session.user.id)
                        }
                      })
                    } else {
                      alert(result.error || '출근 처리에 실패했습니다.')
                    }
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
                      alert(result.error || '퇴근 처리에 실패했습니다.')
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
                        </div>
                        {store.management_days && (
                          <div className={`text-xs ml-4 ${boxTextColor}`}>
                            {store.management_days}
                          </div>
                        )}
                          {/* 체크리스트 진행율 표시 (출근 중인 경우만) */}
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
                                  출근전
                                </span>
                        <button
                                  onClick={handleClockIn}
                                  disabled={!location || hasActiveAttendance}
                                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                  출근하기
                        </button>
                              </>
                            ) : store.attendanceStatus === 'clocked_in' ? (
                              <>
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 mb-1">
                                  {store.attendanceType === 'rescheduled' ? '출근일 변경 출근중' : '출근중'}
                                </span>
                                <button
                                  onClick={handleClockOut}
                                  disabled={!location || clockingOut === store.id}
                                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                  {clockingOut === store.id ? '처리 중...' : '퇴근하기'}
                                </button>
                              </>
                            ) : (
                              // 퇴근완료 상태에서는 버튼을 표시하지 않음
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                                퇴근완료
                          </span>
                            )
                          ) : (
                            // 출근일 변경으로 출근한 경우 퇴근 버튼 표시
                            store.attendanceStatus === 'clocked_in' && store.attendanceType === 'rescheduled' ? (
                              <>
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 mb-1">
                                  출근일 변경 출근중
                                </span>
                                <button
                                  onClick={handleClockOut}
                                  disabled={!location || clockingOut === store.id}
                                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                  {clockingOut === store.id ? '처리 중...' : '퇴근하기'}
                                </button>
                              </>
                            ) : (
                              <button
                                disabled
                                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-gray-200 text-gray-600 cursor-not-allowed"
                              >
                                휴무
                              </button>
                            )
                          )}
                      </div>
                      </div>
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
                todayWorkStats.map((stat) => {
                  const isExpanded = expandedStores.has(stat.store_id)
                  
                  return (
                    <div key={stat.store_id} className="border border-gray-200 rounded-lg bg-gray-50">
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
                        className="w-full flex items-center justify-between p-3 sm:p-4 text-left hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-semibold text-sm sm:text-base text-gray-800">{stat.store_name}</div>
                        <span className="text-gray-500 text-lg">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
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
                      )}
                    </div>
                  )
                })
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
                weeklyWorkStats.map((stat) => {
                  const isExpanded = expandedStores.has(stat.store_id)
                  
                  return (
                    <div key={stat.store_id} className="border border-gray-200 rounded-lg bg-gray-50">
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
                        className="w-full flex items-center justify-between p-3 sm:p-4 text-left hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-semibold text-sm sm:text-base text-gray-800">{stat.store_name}</div>
                        <span className="text-gray-500 text-lg">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
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
                      )}
                    </div>
                  )
                })
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
    </div>
  )
}
