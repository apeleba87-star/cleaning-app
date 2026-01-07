'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getTodayDateKST } from '@/lib/utils/date'
import RequestForm from './RequestForm'
import { AttendanceCalendar } from '@/components/AttendanceCalendar'
import { useToast } from '@/components/Toast'
import { PhotoUploader } from '@/components/PhotoUploader'

interface StoreStatus {
  store_id: string
  store_name: string
  store_address: string | null
  is_work_day: boolean
  attendance_status: 'not_clocked_in' | 'clocked_in' | 'clocked_out'
  clock_in_time: string | null
  clock_out_time: string | null
  staff_name: string | null
  has_problem: boolean
  store_problem_count: number
  vending_problem_count: number
  lost_item_count: number
  unprocessed_store_problems: number
  received_request_count: number
  in_progress_request_count: number
  completed_request_count: number
  rejected_request_count?: number
  manager_in_progress_supply_request_count?: number
  before_photo_count: number
  after_photo_count: number
  before_after_photos?: Array<{ id: string; before_photo_url: string | null; after_photo_url: string | null; area: string }>
  checklist_completion_rate: number
  checklist_completed: number
  checklist_total: number
}

interface PhotoData {
  id: string
  title: string
  photo_url: string
  store_name: string
  created_at: string
  status: string
  category?: 'before_after' | 'problem' | 'product' // 사진 카테고리
  photo_type?: 'before' | 'after' | 'store_problem' | 'lost_item' | 'receipt' | 'order_sheet' | 'storage' // 사진 타입
}

export default function StoreManagerDashboardPage() {
  const { showToast, ToastContainer } = useToast()
  const [storeStatuses, setStoreStatuses] = useState<StoreStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPhotoData, setLoadingPhotoData] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'checklist' | 'attendance'>('overview')
  const [photoData, setPhotoData] = useState<PhotoData[]>([])
  const [photoCategoryTab, setPhotoCategoryTab] = useState<'before_after' | 'problem' | 'product' | 'storage'>('before_after')
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null)
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set())
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [currentPhotoList, setCurrentPhotoList] = useState<PhotoData[]>([])
  const [now, setNow] = useState(() => new Date().toLocaleString('ko-KR', { dateStyle: 'long' }))
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showStoreSelector, setShowStoreSelector] = useState(false)
  const [selectedRequestStatus, setSelectedRequestStatus] = useState<'received' | 'in_progress' | 'completed' | 'rejected' | null>(null)
  const [confirmedRequestIds, setConfirmedRequestIds] = useState<Set<string>>(new Set())
  const [showRequestStatusModal, setShowRequestStatusModal] = useState(false)
  const [requestStatusModalData, setRequestStatusModalData] = useState<{
    received: any[]
    in_progress: any[]
    completed: any[]
    rejected: any[]
  }>({
    received: [],
    in_progress: [],
    completed: [],
    rejected: [],
  })
  const [loadingRequestStatusModal, setLoadingRequestStatusModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  // 요청란 수정 관련 상태
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [editingRequest, setEditingRequest] = useState<any>(null)
  const [savingRequest, setSavingRequest] = useState(false)
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null)
  // 요청란 처리 완료 관련 상태
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null)
  const [completionPhoto, setCompletionPhoto] = useState<string>('')
  const [completionDescription, setCompletionDescription] = useState<string>('')
  const [completing, setCompleting] = useState(false)
  const [attendanceData, setAttendanceData] = useState<Array<{ date: string; store_id: string; store_name: string; attendance_count: number }>>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDailyDetailsModal, setShowDailyDetailsModal] = useState(false)
  const [dailyDetailsData, setDailyDetailsData] = useState<{
    cleaning_photos: any[]
    issues: any[]
    product_photos: any[]
  } | null>(null)
  const [loadingDailyDetails, setLoadingDailyDetails] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{
    cleaning_photos: boolean
    issues: boolean
    product_photos: boolean
  }>({
    cleaning_photos: false,
    issues: false,
    product_photos: false,
  })
  const [expandedStoresInModal, setExpandedStoresInModal] = useState<Set<string>>(new Set())

  // 무한 루프 방지를 위한 ref
  const isInitialLoadRef = useRef(true)
  const previousStoreIdsRef = useRef<string>('')
  const hasLoadedDataRef = useRef(false)
  const previousStoreDataRef = useRef<string>('')
  const lastLoadTimeRef = useRef<number>(0)
  const isLoadingRef = useRef(false)

  // loadStoreStatuses 함수를 먼저 정의 (useEffect에서 사용하기 전에)
  const loadStoreStatuses = useCallback(async (forceRefresh = false) => {
    // 중복 호출 방지
    if (isLoadingRef.current) {
      console.log('[Dashboard] 이미 로딩 중이므로 스킵')
      return
    }

    // 최소 간격 체크 (5초) - 강제 새로고침이 아닌 경우에만
    const now = Date.now()
    const MIN_INTERVAL = 5000 // 5초
    if (!forceRefresh && now - lastLoadTimeRef.current < MIN_INTERVAL) {
      console.log('[Dashboard] 최소 간격 미달, 호출 스킵', {
        elapsed: now - lastLoadTimeRef.current,
        minInterval: MIN_INTERVAL
      })
      return
    }

    isLoadingRef.current = true
    lastLoadTimeRef.current = now

    try {
      setLoading(true)
      console.log('[Dashboard] loadStoreStatuses 호출 시작', { forceRefresh, timestamp: new Date().toISOString() })
      
      const response = await fetch('/api/store-manager/stores/status')
      const data = await response.json()

      console.log('[Dashboard] API Response:', { ok: response.ok, status: response.status, data })

      if (response.ok) {
        if (data.data && Array.isArray(data.data)) {
          console.log(`[Dashboard] Loaded ${data.data.length} stores`)
          
          // 각 매장의 출근 상태 디버깅
          data.data.forEach((store: StoreStatus) => {
            console.log(`[Dashboard] Store: ${store.store_name}`, {
              attendance_status: store.attendance_status,
              clock_in_time: store.clock_in_time,
              clock_out_time: store.clock_out_time,
            })
          })
          
          // 실제 데이터 변경 여부 확인 (JSON 문자열 비교)
          const newDataString = JSON.stringify(data.data.map((s: StoreStatus) => ({
            store_id: s.store_id,
            store_name: s.store_name,
            attendance_status: s.attendance_status,
            clock_in_time: s.clock_in_time,
            clock_out_time: s.clock_out_time,
            has_problem: s.has_problem,
            store_problem_count: s.store_problem_count,
            received_request_count: s.received_request_count,
            in_progress_request_count: s.in_progress_request_count,
            completed_request_count: s.completed_request_count,
            rejected_request_count: s.rejected_request_count,
            before_photo_count: s.before_photo_count,
            after_photo_count: s.after_photo_count,
            checklist_completion_rate: s.checklist_completion_rate,
          })))
          
          // 실제 데이터가 변경된 경우에만 상태 업데이트
          if (newDataString !== previousStoreDataRef.current) {
            console.log('[Dashboard] 데이터 변경 감지, 상태 업데이트')
            previousStoreDataRef.current = newDataString
            setStoreStatuses(data.data)
            // BottomNavigation에 알림 (이벤트 발생)
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('storeStatusesUpdated', { detail: data.data }))
            }
          } else {
            console.log('[Dashboard] 데이터 변경 없음, 상태 업데이트 스킵')
          }
        } else {
          console.warn('[Dashboard] No data array in response:', data)
          if (forceRefresh || storeStatuses.length === 0) {
            setStoreStatuses([])
          }
        }
      } else {
        console.error('[Dashboard] API Error:', data.error || data.message)
        if (forceRefresh) {
          alert(data.error || data.message || '매장 정보를 불러오는데 실패했습니다.')
        }
        if (forceRefresh || storeStatuses.length === 0) {
          setStoreStatuses([])
        }
      }
    } catch (error) {
      console.error('Error loading store statuses:', error)
      if (forceRefresh) {
        alert('매장 정보를 불러오는 중 오류가 발생했습니다.')
      }
      if (forceRefresh || storeStatuses.length === 0) {
        setStoreStatuses([])
      }
    } finally {
      setLoading(false)
      isLoadingRef.current = false
      console.log('[Dashboard] loadStoreStatuses 완료')
    }
  }, []) // 의존성 배열을 비워서 함수가 재생성되지 않도록

  // 확인된 요청 ID 로드 (localStorage에서)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const allConfirmedIds = new Set<string>()
    
    // 모든 매장의 확인된 요청 ID를 가져옴
    storeStatuses.forEach((store) => {
      const storageKey = `confirmed_requests_${store.store_id}_${today}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const ids = JSON.parse(stored)
          ids.forEach((id: string) => allConfirmedIds.add(id))
        } catch (e) {
          console.error('Error loading confirmed requests:', e)
        }
      }
    })
    
    setConfirmedRequestIds(allConfirmedIds)
  }, [storeStatuses])

  useEffect(() => {
    // 초기 로드만 실행
    if (isInitialLoadRef.current) {
      loadStoreStatuses(false)
      isInitialLoadRef.current = false
    }

    const timer = setInterval(() => {
      setNow(new Date().toLocaleString('ko-KR', { dateStyle: 'long' }))
    }, 60 * 1000)

    // 전역 함수로 노출 (NavRoleSwitch에서 사용) - 강제 새로고침
    ;(window as any).refreshStoreStatuses = () => {
      console.log('[Dashboard] 수동 새로고침 요청')
      hasLoadedDataRef.current = false
      previousStoreIdsRef.current = ''
      lastLoadTimeRef.current = 0 // 강제 새로고침이므로 간격 체크 무시
      loadStoreStatuses(true) // forceRefresh = true
    }

    // 전역 함수로 storeStatuses 노출 (BottomNavigation에서 사용)
    ;(window as any).getStoreStatuses = () => {
      return storeStatuses
    }

    return () => {
      clearInterval(timer)
      delete (window as any).refreshStoreStatuses
      delete (window as any).getStoreStatuses
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 의존성 배열을 비워서 마운트 시 한 번만 실행

  // 로딩 상태를 전역으로 업데이트
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).isRefreshingStoreStatuses = loading
    }
  }, [loading])

  useEffect(() => {
    // 매장이 1개인 경우 자동 선택
    if (storeStatuses.length === 1 && !selectedStoreId) {
      setSelectedStoreId(storeStatuses[0].store_id)
    }
  }, [storeStatuses])

  // storeStatuses의 store_id만 추출하여 비교 (실제 데이터 변경 여부 확인)
  const storeIdsString = useMemo(() => {
    return storeStatuses.map(s => s.store_id).sort().join(',')
  }, [storeStatuses])

  useEffect(() => {
    // 초기 로드이거나 storeIds가 실제로 변경된 경우에만 실행
    if (storeStatuses.length > 0 && (previousStoreIdsRef.current !== storeIdsString || !hasLoadedDataRef.current)) {
      previousStoreIdsRef.current = storeIdsString
      hasLoadedDataRef.current = true
      
      loadPhotoData()
      // 초기 로드 시 모든 매장의 요청을 미리 로드하여 카운트 계산에 사용
      loadAllRequestsForCount()
      // 출근 현황 데이터 로드
      loadAttendanceData()
    }
  }, [storeIdsString, storeStatuses.length])

  // 모든 매장의 요청을 미리 로드 (카운트 계산용) - 병렬 처리로 최적화
  const loadAllRequestsForCount = async () => {
    if (storeStatuses.length === 0) return
    
    try {
      const allReceivedRequests: any[] = []
      const allInProgressRequests: any[] = []
      const allCompletedRequests: any[] = []
      const allRejectedRequests: any[] = []

      // Promise.all로 모든 매장의 요청을 병렬로 조회
      const timestamp = new Date().getTime()
      const requestPromises = storeStatuses.map(async (store) => {
        try {
          const response = await fetch(`/api/store-manager/stores/${store.store_id}/requests?t=${timestamp}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            
            if (data.success && data.data) {
              const requestsData = data.data
              
              // 매장 정보를 각 요청에 추가
              return {
                received: (requestsData.received || []).map((req: any) => ({
                  ...req,
                  store_name: store.store_name,
                  store_id: store.store_id,
                })),
                inProgress: (requestsData.in_progress || []).map((req: any) => ({
                  ...req,
                  store_name: store.store_name,
                  store_id: store.store_id,
                })),
                completed: (requestsData.completed || []).map((req: any) => ({
                  ...req,
                  store_name: store.store_name,
                  store_id: store.store_id,
                })),
                rejected: (requestsData.rejected || []).map((req: any) => ({
                  ...req,
                  store_name: store.store_name,
                  store_id: store.store_id,
                })),
              }
            }
          }
          return null
        } catch (error) {
          console.error(`Error fetching requests for store ${store.store_id}:`, error)
          // 개별 매장 오류는 null 반환하여 무시
          return null
        }
      })

      // 모든 요청을 병렬로 처리
      const results = await Promise.all(requestPromises)
      
      // 결과를 합치기
      results.forEach((result) => {
        if (result) {
          allReceivedRequests.push(...result.received)
          allInProgressRequests.push(...result.inProgress)
          allCompletedRequests.push(...result.completed)
          allRejectedRequests.push(...result.rejected)
        }
      })

      // 모든 매장의 요청을 합쳐서 설정
      setRequestStatusModalData({
        received: allReceivedRequests,
        in_progress: allInProgressRequests,
        completed: allCompletedRequests,
        rejected: allRejectedRequests,
      })
    } catch (error) {
      console.error('Error loading all requests for count:', error)
    }
  }

  const loadAttendanceData = async () => {
    if (storeStatuses.length === 0) return
    
    try {
      setLoadingAttendance(true)
      const storeIds = storeStatuses.map(s => s.store_id)
      
      // 현재 월의 시작일과 종료일 계산
      const now = new Date()
      const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      const currentYear = koreaTime.getFullYear()
      const currentMonth = koreaTime.getMonth()
      const monthStart = new Date(currentYear, currentMonth, 1)
      const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
      
      const startDate = monthStart.toISOString().split('T')[0]
      const endDate = monthEnd.toISOString().split('T')[0]
      
      // 출근 데이터 조회
      const response = await fetch(`/api/store-manager/attendance/monthly?start_date=${startDate}&end_date=${endDate}&store_ids=${storeIds.join(',')}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setAttendanceData(data.data)
        }
      } else {
        console.error('Error loading attendance data:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading attendance data:', error)
    } finally {
      setLoadingAttendance(false)
    }
  }


  const loadPhotoData = async () => {
    try {
      setLoadingPhotoData(true)
      const photos: PhotoData[] = []
      const photoIdSet = new Set<string>() // 중복 방지를 위한 Set
      const todayDateKST = getTodayDateKST()
      
      // 배치 크기: 3개씩 묶어서 처리
      const BATCH_SIZE = 3
      
      // 매장을 배치로 나누기
      for (let i = 0; i < storeStatuses.length; i += BATCH_SIZE) {
        const batch = storeStatuses.slice(i, i + BATCH_SIZE)
        
        // 배치 내 모든 매장의 사진 데이터를 병렬로 수집
        await Promise.allSettled(
          batch.map(async (store) => {
            try {
              // 1. 체크리스트의 관리 전후 사진 (storeStatuses의 before_after_photos 사용)
              if (store.before_after_photos && store.before_after_photos.length > 0) {
                store.before_after_photos.forEach((photo: any) => {
                  // 관리 전 사진
                  if (photo.before_photo_url) {
                    const photoId = `checklist-${photo.id}-before`
                    if (!photoIdSet.has(photoId)) {
                      photoIdSet.add(photoId)
                      // work_date나 created_at을 사용, 없으면 오늘 날짜
                      const photoDate = photo.work_date || photo.created_at || new Date().toISOString()
                      photos.push({
                        id: photoId,
                        title: `${photo.area || '체크리스트'} - 관리 전`,
                        photo_url: photo.before_photo_url,
                        store_name: store.store_name,
                        created_at: photoDate,
                        status: 'completed',
                        category: 'before_after',
                        photo_type: 'before',
                      })
                    }
                  }
                  // 관리 후 사진
                  if (photo.after_photo_url) {
                    const photoId = `checklist-${photo.id}-after`
                    if (!photoIdSet.has(photoId)) {
                      photoIdSet.add(photoId)
                      // work_date나 created_at을 사용, 없으면 오늘 날짜
                      const photoDate = photo.work_date || photo.created_at || new Date().toISOString()
                      photos.push({
                        id: photoId,
                        title: `${photo.area || '체크리스트'} - 관리 후`,
                        photo_url: photo.after_photo_url,
                        store_name: store.store_name,
                        created_at: photoDate,
                        status: 'completed',
                        category: 'before_after',
                        photo_type: 'after',
                      })
                    }
                  }
                })
              }

              // 2. 매장 문제 보고 및 분실물 사진
              const [problemResponse, lostResponse] = await Promise.all([
                fetch(`/api/store-manager/stores/${store.store_id}/problem-reports`),
                fetch(`/api/store-manager/stores/${store.store_id}/lost-items`),
              ])

              if (problemResponse.ok) {
                const problemData = await problemResponse.json()
                if (problemData.data) {
                  // 매장 문제 보고
                  problemData.data.store_problems?.forEach((p: any) => {
                    const createdDate = new Date(p.created_at).toISOString().split('T')[0]
                    if (p.photo_url && createdDate === todayDateKST) {
                      const photoUrls = typeof p.photo_url === 'string' 
                        ? (p.photo_url.startsWith('[') ? JSON.parse(p.photo_url) : [p.photo_url])
                        : []
                      photoUrls.forEach((url: string) => {
                        photos.push({
                          id: `problem-${p.id}-${url}`,
                          title: p.title || '매장 문제 보고',
                          photo_url: url,
                          store_name: store.store_name,
                          created_at: p.created_at,
                          status: p.status,
                          category: 'problem',
                          photo_type: 'store_problem',
                        })
                      })
                    }
                  })
                }
              }

              if (lostResponse.ok) {
                const lostData = await lostResponse.json()
                if (lostData.data) {
                  lostData.data.forEach((item: any) => {
                    const createdDate = new Date(item.created_at).toISOString().split('T')[0]
                    if (item.photo_url && createdDate === todayDateKST) {
                      const photoUrls = typeof item.photo_url === 'string' 
                        ? (item.photo_url.startsWith('[') ? JSON.parse(item.photo_url) : [item.photo_url])
                        : []
                      photoUrls.forEach((url: string) => {
                        const photoId = `lost-${item.id}-${url}`
                        if (!photoIdSet.has(photoId)) {
                          photoIdSet.add(photoId)
                          photos.push({
                            id: photoId,
                            title: '분실물 습득 보고',
                            photo_url: url,
                            store_name: store.store_name,
                            created_at: item.created_at,
                            status: item.status,
                            category: 'problem',
                            photo_type: 'lost_item',
                          })
                        }
                      })
                    }
                  })
                }
              }

              // 3. 제품 입고 및 발주서 사진
              const productPhotosResponse = await fetch(`/api/store-manager/stores/${store.store_id}/product-photos`)
              if (productPhotosResponse.ok) {
                const productData = await productPhotosResponse.json()
                console.log(`[Photo Data] Product photos for ${store.store_name}:`, productData.data)
                if (productData.data && Array.isArray(productData.data)) {
                  productData.data.forEach((photo: any) => {
                    const createdDate = new Date(photo.created_at).toISOString().split('T')[0]
                    if (createdDate === todayDateKST && photo.photo_url) {
                      // photo_type에 따라 제목 결정
                      // API에서 반환하는 photo_type: 'product', 'order_sheet', 'storage'
                      let title = '제품 사진'
                      let photoType: 'receipt' | 'order_sheet' | 'storage' = 'receipt'
                      
                      if (photo.type === 'receipt') {
                        // type='receipt'인 경우 photo_type으로 구분
                        if (photo.photo_type === 'product') {
                          title = '제품입고 사진'
                          photoType = 'receipt' // 필터링을 위해 'receipt'로 설정 (제품 입고 탭에 표시)
                        } else if (photo.photo_type === 'order_sheet') {
                          title = '발주서 사진'
                          photoType = 'order_sheet' // 필터링을 위해 'order_sheet'로 설정 (제품 입고 탭에 표시)
                        } else {
                          // photo_type이 없으면 기본값으로 제품입고 사진
                          title = '제품입고 사진'
                          photoType = 'receipt'
                        }
                      } else if (photo.type === 'storage') {
                        // type='storage'인 경우 보관 제품
                        title = '보관 제품'
                        photoType = 'storage'
                      }
                      
                      console.log('[Product Photo]', {
                        store: store.store_name,
                        type: photo.type,
                        photo_type: photo.photo_type,
                        photoType,
                        title,
                        created_at: photo.created_at,
                        photo_url: photo.photo_url,
                      })
                      
                      const photoId = `product-${photo.id}`
                      if (!photoIdSet.has(photoId)) {
                        photoIdSet.add(photoId)
                        photos.push({
                          id: photoId,
                          title: title,
                          photo_url: photo.photo_url,
                          store_name: store.store_name,
                          created_at: photo.created_at,
                          status: 'completed',
                          category: 'product', // 제품입고와 보관사진 모두 'product' 카테고리
                          photo_type: photoType,
                        })
                      }
                    }
                  })
                }
              }
            } catch (error) {
              console.error(`Error loading photos for store ${store.store_id}:`, error)
            }
          })
        )
      }

      // 최신순으로 정렬
      photos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setPhotoData(photos)
    } catch (error) {
      console.error('Error loading photo data:', error)
    } finally {
      setLoadingPhotoData(false)
    }
  }

  // 통계 계산
  const stats = useMemo(() => {
    // 금일 보고 건수: 당일 모든 사진 데이터 건수 (photoData에서 당일 기준으로 집계)
    const todayDateKST = getTodayDateKST()
    const todayPhotoCount = photoData.filter(photo => {
      const photoDate = new Date(photo.created_at).toISOString().split('T')[0]
      return photoDate === todayDateKST
    }).length
    
    // 물품 요청: 점주가 처리해야 할 물품 요청 건수 (점주 처리중 상태)
    const supplyRequestCount = storeStatuses.reduce((sum, s) => {
      return sum + (s.manager_in_progress_supply_request_count || 0)
    }, 0)
    
    // 체크리스트가 있는 매장만 계산에 포함 (checklist_total > 0인 매장만)
    const storesWithChecklist = storeStatuses.filter(s => (s.checklist_total || 0) > 0)
    const completedToday = storesWithChecklist.reduce((sum, s) => sum + (s.checklist_completed || 0), 0)
    const totalChecklistItems = storesWithChecklist.reduce((sum, s) => sum + (s.checklist_total || 0), 0)
    const completionRate = totalChecklistItems > 0 ? Math.round((completedToday / totalChecklistItems) * 100) : 0
    
    // 관리완료율 계산: clocked_out 상태인 매장 수 (관리 완료만 카운트)
    const completedCount = storeStatuses.filter(s => s.attendance_status === 'clocked_out').length
    const totalStores = storeStatuses.length
    const completionRateForStores = totalStores > 0 ? Math.round((completedCount / totalStores) * 100) : 0

    return {
      todayPhotoCount,
      supplyRequestCount,
      completedToday,
      completionRate,
      completionRateForStores,
      completedCount,
      totalStores,
    }
  }, [storeStatuses, photoData])

  // 확인 안된 처리완료 건수 계산
  const unconfirmedCompletedCount = useMemo(() => {
    const totalCompleted = storeStatuses.reduce((sum, s) => sum + s.completed_request_count, 0)
    // localStorage에서 확인된 completed 요청 ID 수집
    const today = new Date().toISOString().split('T')[0]
    const confirmedIds = new Set<string>()
    storeStatuses.forEach(store => {
      const storageKey = `confirmed_requests_${store.store_id}_${today}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const ids = JSON.parse(stored)
          ids.forEach((id: string) => confirmedIds.add(id))
        } catch (e) {
          console.error('Error parsing confirmed requests:', e)
        }
      }
    })
    // requestStatusModalData에서 completed 요청 중 확인된 것만 카운트
    const confirmedCompletedCount = requestStatusModalData.completed.filter(r => 
      confirmedIds.has(r.id) || confirmedRequestIds.has(r.id)
    ).length
    // 모달 데이터가 없으면 localStorage만 사용
    if (requestStatusModalData.completed.length === 0) {
      // 모달이 열리지 않았을 때는 전체 건수에서 확인된 건수를 빼는 것이 불가능
      // 일단 전체 건수를 표시 (모달을 열면 정확한 카운트가 표시됨)
      return totalCompleted
    }
    return Math.max(0, totalCompleted - confirmedCompletedCount)
  }, [storeStatuses, requestStatusModalData.completed, confirmedRequestIds])

  // 확인 안된 반려처리 건수 계산
  const unconfirmedRejectedCount = useMemo(() => {
    const totalRejected = storeStatuses.reduce((sum, s) => sum + (s.rejected_request_count || 0), 0)
    // localStorage에서 확인된 rejected 요청 ID 수집
    const today = new Date().toISOString().split('T')[0]
    const confirmedIds = new Set<string>()
    storeStatuses.forEach(store => {
      const storageKey = `confirmed_requests_${store.store_id}_${today}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const ids = JSON.parse(stored)
          ids.forEach((id: string) => confirmedIds.add(id))
        } catch (e) {
          console.error('Error parsing confirmed requests:', e)
        }
      }
    })
    // requestStatusModalData에서 rejected 요청 중 확인된 것만 카운트
    const confirmedRejectedCount = requestStatusModalData.rejected.filter(r => 
      confirmedIds.has(r.id) || confirmedRequestIds.has(r.id)
    ).length
    // 모달 데이터가 없으면 localStorage만 사용
    if (requestStatusModalData.rejected.length === 0) {
      // 모달이 열리지 않았을 때는 전체 건수에서 확인된 건수를 빼는 것이 불가능
      // 일단 전체 건수를 표시 (모달을 열면 정확한 카운트가 표시됨)
      return totalRejected
    }
    return Math.max(0, totalRejected - confirmedRejectedCount)
  }, [storeStatuses, requestStatusModalData.rejected, confirmedRequestIds])

  // 긴급 대응 필요 알림
  const urgentAlerts = useMemo(() => {
    const alerts: Array<{ store: string; message: string; count: number }> = []
    storeStatuses.forEach((store) => {
      if (store.vending_problem_count > 0) {
        alerts.push({
          store: store.store_name,
          message: '자판기 고장 보고',
          count: store.vending_problem_count,
        })
      }
    })
    return alerts
  }, [storeStatuses])

  const formatTime = (timeString: string | null) => {
    if (!timeString) return ''
    const date = new Date(timeString)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? '오후' : '오전'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`
  }

  const formatTimeAgo = (timeString: string) => {
    const now = new Date()
    const time = new Date(timeString)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `오늘 ${diffHours > 0 ? `${diffHours}시간 전` : ''}`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return '어제'
    return `${diffDays}일 전`
  }

  const getPhotoUrls = (photoUrl: string | null): string[] => {
    if (!photoUrl) return []
    try {
      const parsed = JSON.parse(photoUrl)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return [photoUrl]
    }
  }

  const getRequestStatusLabel = (status: string): string => {
    switch (status) {
      case 'received':
        return '접수'
      case 'in_progress':
        return '처리중'
      case 'completed':
        return '처리완료'
      case 'rejected':
        return '반려처리'
      default:
        return status
    }
  }

  const getRequestStatusColor = (status: string): string => {
    switch (status) {
      case 'received':
        return 'bg-gray-100 text-gray-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 날짜 선택 핸들러
  const handleDateSelect = async (date: string) => {
    // 해당 날짜에 출근 기록이 있는지 확인
    const dateAttendance = attendanceData.find((a) => a.date === date)
    if (!dateAttendance || dateAttendance.attendance_count === 0) {
      // 출근 기록이 없으면 모달을 열지 않음
      return
    }

    setSelectedDate(date)
    setShowDailyDetailsModal(true)
    setLoadingDailyDetails(true)

    try {
      const response = await fetch(`/api/store-manager/daily-details?date=${date}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setDailyDetailsData(data.data)
      } else {
        console.error('Failed to load daily details:', data.error)
        setDailyDetailsData({
          cleaning_photos: [],
          issues: [],
          product_photos: [],
        })
      }
    } catch (error) {
      console.error('Error loading daily details:', error)
      setDailyDetailsData({
        cleaning_photos: [],
        issues: [],
        product_photos: [],
      })
    } finally {
      setLoadingDailyDetails(false)
    }
  }

  const handleRequestStatusClick = async (status: 'received' | 'in_progress' | 'completed' | 'rejected') => {
    // 점주가 가진 모든 매장의 요청란을 모달로 보여줌
    if (storeStatuses.length === 0) {
      alert('매장 정보를 불러올 수 없습니다.')
      return
    }

    setSelectedRequestStatus(status)
    setShowRequestStatusModal(true)
    setLoadingRequestStatusModal(true)
    setRequestStatusModalData({ received: [], in_progress: [], completed: [], rejected: [] })

    try {
      // 모든 매장의 요청을 가져와서 합치기 - 병렬 처리로 최적화
      const allReceivedRequests: any[] = []
      const allInProgressRequests: any[] = []
      const allCompletedRequests: any[] = []
      const allRejectedRequests: any[] = []

      // Promise.all로 모든 매장의 요청을 병렬로 조회
      const timestamp = new Date().getTime()
      const requestPromises = storeStatuses.map(async (store) => {
        try {
          const response = await fetch(`/api/store-manager/stores/${store.store_id}/requests?t=${timestamp}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            
            if (data.success && data.data) {
              const requestsData = data.data
              
              // 매장 정보를 각 요청에 추가
              return {
                received: (requestsData.received || []).map((req: any) => ({
                  ...req,
                  store_name: store.store_name,
                  store_id: store.store_id,
                })),
                inProgress: (requestsData.in_progress || []).map((req: any) => ({
                  ...req,
                  store_name: store.store_name,
                  store_id: store.store_id,
                })),
                completed: (requestsData.completed || []).map((req: any) => ({
                  ...req,
                  store_name: store.store_name,
                  store_id: store.store_id,
                })),
                rejected: (requestsData.rejected || []).map((req: any) => ({
                  ...req,
                  store_name: store.store_name,
                  store_id: store.store_id,
                })),
              }
            }
          } else {
            const errorText = await response.text()
            console.error(`Error fetching requests for store ${store.store_id}:`, {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            })
          }
          return null
        } catch (error: any) {
          console.error(`Error fetching requests for store ${store.store_id}:`, {
            message: error?.message,
            stack: error?.stack
          })
          // 개별 매장 오류는 null 반환하여 무시
          return null
        }
      })

      // 모든 요청을 병렬로 처리
      const results = await Promise.all(requestPromises)
      
      // 결과를 합치기
      results.forEach((result) => {
        if (result) {
          allReceivedRequests.push(...result.received)
          allInProgressRequests.push(...result.inProgress)
          allCompletedRequests.push(...result.completed)
          allRejectedRequests.push(...result.rejected)
        }
      })

      // 모든 매장의 요청을 합쳐서 설정
      setRequestStatusModalData({
        received: allReceivedRequests,
        in_progress: allInProgressRequests,
        completed: allCompletedRequests,
        rejected: allRejectedRequests,
      })
      
      console.log('All requests loaded:', {
        received: allReceivedRequests.length,
        in_progress: allInProgressRequests.length,
        completed: allCompletedRequests.length,
        rejected: allRejectedRequests.length,
      })
    } catch (error) {
      console.error('Error loading request status data:', error)
      alert('요청란을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoadingRequestStatusModal(false)
    }
  }

  const handleEditRequest = (request: any) => {
    if (request.status !== 'received') {
      alert('접수 상태인 요청란만 수정할 수 있습니다.')
      return
    }
    setEditingRequestId(request.id)
    setEditingRequest({ ...request })
  }

  const handleCancelEditRequest = () => {
    setEditingRequestId(null)
    setEditingRequest(null)
  }

  const handleSaveRequest = async () => {
    if (!editingRequestId || !editingRequest) {
      return
    }

    if (!editingRequest.title?.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    try {
      setSavingRequest(true)
      const originalRequest = requestStatusModalData.received.find((r: any) => r.id === editingRequestId)
      if (!originalRequest) {
        alert('요청란을 찾을 수 없습니다.')
        return
      }

      const response = await fetch(`/api/store-manager/requests/${editingRequestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingRequest.title,
          description: editingRequest.description || null,
          photo_url: editingRequest.photo_url || null,
          original_updated_at: originalRequest.updated_at,
        }),
      })

      if (response.ok) {
        alert('요청란이 수정되었습니다.')
        setEditingRequestId(null)
        setEditingRequest(null)
        // 요청란 목록 다시 로드
        if (selectedRequestStatus === 'received' || !selectedRequestStatus) {
          handleRequestStatusClick('received')
        } else {
          handleRequestStatusClick(selectedRequestStatus)
        }
      } else {
        const data = await response.json()
        if (response.status === 409 && data.conflict) {
          alert(data.error || '다른 사용자가 요청란을 수정했습니다.')
          if (data.latestData) {
            // 최신 데이터로 업데이트
            setRequestStatusModalData(prev => ({
              ...prev,
              received: prev.received.map((r: any) => 
                r.id === editingRequestId ? data.latestData : r
              )
            }))
          }
          setEditingRequestId(null)
          setEditingRequest(null)
          // 요청란 목록 다시 로드
          if (selectedRequestStatus === 'received' || !selectedRequestStatus) {
            handleRequestStatusClick('received')
          } else {
            handleRequestStatusClick(selectedRequestStatus)
          }
        } else {
          alert(data.error || '수정에 실패했습니다.')
        }
      }
    } catch (error: any) {
      console.error('Error updating request:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setSavingRequest(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('정말로 이 요청란을 접수 취소하시겠습니까?')) {
      return
    }

    try {
      setCancellingRequestId(requestId)
      const response = await fetch(`/api/store-manager/requests/${requestId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('요청란이 접수 취소되었습니다.')
        setCancellingRequestId(null)
        // 요청란 목록 다시 로드
        if (selectedRequestStatus === 'received' || !selectedRequestStatus) {
          handleRequestStatusClick('received')
        } else {
          handleRequestStatusClick(selectedRequestStatus)
        }
      } else {
        const data = await response.json()
        if (response.status === 409 && data.conflict) {
          alert(data.error || '요청란 상태가 변경되어 접수 취소할 수 없습니다.')
          // 요청란 목록 다시 로드
          if (selectedRequestStatus === 'received' || !selectedRequestStatus) {
            handleRequestStatusClick('received')
          } else {
            handleRequestStatusClick(selectedRequestStatus)
          }
        } else {
          alert(data.error || '접수 취소에 실패했습니다.')
        }
      }
    } catch (error: any) {
      console.error('Error cancelling request:', error)
      alert('접수 취소 중 오류가 발생했습니다.')
    } finally {
      setCancellingRequestId(null)
    }
  }

  const handleCompleteRequest = async () => {
    if (!completingRequestId) {
      return
    }

    try {
      setCompleting(true)
      const response = await fetch(`/api/store-manager/requests/${completingRequestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completion_photo_url: completionPhoto.trim() || null,
          completion_description: completionDescription.trim() || null,
        }),
      })

      if (response.ok) {
        alert('요청란이 처리 완료되었습니다.')
        setCompletingRequestId(null)
        setCompletionPhoto('')
        setCompletionDescription('')
        // 요청란 목록 다시 로드
        if (selectedRequestStatus === 'in_progress' || !selectedRequestStatus) {
          handleRequestStatusClick('in_progress')
        } else {
          handleRequestStatusClick(selectedRequestStatus)
        }
      } else {
        const data = await response.json()
        alert(data.error || '처리 완료에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Error completing request:', error)
      alert('처리 완료 중 오류가 발생했습니다.')
    } finally {
      setCompleting(false)
    }
  }

  const handleConfirmRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/business/requests/${requestId}/confirm`, {
        method: 'PATCH',
      })
      if (response.ok) {
        const today = new Date().toISOString().split('T')[0]
        const newConfirmedIds = new Set(confirmedRequestIds)
        newConfirmedIds.add(requestId)
        setConfirmedRequestIds(newConfirmedIds)
        
        // localStorage에 저장 (매장별로 저장)
        const request = requestStatusModalData.rejected.find(r => r.id === requestId) ||
                      requestStatusModalData.completed.find(r => r.id === requestId)
        if (request && request.store_id) {
          const storageKey = `confirmed_requests_${request.store_id}_${today}`
          const existingIds = new Set<string>()
          const stored = localStorage.getItem(storageKey)
          if (stored) {
            try {
              const ids = JSON.parse(stored)
              ids.forEach((id: string) => existingIds.add(id))
            } catch (e) {
              console.error('Error loading confirmed requests:', e)
            }
          }
          existingIds.add(requestId)
          localStorage.setItem(storageKey, JSON.stringify(Array.from(existingIds)))
        }

        // 매장 상태 새로고침 (카운트 업데이트를 위해)
        await loadStoreStatuses(true) // forceRefresh = true
        
        // 데이터 새로고침
        await handleRequestStatusClick(selectedRequestStatus || 'rejected')
      } else {
        alert('확인 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error confirming request:', error)
      alert('확인 처리 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-6 py-2 md:py-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-2">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">
            매장 선택 <span className="text-sm md:text-lg font-normal text-gray-600">(상세보기)</span>
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            {storeStatuses.length > 0 && (
              <>
                {storeStatuses.length > 1 ? (
                  <select
                    value={selectedStoreId || ''}
                    onChange={(e) => setSelectedStoreId(e.target.value || null)}
                    className="px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                  >
                    <option value="">전체 매장</option>
                    {storeStatuses.map((store) => (
                      <option key={store.store_id} value={store.store_id}>
                        {store.store_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm md:text-base font-medium text-gray-900">{storeStatuses[0]?.store_name}</span>
                )}
                <Link
                  href={selectedStoreId ? `/store-manager/stores/${selectedStoreId}/detail` : (storeStatuses.length === 1 ? `/store-manager/stores/${storeStatuses[0]?.store_id}/detail` : '#')}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm md:text-base text-center ${
                    !selectedStoreId && storeStatuses.length > 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={(e) => {
                    if (!selectedStoreId && storeStatuses.length > 1) {
                      e.preventDefault()
                      alert('매장을 선택해주세요.')
                    }
                  }}
                >
                  상세보기
                </Link>
              </>
            )}
            <div className="text-left md:text-right">
              <div className="text-xs md:text-sm text-gray-600">{now}</div>
              <div className="text-xs md:text-sm font-medium text-gray-900">{storeStatuses.length}개 매장</div>
            </div>
          </div>
        </div>

      </div>

      {/* 관리현황 */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold mb-3">관리현황</h2>
        {loadingAttendance ? (
          <div className="bg-white rounded-lg shadow-md p-4 min-h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <AttendanceCalendar
            attendanceData={attendanceData}
            storeStatuses={storeStatuses.map(s => ({ store_id: s.store_id, store_name: s.store_name }))}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate || undefined}
          />
        )}
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 border-l-4 border-blue-500">
          <div className="text-xs md:text-sm text-gray-600 mb-1">금일 보고 건수</div>
          <div className="text-xl md:text-3xl font-bold text-gray-900">{stats.todayPhotoCount}건</div>
          <div className="text-xs md:text-sm text-blue-600 mt-1 md:mt-2">사진 보고 완료</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 border-l-4 border-orange-500">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start">
            <div className="flex-1">
              <div className="text-xs md:text-sm text-gray-600 mb-1">물품 요청</div>
              <div className="text-xl md:text-3xl font-bold text-gray-900">{stats.supplyRequestCount}건</div>
              <div className="text-xs md:text-sm text-orange-600 mt-1 md:mt-2">
                점주 처리 대기 중
              </div>
            </div>
            {stats.supplyRequestCount > 0 && (
              <Link
                href="/store-manager/supplies"
                className="mt-2 md:mt-0 px-2 md:px-3 py-1 md:py-1.5 bg-orange-500 text-white rounded-md text-xs font-medium hover:bg-orange-600 inline-block text-center"
              >
                확인
              </Link>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 border-l-4 border-green-500">
          <div className="text-xs md:text-sm text-gray-600 mb-1">금일 완료</div>
          <div className="flex items-baseline gap-1 md:gap-2">
            <div className="text-xl md:text-3xl font-bold text-gray-900">{stats.completionRate}%</div>
            <div className="text-sm md:text-lg text-gray-600">({stats.completedToday}건)</div>
          </div>
          <div className="text-xs md:text-sm text-green-600 mt-1 md:mt-2">체크리스트 완료</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 border-l-4 border-purple-500">
          <div className="text-xs md:text-sm text-gray-600 mb-1">관리완료율</div>
          <div className="text-xl md:text-3xl font-bold text-gray-900">{stats.completionRateForStores}%</div>
          <div className="text-xs md:text-sm text-purple-600 mt-1 md:mt-2">
            {stats.completedCount}/{stats.totalStores} 관리 완료
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-4 md:mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-4 md:space-x-8 min-w-max">
          {[
            { id: 'overview', label: '전체 현황' },
            { id: 'photos', label: '사진 보고' },
            { id: 'checklist', label: '체크리스트' },
            { id: 'attendance', label: '출근 현황' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 md:py-4 px-2 md:px-1 border-b-2 font-medium text-sm md:text-base whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 요청란 상태 */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
              <h2 className="text-lg md:text-xl font-semibold">요청란 상태</h2>
              <button
                onClick={() => {
                  setShowStoreSelector(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors w-full md:w-auto"
              >
                요청란 접수하기
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <div className="bg-blue-50 rounded-lg p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600 mb-2">
                  {storeStatuses.reduce((sum, s) => sum + s.received_request_count, 0)}건
                </div>
                <button 
                  onClick={() => handleRequestStatusClick('received')}
                  className="w-full px-3 md:px-4 py-2 bg-blue-600 text-white rounded-md text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors touch-manipulation"
                >
                  접수
                </button>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-yellow-600 mb-2">
                  {storeStatuses.reduce((sum, s) => sum + s.in_progress_request_count, 0)}건
                </div>
                <button 
                  onClick={() => handleRequestStatusClick('in_progress')}
                  className="w-full px-3 md:px-4 py-2 bg-yellow-600 text-white rounded-md text-xs md:text-sm font-medium hover:bg-yellow-700 transition-colors touch-manipulation"
                >
                  처리중
                </button>
              </div>
              <div className="bg-green-50 rounded-lg p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600 mb-2">
                  {unconfirmedCompletedCount}건
                </div>
                <button
                  onClick={() => handleRequestStatusClick('completed')}
                  className="w-full px-3 md:px-4 py-2 bg-green-600 text-white rounded-md text-xs md:text-sm font-medium hover:bg-green-700 transition-colors touch-manipulation"
                >
                  처리완료
                </button>
              </div>
              <div className="bg-red-50 rounded-lg p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-red-600 mb-2">
                  {unconfirmedRejectedCount}건
                </div>
                <button
                  onClick={() => handleRequestStatusClick('rejected')}
                  className="w-full px-3 md:px-4 py-2 bg-red-600 text-white rounded-md text-xs md:text-sm font-medium hover:bg-red-700 transition-colors touch-manipulation"
                >
                  반려처리
                </button>
              </div>
            </div>
          </div>

          {/* 매장 상태 확인 */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-semibold">매장 상태 확인</h2>
              <span className="text-xs md:text-sm text-gray-500">오늘 기준</span>
            </div>
            
            {/* 사진 카테고리 탭 */}
            <div className="mb-4 border-b border-gray-200 overflow-x-auto">
              <nav className="flex space-x-3 md:space-x-4 min-w-max">
                {[
                  { id: 'before_after', label: '관리 전후' },
                  { id: 'problem', label: '매장 문제' },
                  { id: 'product', label: '제품 입고' },
                  { id: 'storage', label: '보관 제품' },
                ].map((tab) => {
                  const categoryPhotos = photoData.filter(p => {
                    const photoDate = new Date(p.created_at).toISOString().split('T')[0]
                    const todayDateKST = getTodayDateKST()
                    if (tab.id === 'storage') {
                      // 보관 제품: category='product'이고 photo_type='storage'인 것
                      return p.category === 'product' && p.photo_type === 'storage' && photoDate === todayDateKST
                    } else if (tab.id === 'product') {
                      // 제품 입고: category='product'이고 photo_type='receipt' 또는 'order_sheet'인 것
                      return p.category === 'product' && (p.photo_type === 'receipt' || p.photo_type === 'order_sheet') && photoDate === todayDateKST
                    }
                    return p.category === tab.id && photoDate === todayDateKST
                  })
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPhotoCategoryTab(tab.id as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        photoCategoryTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label} ({categoryPhotos.length})
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* 사진 그리드 - 매장별로 그룹화 */}
            {(() => {
              // 로딩 중일 때
              if (loadingPhotoData) {
                return (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-gray-500">데이터를 불러오고 있습니다...</p>
                  </div>
                )
              }

              const todayDateKST = getTodayDateKST()
              const filteredPhotos = photoData.filter(p => {
                const photoDate = new Date(p.created_at).toISOString().split('T')[0]
                if (photoCategoryTab === 'storage') {
                  // 보관 제품: category='product'이고 photo_type='storage'인 것
                  return p.category === 'product' && p.photo_type === 'storage' && photoDate === todayDateKST
                } else if (photoCategoryTab === 'product') {
                  // 제품 입고: category='product'이고 photo_type='receipt' 또는 'order_sheet'인 것
                  return p.category === 'product' && (p.photo_type === 'receipt' || p.photo_type === 'order_sheet') && photoDate === todayDateKST
                }
                return p.category === photoCategoryTab && photoDate === todayDateKST
              })

              if (filteredPhotos.length === 0) {
                return <p className="text-gray-500 text-center py-8">표시할 사진이 없습니다.</p>
              }

              // 매장별로 그룹화
              const photosByStore = filteredPhotos.reduce((acc, photo) => {
                if (!acc[photo.store_name]) {
                  acc[photo.store_name] = []
                }
                acc[photo.store_name].push(photo)
                return acc
              }, {} as Record<string, PhotoData[]>)

              // 모든 사진을 하나의 배열로 만들기 (모달 네비게이션용)
              const allPhotos = filteredPhotos

              const toggleStore = (storeName: string) => {
                setExpandedStores(prev => {
                  const newSet = new Set(prev)
                  if (newSet.has(storeName)) {
                    newSet.delete(storeName)
                  } else {
                    newSet.add(storeName)
                  }
                  return newSet
                })
              }

              const handlePhotoClick = (photo: PhotoData) => {
                const index = allPhotos.findIndex(p => p.id === photo.id)
                setCurrentPhotoIndex(index >= 0 ? index : 0)
                setCurrentPhotoList(allPhotos)
                setSelectedPhoto(photo)
              }

              return (
                <div className="space-y-4">
                  {Object.entries(photosByStore).map(([storeName, photos]) => {
                    const isExpanded = expandedStores.has(storeName)
                    return (
                      <div key={storeName} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleStore(storeName)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <h3 className="text-lg font-semibold text-gray-900">{storeName}</h3>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/store-manager/stores/${storeStatuses.find(s => s.store_name === storeName)?.store_id}/detail`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                            >
                              상세보기
                            </Link>
                            <span className="text-sm text-gray-500">({photos.length}장)</span>
                            <svg
                              className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-3 md:p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                              {photos.map((photo) => (
                                <div
                                  key={photo.id}
                                  className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow touch-manipulation"
                                  onClick={() => handlePhotoClick(photo)}
                                >
                                  <div className="aspect-video bg-gray-200 relative">
                                    <img
                                      src={photo.photo_url}
                                      alt={photo.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none'
                                      }}
                                    />
                                  </div>
                                  <div className="p-2 md:p-3">
                                    <div className="text-xs md:text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                                      {photo.title}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatTimeAgo(photo.created_at)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* 매장 체크리스트 진행률 */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">매장 체크리스트 진행률</h2>
            <div className="space-y-4">
              {storeStatuses
                .filter((store) => store.is_work_day) // 당일 출근해야 하는 매장만 표시
                .map((store) => (
                  <div key={store.store_id}>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">{store.store_name}</span>
                      <span className="text-xs md:text-sm text-gray-600">
                        {store.checklist_completed}/{store.checklist_total} 완료 · {store.checklist_completion_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${store.checklist_completion_rate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              {storeStatuses.filter((store) => store.is_work_day).length === 0 && (
                <p className="text-gray-500 text-center py-4 text-sm">당일 출근해야 하는 매장이 없습니다.</p>
              )}
            </div>
          </div>

          {/* 출근 상태 */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">출근 상태</h2>
            <div className="space-y-3">
              {[...storeStatuses]
                .sort((a, b) => {
                  // 관리 상태 우선순위: 관리완료(3) > 관리중(2) > 관리전(1) > 관리일 아님(0)
                  const getStatusPriority = (store: StoreStatus) => {
                    if (!store.is_work_day) return 0
                    if (store.attendance_status === 'clocked_out') return 3
                    if (store.attendance_status === 'clocked_in') return 2
                    return 1
                  }
                  
                  const priorityA = getStatusPriority(a)
                  const priorityB = getStatusPriority(b)
                  
                  // 우선순위가 높은 것부터 (내림차순)
                  return priorityB - priorityA
                })
                .map((store) => {
                  // 관리 상태 결정
                  const getManagementStatus = () => {
                    // 휴무일인 경우
                    if (!store.is_work_day) {
                      return {
                        label: '관리일 아님',
                        dotColor: 'bg-gray-400',
                        badgeColor: 'bg-gray-100 text-gray-800',
                      }
                    }
                    
                    // 출근 상태에 따라 결정
                    if (store.attendance_status === 'clocked_out') {
                      return {
                        label: '관리완료',
                        dotColor: 'bg-green-500',
                        badgeColor: 'bg-green-100 text-green-800',
                      }
                    } else if (store.attendance_status === 'clocked_in') {
                      return {
                        label: '관리중',
                        dotColor: 'bg-orange-500',
                        badgeColor: 'bg-orange-100 text-orange-800',
                      }
                    } else {
                      return {
                        label: '관리전',
                        dotColor: 'bg-yellow-500',
                        badgeColor: 'bg-yellow-100 text-yellow-800',
                      }
                    }
                  }

                  const status = getManagementStatus()

                  return (
                    <div key={store.store_id} className="flex flex-col md:flex-row md:items-center md:justify-between p-3 bg-gray-50 rounded-lg gap-2 md:gap-0">
                      <div className="flex items-center gap-2 md:gap-3 flex-1">
                        <div className={`w-3 h-3 ${status.dotColor} rounded-full flex-shrink-0`}></div>
                        <span className="text-sm font-medium text-gray-900">{store.store_name}</span>
                        <Link
                          href={`/store-manager/stores/${store.store_id}/detail`}
                          className="text-xs text-blue-600 hover:text-blue-800 ml-auto md:ml-0"
                        >
                          상세보기 →
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        {store.clock_in_time && (
                          <span className="text-sm text-gray-600">{formatTime(store.clock_in_time)}</span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.badgeColor}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="space-y-6">
          {/* 매장 상태 확인 (사진 카테고리별 표시) */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">사진 보고</h2>
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-semibold">매장별 사진 확인</h3>
              <span className="text-xs md:text-sm text-gray-500">전체 사진</span>
            </div>
            
            {/* 사진 카테고리 탭 */}
            <div className="mb-4 border-b border-gray-200 overflow-x-auto">
              <nav className="flex space-x-3 md:space-x-4 min-w-max">
                {[
                  { id: 'before_after', label: '관리 전후' },
                  { id: 'problem', label: '매장 문제' },
                  { id: 'product', label: '제품 입고' },
                  { id: 'storage', label: '보관 제품' },
                ].map((tab) => {
                  // 사진 보고 탭에서는 날짜 필터링 없이 카운트
                  const categoryPhotos = photoData.filter(p => {
                    if (tab.id === 'storage') {
                      return p.category === 'product' && p.photo_type === 'storage'
                    } else if (tab.id === 'product') {
                      return p.category === 'product' && (p.photo_type === 'receipt' || p.photo_type === 'order_sheet')
                    }
                    return p.category === tab.id
                  })
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPhotoCategoryTab(tab.id as any)}
                      className={`py-2 px-2 md:px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap ${
                        photoCategoryTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label} ({categoryPhotos.length})
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* 사진 그리드 - 매장별로 그룹화 */}
            {(() => {
              if (loadingPhotoData) {
                return (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-gray-500">데이터를 불러오고 있습니다...</p>
                  </div>
                )
              }

              // 사진 보고 탭에서는 날짜 필터링을 하지 않고 모든 사진을 표시 (오늘 기준이 아닌 전체)
              const filteredPhotos = photoData.filter(p => {
                if (photoCategoryTab === 'storage') {
                  return p.category === 'product' && p.photo_type === 'storage'
                } else if (photoCategoryTab === 'product') {
                  return p.category === 'product' && (p.photo_type === 'receipt' || p.photo_type === 'order_sheet')
                }
                return p.category === photoCategoryTab
              })

              if (filteredPhotos.length === 0) {
                return <p className="text-gray-500 text-center py-8">표시할 사진이 없습니다.</p>
              }

              const photosByStore = filteredPhotos.reduce((acc, photo) => {
                if (!acc[photo.store_name]) {
                  acc[photo.store_name] = []
                }
                acc[photo.store_name].push(photo)
                return acc
              }, {} as Record<string, PhotoData[]>)

              const allPhotos = filteredPhotos

              const toggleStore = (storeName: string) => {
                setExpandedStores(prev => {
                  const newSet = new Set(prev)
                  if (newSet.has(storeName)) {
                    newSet.delete(storeName)
                  } else {
                    newSet.add(storeName)
                  }
                  return newSet
                })
              }

              const handlePhotoClick = (photo: PhotoData) => {
                const index = allPhotos.findIndex(p => p.id === photo.id)
                setCurrentPhotoIndex(index >= 0 ? index : 0)
                setCurrentPhotoList(allPhotos)
                setSelectedPhoto(photo)
              }

              return (
                <div className="space-y-4">
                  {Object.entries(photosByStore).map(([storeName, photos]) => {
                    const isExpanded = expandedStores.has(storeName)
                    return (
                      <div key={storeName} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleStore(storeName)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <h4 className="text-base md:text-lg font-semibold text-gray-900">{storeName}</h4>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/store-manager/stores/${storeStatuses.find(s => s.store_name === storeName)?.store_id}/detail`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1 bg-blue-600 text-white text-xs md:text-sm rounded-md hover:bg-blue-700 transition-colors"
                            >
                              상세보기
                            </Link>
                            <span className="text-xs md:text-sm text-gray-500">({photos.length}장)</span>
                            <svg
                              className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-3 md:p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                              {photos.map((photo) => (
                                <div
                                  key={photo.id}
                                  className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow touch-manipulation"
                                  onClick={() => handlePhotoClick(photo)}
                                >
                                  <div className="aspect-video bg-gray-200 relative">
                                    <img
                                      src={photo.photo_url}
                                      alt={photo.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none'
                                      }}
                                    />
                                  </div>
                                  <div className="p-2 md:p-3">
                                    <div className="text-xs md:text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                                      {photo.title}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatTimeAgo(photo.created_at)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">체크리스트</h2>
          <div className="space-y-4">
            {storeStatuses.map((store) => (
              <div key={store.store_id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{store.store_name}</span>
                    <Link
                      href={`/store-manager/stores/${store.store_id}/detail`}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      상세보기 →
                    </Link>
                  </div>
                  <span className="text-sm text-gray-600">
                    {store.checklist_completed}/{store.checklist_total} 완료 ({store.checklist_completion_rate}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${store.checklist_completion_rate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">출근 현황</h2>
          <div className="space-y-3">
            {[...storeStatuses]
              .sort((a, b) => {
                // 관리 상태 우선순위: 관리완료(3) > 관리중(2) > 관리전(1) > 관리일 아님(0)
                const getStatusPriority = (store: StoreStatus) => {
                  if (!store.is_work_day) return 0
                  if (store.attendance_status === 'clocked_out') return 3
                  if (store.attendance_status === 'clocked_in') return 2
                  return 1
                }
                
                const priorityA = getStatusPriority(a)
                const priorityB = getStatusPriority(b)
                
                // 우선순위가 높은 것부터 (내림차순)
                return priorityB - priorityA
              })
              .map((store) => {
                // 관리 상태 결정
                const getManagementStatus = () => {
                  // 휴무일인 경우
                  if (!store.is_work_day) {
                    return {
                      label: '관리일 아님',
                      dotColor: 'bg-gray-400',
                      badgeColor: 'bg-gray-100 text-gray-800',
                    }
                  }
                  
                  // 출근 상태에 따라 결정
                  if (store.attendance_status === 'clocked_out') {
                    return {
                      label: '관리완료',
                      dotColor: 'bg-green-500',
                      badgeColor: 'bg-green-100 text-green-800',
                    }
                  } else if (store.attendance_status === 'clocked_in') {
                    return {
                      label: '관리중',
                      dotColor: 'bg-orange-500',
                      badgeColor: 'bg-orange-100 text-orange-800',
                    }
                  } else {
                    return {
                      label: '관리전',
                      dotColor: 'bg-yellow-500',
                      badgeColor: 'bg-yellow-100 text-yellow-800',
                    }
                  }
                }

                const status = getManagementStatus()

                return (
                  <div key={store.store_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 ${status.dotColor} rounded-full`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{store.store_name}</span>
                          <Link
                            href={`/store-manager/stores/${store.store_id}/detail`}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            상세보기 →
                          </Link>
                        </div>
                        {store.clock_in_time && (
                          <div className="text-sm text-gray-600">{formatTime(store.clock_in_time)}</div>
                        )}
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${status.badgeColor}`}>
                      {status.label}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* 사진 확대 모달 */}
      {selectedPhoto && currentPhotoList.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            {/* 닫기 버튼 */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 이전 버튼 */}
            {currentPhotoIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const prevIndex = currentPhotoIndex - 1
                  setCurrentPhotoIndex(prevIndex)
                  setSelectedPhoto(currentPhotoList[prevIndex])
                }}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 rounded-full p-2 md:p-2 hover:bg-opacity-100 transition-colors touch-manipulation"
              >
                <svg className="w-6 h-6 md:w-6 md:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* 다음 버튼 */}
            {currentPhotoIndex < currentPhotoList.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const nextIndex = currentPhotoIndex + 1
                  setCurrentPhotoIndex(nextIndex)
                  setSelectedPhoto(currentPhotoList[nextIndex])
                }}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 rounded-full p-2 md:p-2 hover:bg-opacity-100 transition-colors touch-manipulation"
              >
                <svg className="w-6 h-6 md:w-6 md:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <div className="bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.title}
                className="w-full h-auto max-h-[80vh] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedPhoto.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentPhotoIndex + 1} / {currentPhotoList.length}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{selectedPhoto.store_name}</span>
                  <span>{formatTimeAgo(selectedPhoto.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 매장 선택 모달 */}
      {showStoreSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-2xl font-semibold">매장 선택</h2>
                <button
                  onClick={() => setShowStoreSelector(false)}
                  className="text-gray-500 hover:text-gray-700 touch-manipulation p-2 -mr-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                {storeStatuses.map((store) => (
                  <button
                    key={store.store_id}
                    onClick={() => {
                      setSelectedStoreId(store.store_id)
                      setShowStoreSelector(false)
                      setShowRequestForm(true)
                    }}
                    className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors touch-manipulation"
                  >
                    <div className="font-medium text-gray-900 text-sm md:text-base">{store.store_name}</div>
                    {store.store_address && (
                      <div className="text-xs md:text-sm text-gray-500 mt-1">{store.store_address}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 요청란 접수 폼 모달 */}
      {showRequestForm && selectedStoreId && (
        <RequestForm
          storeId={selectedStoreId}
          onSuccess={() => {
            setShowRequestForm(false)
            setSelectedStoreId(null)
            loadStoreStatuses(true) // 상태 새로고침, forceRefresh = true
          }}
          onCancel={() => {
            setShowRequestForm(false)
            setSelectedStoreId(null)
          }}
        />
      )}

      {/* 요청란 상황 모달 */}
      {showRequestStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4" onClick={() => setShowRequestStatusModal(false)}>
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-semibold">
                요청란 상황
              </h2>
              <button onClick={() => setShowRequestStatusModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl touch-manipulation p-2 -mr-2">
                ×
              </button>
            </div>

            <div className="space-y-6">
              {loadingRequestStatusModal ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">요청란을 불러오는 중...</span>
                </div>
              ) : (
                <>
                  {/* 접수 - 선택된 상태가 접수이거나 선택되지 않았을 때만 표시 */}
                  {(!selectedRequestStatus || selectedRequestStatus === 'received') && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">접수</h3>
                      {requestStatusModalData.received.length === 0 ? (
                        <p className="text-gray-500">접수된 요청이 없습니다.</p>
                      ) : (
                        <div className="space-y-4">
                          {requestStatusModalData.received.map((request) => {
                            const photos = getPhotoUrls(request.photo_url)
                            const isEditing = editingRequestId === request.id
                            return (
                              <div key={request.id} className="border rounded-lg p-4">
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                                      <input
                                        type="text"
                                        value={editingRequest?.title || ''}
                                        onChange={(e) => setEditingRequest({ ...editingRequest, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="제목"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                                      <textarea
                                        value={editingRequest?.description || ''}
                                        onChange={(e) => setEditingRequest({ ...editingRequest, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="설명"
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={handleSaveRequest}
                                        disabled={savingRequest}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        {savingRequest ? '저장 중...' : '저장'}
                                      </button>
                                      <button
                                        onClick={handleCancelEditRequest}
                                        disabled={savingRequest}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
                                      >
                                        취소
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium">{request.title}</h4>
                                    </div>
                                    {request.description && (
                                      <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                                    )}
                                    {photos.length > 0 && (
                                      <div className="mt-2">
                                        <div className="flex flex-wrap gap-2">
                                          {photos.map((url, idx) => (
                                            <img
                                              key={idx}
                                              src={url}
                                              alt={`${request.title} 사진 ${idx + 1}`}
                                              className="w-32 h-32 object-cover rounded cursor-pointer"
                                              onClick={() => setSelectedImage(url)}
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                              }}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between mt-3">
                                      <p className="text-xs text-gray-400">
                                        {new Date(request.created_at).toLocaleString('ko-KR')}
                                      </p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleEditRequest(request)}
                                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={() => handleCancelRequest(request.id)}
                                          disabled={cancellingRequestId === request.id}
                                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                                        >
                                          {cancellingRequestId === request.id ? '취소 중...' : '접수 취소'}
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 처리중 - 선택된 상태가 처리중이거나 선택되지 않았을 때만 표시 */}
                  {(!selectedRequestStatus || selectedRequestStatus === 'in_progress') && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">처리중</h3>
                      {requestStatusModalData.in_progress.length === 0 ? (
                        <p className="text-gray-500">진행중인 요청이 없습니다.</p>
                      ) : (
                        <div className="space-y-4">
                          {requestStatusModalData.in_progress.map((request) => {
                            const photos = getPhotoUrls(request.photo_url)
                            return (
                              <div key={request.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-600">{request.store_name || '알 수 없음'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{request.title}</h4>
                                </div>
                                {request.description && (
                                  <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                                )}
                                {photos.length > 0 && (
                                  <div className="mt-2">
                                    <div className="flex flex-wrap gap-2">
                                      {photos.map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={url}
                                          alt={`${request.title} 사진 ${idx + 1}`}
                                          className="w-32 h-32 object-cover rounded cursor-pointer"
                                          onClick={() => setSelectedImage(url)}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between mt-3">
                                  <p className="text-xs text-gray-400">
                                    {new Date(request.created_at).toLocaleString('ko-KR')}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setCompletingRequestId(request.id)
                                      setCompletionPhoto('')
                                      setCompletionDescription('')
                                    }}
                                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                  >
                                    점주 직접 처리 완료
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 반려처리 */}
                  {(!selectedRequestStatus || selectedRequestStatus === 'rejected') && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">반려처리</h3>
                      {requestStatusModalData.rejected.length === 0 ? (
                        <p className="text-gray-500">반려처리된 요청이 없습니다.</p>
                      ) : (
                        <div className="space-y-4">
                          {(() => {
                            const today = new Date().toISOString().split('T')[0]
                            
                            // 확인 안된 항목과 확인된 항목 분리
                            const unconfirmed = requestStatusModalData.rejected.filter((r) => {
                              return !confirmedRequestIds.has(r.id)
                            })
                            
                            const confirmed = requestStatusModalData.rejected.filter((r) => {
                              // 확인된 요청은 확인 당일에만 보여줌
                              if (confirmedRequestIds.has(r.id)) {
                                // localStorage에서 확인 날짜를 가져와야 하는데, 현재는 확인 당일로 간주
                                // 확인된 항목은 당일에만 보여줌
                                return true // 확인된 항목은 모두 표시 (확인 당일 필터링은 아래에서 처리)
                              }
                              return false
                            })
                            
                            // 확인된 항목 중에서 확인 당일인 것만 필터링
                            // localStorage에 저장된 날짜를 확인 (오늘 날짜로 저장된 것만)
                            const confirmedToday = confirmed.filter((r) => {
                              // localStorage에서 확인 날짜 확인
                              const request = requestStatusModalData.rejected.find(req => req.id === r.id)
                              if (request && request.store_id) {
                                const storageKey = `confirmed_requests_${request.store_id}_${today}`
                                const stored = localStorage.getItem(storageKey)
                                if (stored) {
                                  try {
                                    const ids = JSON.parse(stored)
                                    if (ids.includes(r.id)) {
                                      return true // 오늘 확인된 항목
                                    }
                                  } catch (e) {
                                    console.error('Error parsing confirmed requests:', e)
                                  }
                                }
                              }
                              return false
                            })
                            
                            // 확인 안된 항목 먼저 표시, 그 다음 확인된 항목 표시 (가장 아래로)
                            return [...unconfirmed, ...confirmedToday].map((request) => {
                              const photos = getPhotoUrls(request.photo_url)
                              const isConfirmed = confirmedRequestIds.has(request.id)
                              return (
                                <div 
                                  key={request.id} 
                                  className={`border rounded-lg p-4 ${isConfirmed ? 'opacity-50' : ''}`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-600">{request.store_name || '알 수 없음'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{request.title}</h4>
                                  </div>
                                  {(() => {
                                    // description에서 "[반려 처리]" 부분 제거
                                    let cleanDescription = request.description || ''
                                    if (cleanDescription.includes('[반려 처리]')) {
                                      cleanDescription = cleanDescription.split('[반려 처리]')[0].trim()
                                    }
                                    return cleanDescription ? (
                                      <p className="text-sm text-gray-600 mt-1">{cleanDescription}</p>
                                    ) : null
                                  })()}
                                  {request.rejection_description && (
                                    <div className="mt-2 p-2 bg-red-50 rounded">
                                      <p className="text-sm text-red-700">반려 사유: {request.rejection_description}</p>
                                    </div>
                                  )}
                                  {!isConfirmed && (
                                    <button
                                      onClick={() => handleConfirmRequest(request.id)}
                                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                    >
                                      확인
                                    </button>
                                  )}
                                  {photos.length > 0 && (
                                    <div className="mt-2">
                                      <div className="flex flex-wrap gap-2">
                                        {photos.map((url, idx) => (
                                          <img
                                            key={idx}
                                            src={url}
                                            alt={`${request.title} 사진 ${idx + 1}`}
                                            className="w-32 h-32 object-cover rounded cursor-pointer"
                                            onClick={() => setSelectedImage(url)}
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(request.created_at).toLocaleString('ko-KR')}
                                  </p>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 처리완료 - 선택된 상태가 처리완료이거나 선택되지 않았을 때만 표시 */}
                  {(!selectedRequestStatus || selectedRequestStatus === 'completed') && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">처리완료</h3>
                      {(() => {
                        const today = new Date().toISOString().split('T')[0]
                        
                        // 확인 안된 항목과 확인된 항목 분리
                        const unconfirmed = requestStatusModalData.completed.filter((r) => {
                          return !confirmedRequestIds.has(r.id)
                        })
                        
                        const confirmed = requestStatusModalData.completed.filter((r) => {
                          return confirmedRequestIds.has(r.id)
                        })
                        
                        // 확인된 항목 중에서 확인 당일인 것만 필터링
                        // localStorage에 저장된 날짜를 확인 (오늘 날짜로 저장된 것만)
                        const confirmedToday = confirmed.filter((r) => {
                          // localStorage에서 확인 날짜 확인
                          const request = requestStatusModalData.completed.find(req => req.id === r.id)
                          if (request && request.store_id) {
                            const storageKey = `confirmed_requests_${request.store_id}_${today}`
                            const stored = localStorage.getItem(storageKey)
                            if (stored) {
                              try {
                                const ids = JSON.parse(stored)
                                if (ids.includes(r.id)) {
                                  return true // 오늘 확인된 항목
                                }
                              } catch (e) {
                                console.error('Error parsing confirmed requests:', e)
                              }
                            }
                          }
                          return false
                        })
                        
                        // 확인 안된 항목 먼저 표시, 그 다음 확인된 항목 표시 (가장 아래로, 연하게)
                        const allToShow = [...unconfirmed, ...confirmedToday]
                        
                        return allToShow.length === 0 ? (
                          <p className="text-gray-500">처리완료된 요청이 없습니다.</p>
                        ) : (
                          <>
                            <div className="mb-3 text-sm text-gray-600">
                              총 {unconfirmed.length}건 (확인 안된 항목만 표시)
                            </div>
                            <div className="space-y-4">
                              {allToShow.map((request) => {
                                const photos = getPhotoUrls(request.photo_url)
                                const isConfirmed = confirmedRequestIds.has(request.id)
                                const isConfirmedToday = confirmedToday.some(r => r.id === request.id)
                                return (
                                  <div 
                                    key={request.id} 
                                    className={`border rounded-lg p-4 ${isConfirmedToday ? 'opacity-40 bg-gray-50' : ''}`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-600">{request.store_name || '알 수 없음'}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-medium">{request.title}</h4>
                                        </div>
                                        {request.description && (
                                          <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                                        )}
                                        {request.completion_description && (
                                          <div className="mt-2 p-2 bg-green-50 rounded">
                                            <p className="text-sm text-green-700">처리 완료: {request.completion_description}</p>
                                          </div>
                                        )}
                                        {photos.length > 0 && (
                                          <div className="mt-2">
                                            <div className="flex flex-wrap gap-2">
                                              {photos.map((url, idx) => (
                                                <img
                                                  key={idx}
                                                  src={url}
                                                  alt={`${request.title} 사진 ${idx + 1}`}
                                                  className="w-32 h-32 object-cover rounded cursor-pointer"
                                                  onClick={() => setSelectedImage(url)}
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                  }}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {request.completion_photo_url && (
                                          <div className="mt-2">
                                            <p className="text-sm font-medium text-green-700 mb-1">처리 완료 사진</p>
                                            <div className="flex flex-wrap gap-2">
                                              {getPhotoUrls(request.completion_photo_url).map((url, idx) => (
                                                <img
                                                  key={idx}
                                                  src={url}
                                                  alt={`처리 완료 사진 ${idx + 1}`}
                                                  className="w-32 h-32 object-cover rounded cursor-pointer"
                                                  onClick={() => setSelectedImage(url)}
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                  }}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <div className="mt-2 space-y-1">
                                          <p className="text-xs text-gray-500">
                                            작성: {new Date(request.created_at).toLocaleString('ko-KR')}
                                          </p>
                                          {request.completed_at && (
                                            <p className="text-xs text-green-600">
                                              처리 완료: {new Date(request.completed_at).toLocaleString('ko-KR')}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      {!isConfirmed && request.status === 'completed' && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(`/api/business/requests/${request.id}/confirm`, {
                                                method: 'PATCH',
                                              })
                                              if (response.ok) {
                                                const today = new Date().toISOString().split('T')[0]
                                                const targetStoreId = selectedStoreId || storeStatuses[0]?.store_id
                                                if (targetStoreId) {
                                                  const storageKey = `confirmed_requests_${targetStoreId}_${today}`
                                                  const newConfirmedIds = new Set(confirmedRequestIds)
                                                  newConfirmedIds.add(request.id)
                                                  setConfirmedRequestIds(newConfirmedIds)
                                                  localStorage.setItem(storageKey, JSON.stringify(Array.from(newConfirmedIds)))
                                                  // 모달 데이터 새로고침
                                                  await handleRequestStatusClick(selectedRequestStatus || 'completed')
                                                }
                                              } else {
                                                alert('확인 처리에 실패했습니다.')
                                              }
                                            } catch (error) {
                                              console.error('Error confirming request:', error)
                                              alert('확인 처리 중 오류가 발생했습니다.')
                                            }
                                          }}
                                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                        >
                                          확인
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={selectedImage}
              alt="확대된 사진"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 요청란 처리 완료 모달 */}
      {completingRequestId && (() => {
        const completingRequest = requestStatusModalData.in_progress.find((r: any) => r.id === completingRequestId)
        if (!completingRequest) return null
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">요청란 처리 완료</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  처리 완료 사진 (선택)
                </label>
                {completionPhoto && (
                  <div className="mb-2">
                    <img
                      src={completionPhoto}
                      alt="처리 완료 사진 미리보기"
                      className="max-h-48 mx-auto rounded-lg border border-gray-300"
                    />
                  </div>
                )}
                <PhotoUploader
                  storeId={completingRequest.store_id}
                  entity="request"
                  onUploadComplete={(url) => setCompletionPhoto(url)}
                  onUploadError={(error) => alert(`사진 업로드 실패: ${error}`)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  처리 내용 설명 (선택)
                </label>
                <textarea
                  value={completionDescription}
                  onChange={(e) => setCompletionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="처리 내용을 입력하세요..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setCompletingRequestId(null)
                    setCompletionPhoto('')
                    setCompletionDescription('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  disabled={completing}
                >
                  취소
                </button>
                <button
                  onClick={handleCompleteRequest}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={completing}
                >
                  {completing ? '처리 중...' : '완료'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 날짜별 상세 정보 모달 */}
      {showDailyDetailsModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {new Date(selectedDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })} 상세 정보
              </h3>
              <button
                onClick={() => {
                  setShowDailyDetailsModal(false)
                  setSelectedDate(null)
                  setDailyDetailsData(null)
                  setExpandedStoresInModal(new Set())
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {loadingDailyDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : dailyDetailsData ? (
              <div className="space-y-6">
                {/* 관리 전후 사진 */}
                <div className="border-b pb-4">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, cleaning_photos: !prev.cleaning_photos }))}
                    className="flex items-center justify-between w-full text-left hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors"
                  >
                    <h4 className="text-md font-semibold text-gray-800">
                      관리 전후 사진
                      {dailyDetailsData.cleaning_photos.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({dailyDetailsData.cleaning_photos.length}건)
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {expandedSections.cleaning_photos ? '접기' : '펼치기'}
                      </span>
                      <span className="text-gray-500 text-lg">
                        {expandedSections.cleaning_photos ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>
                  {expandedSections.cleaning_photos && (
                    <div className="mt-3">
                      {dailyDetailsData.cleaning_photos.length === 0 ? (
                        <p className="text-gray-500 text-sm">관리 전후 사진이 없습니다.</p>
                      ) : (() => {
                        // 매장별로 그룹화
                        const photosByStore = new Map<string, any[]>()
                        dailyDetailsData.cleaning_photos.forEach((photo: any) => {
                          const storeId = photo.store_id || 'unknown'
                          const storeName = photo.stores?.name || '알 수 없는 매장'
                          const key = `${storeId}_${storeName}`
                          if (!photosByStore.has(key)) {
                            photosByStore.set(key, [])
                          }
                          photosByStore.get(key)!.push(photo)
                        })

                        return (
                          <div className="space-y-4">
                            {Array.from(photosByStore.entries()).map(([key, photos]) => {
                              const storeId = photos[0]?.store_id || 'unknown'
                              const storeName = photos[0]?.stores?.name || '알 수 없는 매장'
                              const isExpanded = expandedStoresInModal.has(key)

                              return (
                                <div key={key} className="border rounded-lg p-3 bg-gray-50">
                                  <button
                                    onClick={() => {
                                      setExpandedStoresInModal(prev => {
                                        const newSet = new Set(prev)
                                        if (newSet.has(key)) {
                                          newSet.delete(key)
                                        } else {
                                          newSet.add(key)
                                        }
                                        return newSet
                                      })
                                    }}
                                    className="flex items-center justify-between w-full text-left hover:bg-gray-100 -mx-2 px-2 py-2 rounded transition-colors"
                                  >
                                    <h5 className="text-sm font-semibold text-gray-800">
                                      {storeName}
                                      <span className="ml-2 text-xs font-normal text-gray-500">
                                        ({photos.length}건)
                                      </span>
                                    </h5>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">
                                        {isExpanded ? '접기' : '펼치기'}
                                      </span>
                                      <span className="text-gray-500">
                                        {isExpanded ? '▼' : '▶'}
                                      </span>
                                    </div>
                                  </button>
                                  {isExpanded && (
                                    <div className="mt-3 space-y-4">
                                      {photos.map((item: any) => {
                                        // 체크리스트 아이템 타입에 따라 before/after 사진 결정
                                        let beforePhoto = null
                                        let afterPhoto = null

                                        if (item.checklist_item_type) {
                                          // 체크리스트 아이템인 경우
                                          const itemType = item.checklist_item_type
                                          if (itemType === 'before_photo') {
                                            beforePhoto = item.before_photo_url
                                            afterPhoto = null
                                          } else if (itemType === 'before_after_photo') {
                                            beforePhoto = item.before_photo_url
                                            afterPhoto = item.after_photo_url
                                          } else if (itemType === 'after_photo') {
                                            beforePhoto = null
                                            afterPhoto = item.after_photo_url
                                          }
                                        } else {
                                          // cleaning_photos 테이블에서 온 경우 (이미 그룹화됨)
                                          beforePhoto = item.before_photo_url
                                          afterPhoto = item.after_photo_url
                                        }

                                        return (
                                          <div key={item.id} className="border rounded-lg p-3 bg-white">
                                            <div className="text-xs text-gray-600 mb-2 font-medium">
                                              {item.area_category || '구역'}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                              {/* 관리 전 사진 */}
                                              <div className="flex flex-col">
                                                <div className="text-xs text-gray-500 mb-1 text-center">관리 전</div>
                                                {beforePhoto ? (
                                                  <div className="relative w-full h-32 rounded overflow-hidden border-2 border-red-500 cursor-pointer hover:opacity-80 transition-opacity">
                                                    <Image
                                                      src={beforePhoto}
                                                      alt="관리 전 사진"
                                                      fill
                                                      className="object-cover"
                                                      sizes="(max-width: 768px) 50vw, 50vw"
                                                      loading="lazy"
                                                      onClick={() => setSelectedImage(beforePhoto)}
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="w-full h-32 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                                    <span className="text-xs text-gray-400">사진 없음</span>
                                                  </div>
                                                )}
                                              </div>
                                              {/* 관리 후 사진 */}
                                              <div className="flex flex-col">
                                                <div className="text-xs text-gray-500 mb-1 text-center">관리 후</div>
                                                {afterPhoto ? (
                                                  <div className="relative w-full h-32 rounded overflow-hidden border-2 border-green-500 cursor-pointer hover:opacity-80 transition-opacity">
                                                    <Image
                                                      src={afterPhoto}
                                                      alt="관리 후 사진"
                                                      fill
                                                      className="object-cover"
                                                      sizes="(max-width: 768px) 50vw, 50vw"
                                                      loading="lazy"
                                                      onClick={() => setSelectedImage(afterPhoto)}
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="w-full h-32 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                                    <span className="text-xs text-gray-400">사진 없음</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            {item.created_at && (
                                              <div className="text-xs text-gray-400 mt-2 text-center">
                                                {new Date(item.created_at).toLocaleTimeString('ko-KR', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* 매장 문제 */}
                <div className="border-b pb-4">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, issues: !prev.issues }))}
                    className="flex items-center justify-between w-full text-left hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors"
                  >
                    <h4 className="text-md font-semibold text-gray-800">
                      매장 문제
                      {dailyDetailsData.issues.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({dailyDetailsData.issues.length}건)
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {expandedSections.issues ? '접기' : '펼치기'}
                      </span>
                      <span className="text-gray-500 text-lg">
                        {expandedSections.issues ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>
                  {expandedSections.issues && (
                    <div className="mt-3">
                      {dailyDetailsData.issues.length === 0 ? (
                        <p className="text-gray-500 text-sm">매장 문제가 없습니다.</p>
                      ) : (
                        <div className="space-y-3">
                          {dailyDetailsData.issues.map((issue: any) => (
                            <div key={issue.id} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                                  {issue.description && (
                                    <div className="text-xs text-gray-600 mt-1">{issue.description}</div>
                                  )}
                                  <div className="text-xs text-gray-400 mt-1">
                                    {issue.stores?.name || '알 수 없는 매장'} ·{' '}
                                    {new Date(issue.created_at).toLocaleTimeString('ko-KR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded ${
                                    issue.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : issue.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {issue.status === 'completed'
                                    ? '완료'
                                    : issue.status === 'rejected'
                                    ? '반려'
                                    : '처리중'}
                                </span>
                              </div>
                              {issue.photo_url && (
                                <div className="mt-2 relative w-full h-32 rounded overflow-hidden border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity">
                                  <Image
                                    src={issue.photo_url}
                                    alt="매장 문제 사진"
                                    fill
                                    className="object-cover"
                                    sizes="100vw"
                                    loading="lazy"
                                    onClick={() => setSelectedImage(issue.photo_url)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 제품 입고/보관 */}
                <div>
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, product_photos: !prev.product_photos }))}
                    className="flex items-center justify-between w-full text-left hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors"
                  >
                    <h4 className="text-md font-semibold text-gray-800">
                      제품 입고/보관
                      {dailyDetailsData.product_photos.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({dailyDetailsData.product_photos.length}건)
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {expandedSections.product_photos ? '접기' : '펼치기'}
                      </span>
                      <span className="text-gray-500 text-lg">
                        {expandedSections.product_photos ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>
                  {expandedSections.product_photos && (
                    <div className="mt-3">
                      {dailyDetailsData.product_photos.length === 0 ? (
                        <p className="text-gray-500 text-sm">제품 입고/보관 사진이 없습니다.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {dailyDetailsData.product_photos.map((photo: any) => (
                            <div key={photo.id} className="border rounded-lg p-2">
                              <div className="text-xs text-gray-600 mb-1">
                                {photo.stores?.name || '알 수 없는 매장'}
                              </div>
                              {photo.product_name && (
                                <div className="text-xs text-gray-500 mb-2">제품: {photo.product_name}</div>
                              )}
                              {photo.location && (
                                <div className="text-xs text-gray-500 mb-2">위치: {photo.location}</div>
                              )}
                              {photo.photo_url && (
                                <div className="relative w-full h-32 rounded overflow-hidden border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity">
                                  <Image
                                    src={photo.photo_url}
                                    alt="제품 사진"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 50vw, 33vw"
                                    loading="lazy"
                                    onClick={() => setSelectedImage(photo.photo_url)}
                                  />
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(photo.created_at).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">데이터를 불러올 수 없습니다.</p>
            )}
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  )
}
