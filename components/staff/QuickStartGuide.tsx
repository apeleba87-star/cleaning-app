'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTodayDateKST, getYesterdayDateKST } from '@/lib/utils/date'
import { calculateChecklistProgress } from '@/lib/utils/checklist'
import Link from 'next/link'

export type MissionId = 
  | 'start_management'
  | 'checklist'
  | 'check_requests'
  | 'product_photos'
  | 'store_issues'
  | 'supply_request'
  | 'barcode_search'

interface Mission {
  id: MissionId
  title: string
  description: string
  href: string
  icon: string
}

const MISSIONS: Mission[] = [
  {
    id: 'start_management',
    title: '관리시작',
    description: '매장 관리 시작하기',
    href: '/attendance',
    icon: '⏰',
  },
  {
    id: 'checklist',
    title: '체크리스트 확인',
    description: '체크리스트 확인 및 완료',
    href: '/checklist',
    icon: '✅',
  },
  {
    id: 'check_requests',
    title: '요청란 확인',
    description: '요청란의 요청 확인',
    href: '/requests',
    icon: '📋',
  },
  {
    id: 'product_photos',
    title: '제품 입고 사진',
    description: '제품 입고 사진 촬영',
    href: '/product-photos',
    icon: '📸',
  },
  {
    id: 'store_issues',
    title: '매장 문제 보고',
    description: '매장 문제 보고하기',
    href: '/issues',
    icon: '⚠️',
  },
  {
    id: 'supply_request',
    title: '물품 요청',
    description: '물품 요청하기',
    href: '/supplies',
    icon: '📦',
  },
  {
    id: 'barcode_search',
    title: '바코드 제품 찾기',
    description: '바코드로 제품 검색',
    href: '/product-search',
    icon: '🔍',
  },
]

interface MissionCompletion {
  [key: string]: {
    completed: boolean
    completedAt?: string
  }
}

interface QuickStartGuideProps {
  userId: string
}

export default function QuickStartGuide({ userId }: QuickStartGuideProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [missions, setMissions] = useState<Mission[]>(MISSIONS)
  const [completion, setCompletion] = useState<MissionCompletion>({})
  const [loading, setLoading] = useState(true)
  const [shouldShow, setShouldShow] = useState(true)

  // 로컬 스토리지에서 미션 완료 상태 불러오기
  const loadMissionCompletion = useCallback(() => {
    if (typeof window === 'undefined') return

    const today = getTodayDateKST()
    const storageKey = `quickStartGuide_${userId}_${today}`
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      try {
        const data = JSON.parse(stored)
        setCompletion(data.completion || {})
        
        // 전체 완료 여부 확인
        const allCompleted = MISSIONS.every(mission => data.completion?.[mission.id]?.completed)
        const completedDate = data.completedDate
        
        // 전체 완료했고, 완료한 날짜가 오늘이 아니면 숨김
        if (allCompleted && completedDate && completedDate !== today) {
          setShouldShow(false)
        } else {
          setShouldShow(true)
        }
      } catch (error) {
        console.error('Failed to parse mission completion:', error)
      }
    }
  }, [userId])

  // 로컬 스토리지에 미션 완료 상태 저장
  const saveMissionCompletion = useCallback((missionId: MissionId, completed: boolean) => {
    if (typeof window === 'undefined') return

    const today = getTodayDateKST()
    const storageKey = `quickStartGuide_${userId}_${today}`
    
    const currentData = localStorage.getItem(storageKey)
    let completionData: MissionCompletion = {}
    let completedDate: string | null = null

    if (currentData) {
      try {
        const parsed = JSON.parse(currentData)
        completionData = parsed.completion || {}
        completedDate = parsed.completedDate || null
      } catch (error) {
        console.error('Failed to parse existing completion data:', error)
      }
    }

    completionData[missionId] = {
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
    }

    // 전체 완료 여부 확인
    const allCompleted = MISSIONS.every(mission => 
      completionData[mission.id]?.completed
    )

    if (allCompleted && !completedDate) {
      completedDate = today
    }

    localStorage.setItem(storageKey, JSON.stringify({
      completion: completionData,
      completedDate,
    }))

    setCompletion(completionData)
    
    // 전체 완료했고, 완료한 날짜가 오늘이 아니면 숨김
    if (allCompleted && completedDate && completedDate !== today) {
      setShouldShow(false)
    }
  }, [userId])

  // 미션 완료 상태 확인 (에러 처리 및 재시도 로직 포함)
  const checkMissionCompletion = useCallback(async (retryCount = 0) => {
    if (!userId) return

    const maxRetries = 2
    const retryDelay = 1000 // 1초

    try {
      const supabase = createClient()
      const today = getTodayDateKST()
      const yesterday = getYesterdayDateKST()

      // 활성 출근 기록 조회 (야간 매장 대응)
      const { data: activeAttendances, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, work_date')
        .eq('user_id', userId)
        .in('work_date', [today, yesterday])
        .is('clock_out_at', null)

      if (attendanceError) {
        console.error('출근 기록 조회 실패:', attendanceError)
        // 에러가 발생해도 다른 미션 확인은 계속 진행
      }

      // 1. 관리시작 확인 - clock_in_at이 존재하면 관리시작 완료
      if (activeAttendances && activeAttendances.length > 0) {
        saveMissionCompletion('start_management', true)
      }

      // 활성 출근 기록의 work_date 목록 (체크리스트 조회용)
      const activeWorkDates = activeAttendances?.map(a => a.work_date) || []
      // 활성 출근 기록이 없으면 today와 yesterday 모두 확인 (최근 2일치)
      const workDatesToCheck = activeWorkDates.length > 0 ? activeWorkDates : [today, yesterday]

    // 2. 체크리스트 확인 - 체크리스트 완료 확인
    // completed_at이 있거나, calculateChecklistProgress로 완료된 체크리스트가 있는지 확인
    // 최근 2일치 체크리스트 확인 (야간 매장 대응)
    const { data: checklists, error: checklistError } = await supabase
      .from('checklist')
      .select('id, items, completed_at, work_date')
      .eq('assigned_user_id', userId)
      .in('work_date', workDatesToCheck)

    if (checklistError) {
      console.error('체크리스트 조회 실패:', checklistError)
      // 에러가 발생해도 다른 미션 확인은 계속 진행
    } else if (checklists && checklists.length > 0) {
      // completed_at이 있는 체크리스트가 있으면 완료
      const hasCompletedAt = checklists.some((cl: any) => cl.completed_at)
      
      // 또는 calculateChecklistProgress를 사용하여 완료된 체크리스트가 있는지 확인
      let hasCompletedChecklist = false
      if (!hasCompletedAt) {
        hasCompletedChecklist = checklists.some((cl: any) => {
          if (!cl.items || !Array.isArray(cl.items)) {
            return false
          }

          // calculateChecklistProgress 함수 사용 (로직 통일)
          const progress = calculateChecklistProgress(cl as any)
          // percentage가 100%이고 totalItems가 0보다 크면 완료
          return progress.percentage === 100 && progress.totalItems > 0
        })
      }

      if (hasCompletedAt || hasCompletedChecklist) {
        saveMissionCompletion('checklist', true)
      }
    }

    // 3. 요청란 확인 - supplies 페이지 방문은 pathname으로 체크
    // (페이지 방문은 별도로 처리)

      // 4. 제품 입고 사진 확인 (활성 출근 기록이 있으면 해당 날짜부터, 없으면 오늘부터)
      // 가장 이른 work_date 찾기
      const earliestWorkDate = activeWorkDates.length > 0 
        ? activeWorkDates.sort()[0]  // 날짜 문자열은 정렬 가능 (YYYY-MM-DD 형식)
        : today
      const productPhotoStartDate = `${earliestWorkDate}T00:00:00`
      const { data: productPhoto, error: productPhotoError } = await supabase
        .from('product_photos')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', productPhotoStartDate)
        .limit(1)
        .maybeSingle()

      if (productPhotoError) {
        console.error('제품 입고 사진 조회 실패:', productPhotoError)
      } else if (productPhoto) {
        saveMissionCompletion('product_photos', true)
      }

      // 5. 매장 문제 보고 확인 (활성 출근 기록이 있으면 해당 날짜부터, 없으면 오늘부터)
      const issueStartDate = `${earliestWorkDate}T00:00:00`
      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', issueStartDate)
        .limit(1)
        .maybeSingle()

      if (issueError) {
        console.error('매장 문제 보고 조회 실패:', issueError)
      } else if (issue) {
        saveMissionCompletion('store_issues', true)
      }

      // 6. 물품 요청 확인 (활성 출근 기록이 있으면 해당 날짜부터, 없으면 오늘부터)
      const supplyRequestStartDate = `${earliestWorkDate}T00:00:00`
      const { data: supplyRequest, error: supplyRequestError } = await supabase
        .from('supply_requests')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', supplyRequestStartDate)
        .limit(1)
        .maybeSingle()

      if (supplyRequestError) {
        console.error('물품 요청 조회 실패:', supplyRequestError)
      } else if (supplyRequest) {
        saveMissionCompletion('supply_request', true)
      }

      // 7. 바코드 제품 찾기 - product-search 페이지 방문은 pathname으로 체크
      // (페이지 방문은 별도로 처리)

      setLoading(false)
    } catch (error: any) {
      console.error('미션 완료 확인 중 오류 발생:', error)
      
      // 재시도 로직
      if (retryCount < maxRetries) {
        console.log(`미션 완료 확인 재시도 중... (${retryCount + 1}/${maxRetries})`)
        setTimeout(() => {
          checkMissionCompletion(retryCount + 1).catch(err => {
            console.error('재시도 실패:', err)
            setLoading(false)
          })
        }, retryDelay * (retryCount + 1)) // 지수 백오프
      } else {
        console.error('미션 완료 확인 최대 재시도 횟수 초과')
        setLoading(false)
      }
    }
  }, [userId, saveMissionCompletion])

  // 페이지 방문 시 미션 완료 처리
  useEffect(() => {
    if (!userId || loading) return

    // 체크리스트 확인 - checklist 페이지 방문
    if (pathname === '/checklist') {
      saveMissionCompletion('checklist', true)
    }

    // 요청란 확인 - requests 페이지 방문
    if (pathname === '/requests') {
      saveMissionCompletion('check_requests', true)
    }

    // 바코드 제품 찾기 - product-search 페이지 방문
    if (pathname === '/product-search') {
      saveMissionCompletion('barcode_search', true)
    }
  }, [pathname, userId, loading, saveMissionCompletion])

  // 커스텀 이벤트 리스너 (다른 컴포넌트에서 미션 완료 트리거)
  useEffect(() => {
    if (!userId) return

    const handleMissionComplete = async (event: CustomEvent<{ missionId: MissionId }>) => {
      const { missionId } = event.detail
      // 즉시 로컬 스토리지에 저장 (낙관적 업데이트)
      saveMissionCompletion(missionId, true)
      
      // 체크리스트 미션인 경우 즉시 DB 확인하여 정확성 보장
      if (missionId === 'checklist') {
        // 약간의 지연 후 DB 확인 (DB 업데이트 반영 시간 고려)
        setTimeout(() => {
          checkMissionCompletion().catch(err => {
            console.error('체크리스트 완료 확인 실패:', err)
            // 실패해도 로컬 스토리지 상태는 유지
          })
        }, 500)
      } else {
        // 다른 미션도 즉시 DB 확인
        checkMissionCompletion().catch(err => {
          console.error('미션 완료 확인 실패:', err)
        })
      }
    }

    window.addEventListener('missionComplete', handleMissionComplete as EventListener)

    return () => {
      window.removeEventListener('missionComplete', handleMissionComplete as EventListener)
    }
  }, [userId, saveMissionCompletion, checkMissionCompletion])

  // 초기 로드
  useEffect(() => {
    if (!userId) return

    loadMissionCompletion()
    checkMissionCompletion()
  }, [userId, loadMissionCompletion, checkMissionCompletion])

  // 미션 완료 상태에 따라 주기적으로 확인
  useEffect(() => {
    if (!userId || loading) return

    const interval = setInterval(() => {
      checkMissionCompletion()
    }, 30000) // 30초마다 확인

    return () => clearInterval(interval)
  }, [userId, loading, checkMissionCompletion])

  if (!shouldShow) {
    return null
  }

  const completedCount = MISSIONS.filter(
    mission => completion[mission.id]?.completed
  ).length
  const totalCount = MISSIONS.length
  const allCompleted = completedCount === totalCount
  const progressPercentage = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="bg-white rounded-lg p-4 md:p-6 mb-6 shadow-sm border border-gray-200">
      {/* 상단 헤더 섹션 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* 진행 중 배지 */}
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              진행 중
            </div>
          </div>
          {/* 우측 상단 진행률 원형 인디케이터 */}
          <div className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-700">{progressPercentage}%</span>
          </div>
        </div>
        
        {/* 가이드 제목 */}
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          빠른 시작 가이드
        </h2>
        
        {/* 미션 완료 현황 */}
        <p className="text-sm text-gray-600 mb-3">
          {completedCount}/{totalCount} 미션 완료
        </p>
        
        {/* 진행률 바 */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 미션 목록 */}
      <div className="space-y-3">
        {missions.map((mission, index) => {
          const isCompleted = completion[mission.id]?.completed || false
          
          return (
            <Link
              key={mission.id}
              href={mission.href}
              className={`
                relative flex items-center gap-3 p-3 rounded-lg transition-all
                ${isCompleted
                  ? 'bg-gray-50 opacity-60'
                  : 'bg-white hover:bg-gray-50'
                }
              `}
            >
              {/* 좌측 순서 번호 (연한 파란색 사각형) */}
              <div className="flex-shrink-0 w-8 h-8 bg-blue-200 rounded flex items-center justify-center">
                <span className="text-sm font-semibold text-white">{index + 1}</span>
              </div>
              
              {/* 아이콘 (주황색 계열) */}
              <div className="flex-shrink-0 text-2xl">
                {mission.icon}
              </div>
              
              {/* 미션 정보 */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`
                    font-semibold text-base mb-0.5
                    ${isCompleted ? 'text-gray-400' : 'text-gray-900'}
                  `}
                >
                  {mission.title}
                </h3>
                <p
                  className={`
                    text-sm
                    ${isCompleted ? 'text-gray-300' : 'text-gray-500'}
                  `}
                >
                  {mission.description}
                </p>
              </div>
              
              {/* 우측 완료 표시기 */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
