'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { uploadPhoto } from '@/lib/supabase/upload'
import { getTodayDateKST } from '@/lib/utils/date'

interface StoreStatus {
  store_id: string
  store_name: string
  store_address: string | null
  work_day: string | null
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
  completed_store_problems: number
  unconfirmed_vending_problems: number
  confirmed_vending_problems: number
  unconfirmed_lost_items: number
  confirmed_lost_items: number
  has_product_inflow_today: boolean
  has_storage_photos: boolean
  storage_photos?: Array<{ id: string; photo_url: string }>
  received_request_count: number
  received_supply_request_count: number
  in_progress_supply_request_count: number
  in_progress_request_count: number
  completed_request_count: number
  rejected_request_count: number
  unconfirmed_completed_request_count: number
  unconfirmed_rejected_request_count: number
  before_photo_count: number
  after_photo_count: number
  before_after_photos?: Array<{ id: string; before_photo_url: string | null; after_photo_url: string | null; area: string }>
  checklist_completion_rate: number
  checklist_completed: number
  checklist_total: number
  last_update_time: string | null
}

interface ProblemReport {
  id: string
  title: string
  description: string | null
  photo_url: string | null
  status: string
  created_at: string
  updated_at?: string
}

interface LostItem {
  id: string
  type: string
  description: string | null
  photo_url: string | null
  status: string
  storage_location?: string | null
  created_at: string
  updated_at?: string
}

interface Request {
  id: string
  title: string
  description: string | null
  photo_url: string | null
  status: string
  created_at: string
  updated_at: string | null
  completion_photo_url?: string | null
  completion_description?: string | null
  completed_by?: string | null
  completed_at?: string | null
  completed_by_user?: {
    id: string
    name: string
  } | null
  rejection_photo_url?: string | null
  rejection_description?: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  rejected_by_user?: {
    id: string
    name: string
  } | null
  created_by_user?: {
    id: string
    name: string
    role: string
  } | null
  store_id?: string
  store_name?: string
}

interface InventoryPhoto {
  id: string
  photo_url: string
  photo_type: string
  created_at: string
}

export default function BusinessStoresStatusPage() {
  const [storeStatuses, setStoreStatuses] = useState<StoreStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set())
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [showBeforeAfterModal, setShowBeforeAfterModal] = useState(false)
  const [showProblemModal, setShowProblemModal] = useState(false)
  const [loadingProblemModal, setLoadingProblemModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<StoreStatus | null>(null)
  const [showAllProblemsModal, setShowAllProblemsModal] = useState(false)
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false)
  // 매장 접기/펼치기 상태 관리
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set())
  // 전체 문제발생 모달용 데이터
  const [allProblemsData, setAllProblemsData] = useState<Map<string, {
    store_problems: any[]
    vending_problems: any[]
    lost_items: any[]
  }>>(new Map())
  const [loadingAllProblems, setLoadingAllProblems] = useState(false)
  // 전체 알림 모달용 데이터
  const [allNotificationsData, setAllNotificationsData] = useState<Map<string, {
    in_progress_requests: any[]
    completed_requests: any[]
    store_problems: any[]
    vending_problems: any[]
    lost_items: any[]
  }>>(new Map())
  const [loadingAllNotifications, setLoadingAllNotifications] = useState(false)
  const [inventoryPhotos, setInventoryPhotos] = useState<{ product_inflow: InventoryPhoto[]; storage: InventoryPhoto[] }>({ product_inflow: [], storage: [] })
  const [problemReports, setProblemReports] = useState<{ store_problems: ProblemReport[]; vending_problems: ProblemReport[] }>({ store_problems: [], vending_problems: [] })
  const [lostItems, setLostItems] = useState<LostItem[]>([])
  const [requests, setRequests] = useState<{ received: Request[]; in_progress: Request[]; completed: Request[]; rejected: Request[] }>({ received: [], in_progress: [], completed: [], rejected: [] })
  const [loadingRequests, setLoadingRequests] = useState(false)
  // 매장별 처리완료 요청 목록 (대시보드 카드용)
  const [storeCompletedRequests, setStoreCompletedRequests] = useState<Map<string, Request[]>>(new Map())
  // 확인된 요청 ID와 확인 날짜를 저장 (당일만 표시하기 위해)
  // 로컬 스토리지에서 로드
  const loadConfirmedRequestsFromStorage = (): { ids: Set<string>; dates: Map<string, string> } => {
    if (typeof window === 'undefined') {
      return { ids: new Set(), dates: new Map() }
    }
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const storageKey = `confirmed_requests_${today}`
      const stored = localStorage.getItem(storageKey)
      
      if (stored) {
        const data = JSON.parse(stored)
        const ids = new Set<string>(data.ids || [])
        const dates = new Map<string, string>(data.dates || [])
        return { ids, dates }
      }
    } catch (error) {
      console.error('Error loading confirmed requests from storage:', error)
    }
    
    return { ids: new Set(), dates: new Map() }
  }

  const [confirmedRequestIds, setConfirmedRequestIds] = useState<Set<string>>(() => {
    return loadConfirmedRequestsFromStorage().ids
  })
  const [confirmedRequestDates, setConfirmedRequestDates] = useState<Map<string, string>>(() => {
    return loadConfirmedRequestsFromStorage().dates
  })

  // 로컬 스토리지에 저장
  const saveConfirmedRequestsToStorage = (ids: Set<string>, dates: Map<string, string>) => {
    if (typeof window === 'undefined') return
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const storageKey = `confirmed_requests_${today}`
      const data = {
        ids: Array.from(ids),
        dates: Array.from(dates.entries())
      }
      localStorage.setItem(storageKey, JSON.stringify(data))
      
      // 오래된 데이터 정리 (7일 이상 된 데이터 삭제)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo)
        date.setDate(date.getDate() + i)
        const dateKey = date.toISOString().split('T')[0]
        const oldKey = `confirmed_requests_${dateKey}`
        if (dateKey !== today) {
          localStorage.removeItem(oldKey)
        }
      }
    } catch (error) {
      console.error('Error saving confirmed requests to storage:', error)
    }
  }
  const [confirmedProblemIds, setConfirmedProblemIds] = useState<Set<string>>(new Set())
  const [confirmedLostItemIds, setConfirmedLostItemIds] = useState<Set<string>>(new Set())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageInfo, setSelectedImageInfo] = useState<{
    url: string
    area: string
    type: 'before' | 'after'
    allPhotos: Array<{ url: string; area: string; type: 'before' | 'after' }>
    currentIndex: number
  } | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    storeProblems: false,
    vendingProblems: false,
    lostItems: false,
  })
  const [viewingCompletedRequestId, setViewingCompletedRequestId] = useState<string | null>(null)
  const [showCompletionForm, setShowCompletionForm] = useState<string | null>(null)
  const [completionDescription, setCompletionDescription] = useState('')
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([])
  const [showRequestCreateModal, setShowRequestCreateModal] = useState(false)
  const [broadcastMode, setBroadcastMode] = useState(false)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [requestFormData, setRequestFormData] = useState({
    category: '',
    description: '',
    photos: [] as string[],
  })
  const [requestPhotos, setRequestPhotos] = useState<string[]>([])
  const [showReceivedRequestsModal, setShowReceivedRequestsModal] = useState(false)
  const [receivedRequests, setReceivedRequests] = useState<Request[]>([])
  const [selectedReceivedRequest, setSelectedReceivedRequest] = useState<Request | null>(null)
  const [editingReceivedRequest, setEditingReceivedRequest] = useState<string | null>(null)
  const [showReceivedSupplyRequestsModal, setShowReceivedSupplyRequestsModal] = useState(false)
  const [receivedSupplyRequests, setReceivedSupplyRequests] = useState<any[]>([])
  const [receivedRequestFormData, setReceivedRequestFormData] = useState({
    category: '',
    description: '',
  })
  const [now, setNow] = useState<string>(() =>
    new Date().toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'medium' })
  )
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 시간 체크 함수 (8시 ~ 23시)
  const isWithinRefreshHours = () => {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 8 && hour < 23
  }

  useEffect(() => {
    // 초기 로드 시 로컬 스토리지에서 확인된 요청 로드
    const { ids, dates } = loadConfirmedRequestsFromStorage()
    setConfirmedRequestIds(ids)
    setConfirmedRequestDates(dates)
    
    loadStoreStatuses()

    // 자동 새로고침 설정 (30분마다, 8시~23시만)
    const setupAutoRefresh = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      if (isWithinRefreshHours()) {
        intervalRef.current = setInterval(() => {
          if (isWithinRefreshHours()) {
            loadStoreStatuses()
          }
        }, 30 * 60 * 1000) // 30분
      }
    }

    setupAutoRefresh()

    // 시간이 변경될 때마다 체크 (예: 23시가 되면 자동 새로고침 중지)
    const hourCheckInterval = setInterval(() => {
      setupAutoRefresh()
    }, 60 * 1000) // 1분마다 시간 체크

    // 날짜가 변경될 때 확인된 요청 목록 정리 (다음날이 되면 오늘 확인한 것들 제거)
    const dateCheckInterval = setInterval(() => {
      const today = getTodayDateKST()
      // 로컬 스토리지에서 오늘 날짜의 데이터만 로드
      const { ids, dates } = loadConfirmedRequestsFromStorage()
      setConfirmedRequestIds(ids)
      setConfirmedRequestDates(dates)
    }, 60 * 60 * 1000) // 1시간마다 날짜 체크

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearInterval(hourCheckInterval)
      clearInterval(dateCheckInterval)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date().toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'medium' }))
    }, 60 * 1000)

    return () => clearInterval(timer)
  }, [])

  // 매장 상태가 로드되면 처리완료 및 반려처리 요청 목록도 로드
  useEffect(() => {
    if (storeStatuses.length > 0) {
      storeStatuses.forEach((status) => {
        if (status.completed_request_count > 0 || status.rejected_request_count > 0) {
          loadStoreCompletedRequests(status.store_id)
        }
      })
    }
  }, [storeStatuses])

  const loadStoreStatuses = async () => {
    try {
      setLoading(true)
      // 캐시 무효화를 위해 타임스탬프 쿼리 파라미터 추가
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/business/stores/status?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const data = await response.json()

      if (response.ok) {
        console.log('=== Store Statuses API Response ===')
        console.log('Total stores:', data.data?.length || 0)
        
        // getStatusLabel 함수를 먼저 정의해야 함
        const getStatusLabelForLog = (store: any): string => {
          if (!store.is_work_day) return '휴무'
          if (store.attendance_status === 'clocked_out') return '퇴근완료'
          if (store.attendance_status === 'clocked_in') return '출근중'
          return '출근전'
        }
        
        data.data?.forEach((store: any) => {
          console.log(`\nStore: ${store.store_name} (${store.store_id})`)
          console.log('  - attendance_status:', store.attendance_status, `[${getStatusLabelForLog(store)}]`)
          console.log('  - is_work_day:', store.is_work_day)
          console.log('  - clock_in_time:', store.clock_in_time)
          console.log('  - clock_out_time:', store.clock_out_time)
          console.log('  - staff_name:', store.staff_name)
          console.log('  - store_problem_count:', store.store_problem_count)
          console.log('  - vending_problem_count:', store.vending_problem_count)
          console.log('  - lost_item_count:', store.lost_item_count)
          console.log('  - unprocessed_store_problems:', store.unprocessed_store_problems)
          console.log('  - unconfirmed_vending_problems:', store.unconfirmed_vending_problems)
          console.log('  - unconfirmed_lost_items:', store.unconfirmed_lost_items)
          console.log('  - confirmed_lost_items:', store.confirmed_lost_items)
        })
        console.log('=== End Store Statuses ===\n')
        setStoreStatuses(data.data || [])
      } else {
        console.error('API Error:', data)
      }
    } catch (error) {
      console.error('Error loading store statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  // 매장 정렬: 작업일 > 문제 상태 > 알파벳순
  const sortedStores = useMemo(() => {
    const today = new Date().getDay() // 0=일, 1=월, ..., 6=토
    const dayMap: { [key: number]: string } = {
      0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토'
    }
    const todayKorean = dayMap[today]

    return [...storeStatuses].sort((a, b) => {
      // 출근 상태 우선순위: 출근중 > 출근전 > 퇴근완료 > 휴무
      const getStatusPriority = (store: StoreStatus): number => {
        // 휴무는 가장 마지막
        if (!store.is_work_day) return 4
        
        // 출근 상태에 따라 우선순위 결정
        if (store.attendance_status === 'clocked_in') return 1  // 출근중
        if (store.attendance_status === 'not_clocked_in') return 2  // 출근전
        if (store.attendance_status === 'clocked_out') return 3  // 퇴근완료
        
        return 4  // 기본값 (휴무)
      }
      
      const aPriority = getStatusPriority(a)
      const bPriority = getStatusPriority(b)
      
      // 1. 출근 상태 우선순위로 정렬
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      // 2. 같은 상태 내에서는 문제 상태 (문제가 있으면 우선)
      const aHasProblems = a.has_problem
      const bHasProblems = b.has_problem
      if (aHasProblems !== bHasProblems) {
        return aHasProblems ? -1 : 1
      }
      
      // 3. 알파벳순 (한글명 기준)
      return a.store_name.localeCompare(b.store_name, 'ko')
    })
  }, [storeStatuses])

  const handleOpenInventoryModal = async (store: StoreStatus) => {
    setSelectedStore(store)
    setShowInventoryModal(true)

    try {
      const response = await fetch(`/api/business/stores/${store.store_id}/inventory-photos`)
      const data = await response.json()
      if (response.ok) {
        setInventoryPhotos(data.data || { product_inflow: [], storage: [] })
      }
    } catch (error) {
      console.error('Error loading inventory photos:', error)
    }
  }

  const handleOpenProblemModal = async (store: StoreStatus) => {
    setSelectedStore(store)
    setShowProblemModal(true)
    setLoadingProblemModal(true)

    try {
      // 캐시 무효화를 위해 타임스탬프 쿼리 파라미터 추가
      const timestamp = new Date().getTime()
      const [problemResponse, lostResponse] = await Promise.all([
        fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        }),
        fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
      ])
      
      const problemData = await problemResponse.json()
      const lostData = await lostResponse.json()
      
      console.log('Problem reports API response:', problemData)
      console.log('Lost items API response:', lostData)
      
      if (problemResponse.ok) {
        const reports = problemData.data || { store_problems: [], vending_problems: [] }
        console.log('Setting problem reports:', reports)
        console.log('Store problems count:', reports.store_problems?.length || 0)
        console.log('Vending problems count:', reports.vending_problems?.length || 0)
        setProblemReports(reports)
      } else {
        console.error('Problem reports API error:', problemData)
      }
      
      if (lostResponse.ok) {
        const items = lostData.data || []
        console.log('Setting lost items:', items)
        console.log('Lost items count:', items.length)
        items.forEach((item: any) => {
          console.log(`  - ID: ${item.id}, Status: "${item.status}", updated_at: ${item.updated_at}`)
        })
        setLostItems(items)
        
        // 확인된 항목 ID 자동 동기화 (status가 'completed'인 항목)
        setConfirmedLostItemIds((prev) => {
          const newSet = new Set(prev)
        items.forEach((item: any) => {
          // lost_items는 issue_status enum을 사용하므로 'completed'만 확인된 상태
          if (item.status === 'completed') {
            newSet.add(item.id)
          }
        })
          console.log('Synced confirmedLostItemIds from API:', Array.from(newSet))
          return newSet
        })
      } else {
        console.error('Lost items API error:', lostData)
      }
    } catch (error) {
      console.error('Error loading problem reports:', error)
    } finally {
      setLoadingProblemModal(false)
    }
  }

  const loadAllReceivedRequests = async () => {
    setShowReceivedRequestsModal(true)
    setReceivedRequests([])
    setSelectedReceivedRequest(null)
    setEditingReceivedRequest(null)

    try {
      // 모든 매장의 접수 요청을 로드
      const allReceivedRequests: Request[] = []
      
      for (const store of storeStatuses) {
        if (store.received_request_count > 0) {
          const timestamp = new Date().getTime()
          const response = await fetch(`/api/business/stores/${store.store_id}/requests?t=${timestamp}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          })
          const data = await response.json()
          
          if (response.ok && data.success) {
            const requestsData = data.data || { received: [], in_progress: [], completed: [], rejected: [] }
            const received = requestsData.received || []
            // 매장 정보 추가
            const requestsWithStore = received.map((req: any) => ({
              ...req,
              store_name: store.store_name,
              store_id: store.store_id,
            }))
            allReceivedRequests.push(...requestsWithStore)
          }
        }
      }
      
      setReceivedRequests(allReceivedRequests)
    } catch (error) {
      console.error('Error loading all received requests:', error)
    }
  }

  const loadAllReceivedSupplyRequests = async () => {
    setShowReceivedSupplyRequestsModal(true)
    setReceivedSupplyRequests([])

    try {
      const response = await fetch('/api/business/supply-requests/received')
      const data = await response.json()

      if (response.ok && data.success) {
        setReceivedSupplyRequests(data.data || [])
      } else {
        alert('물품 요청 목록을 불러오는 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error loading all received supply requests:', error)
      alert('물품 요청 목록을 불러오는 중 오류가 발생했습니다.')
    }
  }

  const handleViewReceivedRequests = async (storeId: string) => {
    setShowReceivedRequestsModal(true)
    setReceivedRequests([])
    setSelectedReceivedRequest(null)
    setEditingReceivedRequest(null)

    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/business/stores/${storeId}/requests?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        const requestsData = data.data || { received: [], in_progress: [], completed: [], rejected: [] }
        const received = requestsData.received || []
        // 매장 정보 추가 (storeStatuses에서 찾기)
        const store = storeStatuses.find(s => s.store_id === storeId)
        const requestsWithStore = received.map((req: any) => ({
          ...req,
          store_name: store?.store_name,
          store_id: storeId,
        }))
        setReceivedRequests(requestsWithStore)
      }
    } catch (error) {
      console.error('Error loading received requests:', error)
    }
  }

  const handleOpenRequestModal = async (store: StoreStatus) => {
    setSelectedStore(store)
    setShowRequestModal(true)
    setLoadingRequests(true)
    setRequests({ received: [], in_progress: [], completed: [], rejected: [] })

    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/business/stores/${store.store_id}/requests?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const data = await response.json()
      console.log('API Response for requests:', { response: response.ok, data, status: response.status })
      
      if (response.ok && data.success) {
        const requestsData = data.data || { received: [], in_progress: [], completed: [], rejected: [] }
        
        // 반려된 요청 데이터 확인 (한 번만 로그)
        if (requestsData.rejected && requestsData.rejected.length > 0) {
          console.log('반려된 요청 데이터:', requestsData.rejected.map((r: any) => ({
            id: r.id,
            title: r.title,
            rejection_photo_url: r.rejection_photo_url,
            rejection_description: r.rejection_description
          })))
        }
        
        // 처리완료 요청에 store_id 추가 (대시보드에서 필터링하기 위해)
        const processedData = {
          received: Array.isArray(requestsData.received) ? requestsData.received : [],
          in_progress: Array.isArray(requestsData.in_progress) ? requestsData.in_progress : [],
          completed: Array.isArray(requestsData.completed) ? (requestsData.completed || []).map((r: any) => ({
            ...r,
            store_id: store.store_id
          })) : [],
          rejected: Array.isArray(requestsData.rejected) ? (requestsData.rejected || []).map((r: any) => ({
            ...r,
            store_id: store.store_id
          })) : []
        }
        console.log('Processed requests data:', processedData)
        console.log('Setting requests state with in_progress:', processedData.in_progress.length, 'items')
        
        // photo_url 디버깅
        if (processedData.in_progress.length > 0) {
          console.log('처리중 요청들의 photo_url:', processedData.in_progress.map((r: any) => ({
            id: r.id,
            title: r.title,
            photo_url: r.photo_url,
            photo_url_type: typeof r.photo_url,
            parsed_photo_urls: r.photo_url ? getPhotoUrls(r.photo_url) : []
          })))
        }
        
        setRequests(processedData)
      } else {
        console.error('Failed to load requests:', { response: response.ok, data, status: response.status })
        setRequests({ received: [], in_progress: [], completed: [], rejected: [] })
      }
    } catch (error) {
      console.error('Error loading requests:', error)
      setRequests({ received: [], in_progress: [], completed: [], rejected: [] })
    } finally {
      setLoadingRequests(false)
    }
  }

  // 매장별 처리완료 및 반려처리 요청 목록 로드
  const loadStoreCompletedRequests = async (storeId: string) => {
    try {
      const response = await fetch(`/api/business/stores/${storeId}/requests`)
      const data = await response.json()
      if (response.ok) {
        const requestsData = data.data || { received: [], in_progress: [], completed: [], rejected: [] }
        // 매장별 처리완료 및 반려처리 요청 저장 (카운트 계산을 위해)
        setStoreCompletedRequests((prev) => {
          const newMap = new Map(prev)
          // completed와 rejected를 합쳐서 저장
          const allRequests = [...(requestsData.completed || []), ...(requestsData.rejected || [])]
          newMap.set(storeId, allRequests)
          return newMap
        })
      }
    } catch (error) {
      console.error('Error loading completed/rejected requests:', error)
    }
  }

  const handleConfirmRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/business/requests/${requestId}/confirm`, {
        method: 'PATCH',
      })

      if (response.ok) {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD 형식
        setConfirmedRequestIds((prev) => {
          const newSet = new Set(prev).add(requestId)
          setConfirmedRequestDates((prevDates) => {
            const newMap = new Map(prevDates)
            newMap.set(requestId, today)
            // 로컬 스토리지에 저장
            saveConfirmedRequestsToStorage(newSet, newMap)
            return newMap
          })
          return newSet
        })
        setViewingCompletedRequestId(null)
        // 요청 목록 다시 로드
        if (selectedStore) {
          handleOpenRequestModal(selectedStore)
        }
      } else {
        const data = await response.json()
        alert(data.error || '확인 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error confirming request:', error)
      alert('확인 처리 중 오류가 발생했습니다.')
    }
  }

  // 오늘 날짜인지 확인하는 함수
  const isToday = (dateString: string): boolean => {
    const today = getTodayDateKST()
    return dateString === today
  }

  // 확인된 요청 중 오늘 확인한 것만 필터링
  const getTodayConfirmedRequestIds = useCallback((): Set<string> => {
    const today = getTodayDateKST()
    const todayConfirmed = new Set<string>()
    confirmedRequestDates.forEach((date, id) => {
      if (date === today) {
        todayConfirmed.add(id)
      }
    })
    return todayConfirmed
  }, [confirmedRequestDates])

  const handleCreateRequest = async () => {
    if (!requestFormData.category || !requestFormData.description) {
      alert('카테고리와 요청 내용을 입력해주세요.')
      return
    }

    // 대상 매장 목록 결정
    const targets = broadcastMode ? sortedStores : selectedStore ? [selectedStore] : []
    if (targets.length === 0) {
      alert('요청을 보낼 매장이 없습니다.')
      return
    }

    try {
      // 각 매장별로 사진을 업로드하여 요청에 정확히 매핑
      let successCount = 0
      for (const store of targets) {
        const photoUrls: string[] = []

        // 매장별 업로드
        if (requestPhotos.length > 0) {
          console.log('[요청 생성] 업로드 대상 매장:', store.store_id, '사진 개수:', requestPhotos.length)
          for (const photoDataUrl of requestPhotos) {
            try {
              const response = await fetch(photoDataUrl)
              const blob = await response.blob()
              const file = new File([blob], `request-${Date.now()}.jpg`, { type: blob.type })
              const url = await uploadPhoto(file, store.store_id, 'issue')
              photoUrls.push(url)
            } catch (uploadError) {
              console.error('Photo upload error:', uploadError)
              alert('사진 업로드 중 오류가 발생했습니다.')
              return
            }
          }
        }

        console.log('[요청 생성] 최종 photo_urls:', photoUrls)

        const response = await fetch('/api/business/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: store.store_id,
            category: requestFormData.category,
            description: requestFormData.description,
            photo_urls: photoUrls,
          }),
        })

        if (response.ok) {
          successCount += 1
        } else {
          const data = await response.json()
          console.error('요청 등록 실패:', data)
        }
      }

      setShowRequestCreateModal(false)
      setBroadcastMode(false)
      setRequestFormData({ category: '', description: '', photos: [] })
      setRequestPhotos([])
      loadStoreStatuses()
      alert(
        broadcastMode
          ? `전체 요청접수 완료 (${successCount}/${targets.length})`
          : '요청이 등록되었습니다. (처리중으로 설정됨)'
      )
    } catch (error) {
      console.error('Error creating request:', error)
      alert('요청 등록 중 오류가 발생했습니다.')
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/business/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })

      if (response.ok) {
        loadStoreStatuses()
        handleOpenRequestModal(selectedStore!)
        alert('요청이 처리중으로 변경되었습니다.')
      } else {
        const data = await response.json()
        alert(data.error || '요청 상태 변경 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      alert('요청 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleUpdateRequest = async (requestId: string) => {
    if (!requestFormData.category || !requestFormData.description) {
      alert('카테고리와 요청란 설명을 입력해주세요.')
      return
    }

    if (!selectedStore) return

    try {
      // 사진 업로드
      const photoUrls: string[] = []
      if (requestPhotos.length > 0) {
        for (const photoDataUrl of requestPhotos) {
          try {
            const response = await fetch(photoDataUrl)
            const blob = await response.blob()
            const file = new File([blob], `request-${Date.now()}.jpg`, { type: blob.type })
            const url = await uploadPhoto(file, selectedStore.store_id, 'issue')
            photoUrls.push(url)
          } catch (uploadError) {
            console.error('Photo upload error:', uploadError)
            alert('사진 업로드 중 오류가 발생했습니다.')
            return
          }
        }
      }

      // 기존 사진 URL 가져오기
      const request = requests.received.find((r) => r.id === requestId)
      const existingPhotos = request?.photo_url ? getPhotoUrls(request.photo_url) : []
      const allPhotoUrls = [...existingPhotos, ...photoUrls]

      const response = await fetch(`/api/business/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: requestFormData.category,
          description: requestFormData.description,
          photo_urls: allPhotoUrls,
        }),
      })

      if (response.ok) {
        setEditingRequestId(null)
        setRequestFormData({ category: '', description: '', photos: [] })
        setRequestPhotos([])
        loadStoreStatuses()
        handleOpenRequestModal(selectedStore!)
        alert('요청이 수정되었습니다.')
      } else {
        const data = await response.json()
        alert(data.error || '요청 수정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error updating request:', error)
      alert('요청 수정 중 오류가 발생했습니다.')
    }
  }

  const handleConfirmProblem = async (problemId: string) => {
    try {
      const response = await fetch(`/api/business/problem-reports/${problemId}/confirm`, {
        method: 'PATCH',
      })

      if (response.ok) {
        alert('저장 되었습니다')
        // 상태 갱신
        loadStoreStatuses()
        await handleOpenProblemModal(selectedStore!)
      } else {
        const data = await response.json()
        alert(data.error || '확인 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error confirming problem:', error)
      alert('확인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleConfirmLostItem = async (lostItemId: string) => {
    console.log('=== handleConfirmLostItem called ===', lostItemId)
    try {
      console.log('Confirming lost item:', lostItemId)
      console.log('Making API call to:', `/api/business/lost-items/${lostItemId}/confirm`)
      
      const response = await fetch(`/api/business/lost-items/${lostItemId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Response received:', { status: response.status, ok: response.ok, statusText: response.statusText })
      
      const data = await response.json()
      console.log('Confirm API response data:', data)

      if (!response.ok) {
        console.error('API call failed:', response.status, data)
        const errorMessage = data.error || data.message || `확인 처리 중 오류가 발생했습니다. (${response.status})`
        alert(errorMessage)
        return
      }

      if (!data.success) {
        console.error('API returned success: false', data)
        const errorMessage = data.error || data.message || '확인 처리에 실패했습니다.'
        alert(errorMessage)
        return
      }

      console.log('=== Confirm API Success ===')
      console.log('API returned data:', JSON.stringify(data.data, null, 2))
      console.log('API returned status:', data.status)
      
      // API 응답에서 반환된 상태 값 사용 (lost_items는 issue_status enum 사용, 'completed'만 허용)
      const newStatus = data.data?.status || data.status
      const newUpdatedAt = data.data?.updated_at || new Date().toISOString()
      
      console.log('Final status to use:', newStatus)
      console.log('Updated timestamp:', newUpdatedAt)
      
      // 상태가 확인된 상태인지 검증
      if (!newStatus) {
        console.error('ERROR: No status returned from API')
        alert('오류: API에서 상태 정보를 받지 못했습니다.')
        return
      }
      
      // lost_items는 issue_status enum을 사용하므로 'completed'만 확인된 상태
      const isConfirmedStatus = newStatus === 'completed'
      if (!isConfirmedStatus) {
        console.error('ERROR: Status is not a confirmed status:', newStatus)
        console.error('lost_items 테이블은 issue_status enum을 사용하므로 "completed"만 허용됩니다.')
        alert(`오류: 상태 업데이트에 실패했습니다.\n현재 상태: ${newStatus}\n\nlost_items 테이블은 "completed" 상태만 허용합니다.`)
        return
      }
      
      // 확인된 ID 추가
      setConfirmedLostItemIds((prev) => {
        const newSet = new Set(prev)
        newSet.add(lostItemId)
        console.log('Updated confirmedLostItemIds:', Array.from(newSet))
        return newSet
      })
      
      // 로컬 상태도 즉시 업데이트 (API 응답 데이터 사용)
      setLostItems((prevItems) => {
        const updated = prevItems.map((item) => {
          if (item.id === lostItemId) {
            console.log('Updating item status locally:', item.id, 'from', item.status, 'to', newStatus)
            return { 
              ...item, 
              status: newStatus as any, 
              updated_at: newUpdatedAt 
            }
          }
          return item
        })
        console.log('Updated lostItems state:', updated.map(i => ({ id: i.id, status: i.status })))
        return updated
      })

      // 대시보드 카드 상태 즉시 업데이트 (선택된 매장의 분실물 카운트 업데이트)
      if (selectedStore) {
        setStoreStatuses((prevStatuses) => {
          return prevStatuses.map((store) => {
            if (store.store_id === selectedStore.store_id) {
              // 현재 항목이 미확인 상태였다면 카운트 조정
              const wasUnconfirmed = store.unconfirmed_lost_items > 0
              return {
                ...store,
                unconfirmed_lost_items: wasUnconfirmed 
                  ? Math.max(0, store.unconfirmed_lost_items - 1)
                  : store.unconfirmed_lost_items,
                confirmed_lost_items: store.confirmed_lost_items + 1,
              }
            }
            return store
          })
        })
      }

      // 상태 갱신 (약간의 지연 후, API 업데이트가 반영될 시간 확보)
      // 데이터베이스 변경사항이 반영될 시간을 확보하기 위해 더 긴 지연 시간 사용
      console.log('Waiting for database update to propagate...')
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 대시보드 상태 새로고침 (캐시 무효화를 위해 타임스탬프 추가)
      console.log('Refreshing store statuses...')
      await loadStoreStatuses()
      console.log('Store statuses refreshed')
      
      // 추가 지연 후 모달 데이터 새로고침 (데이터베이스에서 최신 상태 가져오기)
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Refreshing modal data...')
      
      if (selectedStore) {
        await handleOpenProblemModal(selectedStore)
        
        // 새로고침 후에도 confirmedLostItemIds 유지 보장
        setConfirmedLostItemIds((prev) => {
          const newSet = new Set(prev)
          newSet.add(lostItemId)
          console.log('Final confirmedLostItemIds after refresh:', Array.from(newSet))
          return newSet
        })
      }
    } catch (error) {
      console.error('Error confirming lost item:', error)
      alert('확인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleCompleteStoreProblem = async (problemId: string) => {
    try {
      // 사진 파일을 업로드하고 URL 받기
      const photoUrls: string[] = []
      
      if (completionPhotos.length > 0 && selectedStore) {
        // base64 이미지를 File로 변환하여 업로드
        for (const photoDataUrl of completionPhotos) {
          try {
            // base64에서 Blob 생성
            const response = await fetch(photoDataUrl)
            const blob = await response.blob()
            const file = new File([blob], `completion-${Date.now()}.jpg`, { type: blob.type })
            
            // Supabase에 업로드
            const url = await uploadPhoto(file, selectedStore.store_id, 'issue')
            photoUrls.push(url)
          } catch (uploadError) {
            console.error('Photo upload error:', uploadError)
            alert('사진 업로드 중 오류가 발생했습니다.')
            return
          }
        }
      }

      // 설명란이 비어있으면 기본 텍스트 "처리 완료" 사용
      const finalDescription = completionDescription.trim() || '처리 완료'

      const response = await fetch(`/api/business/problem-reports/${problemId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: finalDescription,
          photo_urls: photoUrls,
        }),
      })

      const data = await response.json()
      
      console.log('Complete problem report response:', { response: response.ok, data })
      
      if (response.ok && data.success) {
        setShowCompletionForm(null)
        setCompletionDescription('')
        setCompletionPhotos([])
        
        // 전체 상태 갱신 먼저 (매장 상태 카드 업데이트)
        await loadStoreStatuses()
        
        // 모달 데이터 새로고침 (약간의 지연을 두어 DB 반영 시간 확보)
        if (selectedStore) {
          setTimeout(async () => {
            await handleOpenProblemModal(selectedStore)
          }, 500)
        }
        
        alert('처리 완료되었습니다.')
      } else {
        console.error('Failed to complete problem report:', data)
        alert(data.error || '처리 완료 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error completing problem:', error)
      alert('처리 완료 중 오류가 발생했습니다.')
    }
  }

  // 특정 매장만 새로고침
  const refreshStore = async (storeId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (refreshing.has(storeId)) return

    setRefreshing((prev) => new Set(prev).add(storeId))

    try {
      const response = await fetch(`/api/business/stores/${storeId}/status`)
      const data = await response.json()

      if (response.ok && data.data) {
        setStoreStatuses((prev) =>
          prev.map((store) => (store.store_id === storeId ? data.data : store))
        )
      }
    } catch (err) {
      console.error('Store refresh error:', err)
    } finally {
      setRefreshing((prev) => {
        const next = new Set(prev)
        next.delete(storeId)
        return next
      })
    }
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

  // 필터 상태 (조건문 이전에 선언해야 함)
  const [filter, setFilter] = useState<'all' | 'operating' | 'completed' | 'in_progress' | 'problem'>('all')

  // 필터링된 매장 목록
  const filteredStores = useMemo(() => {
    return sortedStores.filter((store) => {
      if (filter === 'all') return true
      if (filter === 'operating') return store.is_work_day
      if (filter === 'completed') return store.attendance_status === 'clocked_out'
      if (filter === 'in_progress') return store.attendance_status === 'clocked_in'
      if (filter === 'problem') {
        // 미확인/미처리 문제가 있는 매장만 표시
        return store.has_problem && 
               ((store.unprocessed_store_problems || 0) > 0 || 
                (store.unconfirmed_vending_problems || 0) > 0 || 
                (store.unconfirmed_lost_items || 0) > 0)
      }
      return true
    })
  }, [sortedStores, filter])

  // 통계 계산 (확인 처리된 항목 제외)
  const stats = useMemo(() => {
    // 문제발생: 미확인/미처리 문제가 있는 매장만 카운트
    const problemCount = storeStatuses.filter((s) => {
      if (!s.has_problem) return false
      // 미처리 매장 문제 또는 미확인 자판기 문제 또는 미확인 분실물이 있으면 문제발생 매장으로 카운트
      return (s.unprocessed_store_problems || 0) > 0 || 
             (s.unconfirmed_vending_problems || 0) > 0 || 
             (s.unconfirmed_lost_items || 0) > 0
    }).length

    // 알림: 확인 처리되지 않은 항목만 카운트
    const notificationCount = storeStatuses.reduce((sum, s) => {
      // 요청: 진행중 요청 + 미확인 완료/반려 요청
      const requestCount = s.in_progress_request_count + 
                          (s.unconfirmed_completed_request_count || 0) + 
                          (s.unconfirmed_rejected_request_count || 0)
      
      // 문제: 미처리/미확인 문제만
      const problemCount = (s.unprocessed_store_problems || 0) + 
                          (s.unconfirmed_vending_problems || 0)
      
      // 분실물: 미확인 분실물만
      const lostItemCount = s.unconfirmed_lost_items || 0
      
      return sum + requestCount + problemCount + lostItemCount
    }, 0)

    const receivedCount = storeStatuses.reduce((sum, s) => sum + s.received_request_count, 0)
    const receivedSupplyCount = storeStatuses.reduce((sum, s) => sum + (s.received_supply_request_count || 0), 0)
    const inProgressSupplyCount = storeStatuses.reduce((sum, s) => sum + (s.in_progress_supply_request_count || 0), 0)
    return {
      total: storeStatuses.length,
      operating: storeStatuses.filter((s) => s.is_work_day).length,
      completed: storeStatuses.filter((s) => s.attendance_status === 'clocked_out').length,
      problem: problemCount,
      notifications: notificationCount,
      received: receivedCount,
      receivedSupply: receivedSupplyCount,
      inProgressSupply: inProgressSupplyCount,
    }
  }, [storeStatuses])

  const formatTimeAgo = (timeString: string | null) => {
    if (!timeString) return '정보 없음'
    const now = new Date()
    const time = new Date(timeString)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}일 전`
  }

  const getStatusLabel = (status: StoreStatus): string => {
    if (!status.is_work_day) return '휴무'
    if (status.attendance_status === 'clocked_out') return '퇴근완료'
    if (status.attendance_status === 'clocked_in') return '출근중'
    return '출근전'
  }

  const getStatusColor = (status: StoreStatus): string => {
    if (!status.is_work_day) return 'bg-gray-100 text-gray-700'
    if (status.attendance_status === 'clocked_out') return 'bg-green-100 text-green-700'
    if (status.attendance_status === 'clocked_in') return 'bg-orange-100 text-orange-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  const getTotalNotificationCount = (status: StoreStatus): number => {
    // 확인 처리되지 않은 항목만 카운트
    // 요청: 진행중 요청 + 미확인 완료/반려 요청
    const requestCount = status.in_progress_request_count + 
                        (status.unconfirmed_completed_request_count || 0) + 
                        (status.unconfirmed_rejected_request_count || 0)
    
    // 문제: 미처리/미확인 문제만
    const problemCount = (status.unprocessed_store_problems || 0) + 
                        (status.unconfirmed_vending_problems || 0)
    
    // 분실물: 미확인 분실물만
    const lostItemCount = status.unconfirmed_lost_items || 0
    
    return requestCount + problemCount + lostItemCount
  }

  // 전체 문제발생 데이터 로드
  const loadAllProblemsData = async () => {
    setLoadingAllProblems(true)
    const newData = new Map<string, { store_problems: any[]; vending_problems: any[]; lost_items: any[] }>()
    
    const problemStores = storeStatuses.filter((store) => store.has_problem)
    
    try {
      await Promise.all(
        problemStores.map(async (store) => {
          const timestamp = new Date().getTime()
          const [problemResponse, lostResponse] = await Promise.all([
            fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
              cache: 'no-store',
            }),
            fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
              cache: 'no-store',
            })
          ])
          
          const problemData = await problemResponse.json()
          const lostData = await lostResponse.json()
          
          if (problemResponse.ok && problemData.data) {
            newData.set(store.store_id, {
              store_problems: problemData.data.store_problems || [],
              vending_problems: problemData.data.vending_problems || [],
              lost_items: lostData.data || []
            })
          }
        })
      )
      setAllProblemsData(newData)
    } catch (error) {
      console.error('Error loading all problems data:', error)
    } finally {
      setLoadingAllProblems(false)
    }
  }

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (showAllProblemsModal) {
      const loadData = async () => {
        setLoadingAllProblems(true)
        const newData = new Map<string, { store_problems: any[]; vending_problems: any[]; lost_items: any[] }>()
        
        // 미확인 문제가 있는 매장만 필터링
        const problemStores = storeStatuses.filter((store) => {
          return store.has_problem && 
                 ((store.unprocessed_store_problems || 0) > 0 || 
                  (store.unconfirmed_vending_problems || 0) > 0 || 
                  (store.unconfirmed_lost_items || 0) > 0)
        })
        
        try {
          await Promise.all(
            problemStores.map(async (store) => {
              const timestamp = new Date().getTime()
              const [problemResponse, lostResponse] = await Promise.all([
                fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
                  cache: 'no-store',
                }),
                fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
                  cache: 'no-store',
                })
              ])
              
              const problemData = await problemResponse.json()
              const lostData = await lostResponse.json()
              
              if (problemResponse.ok && problemData.data) {
                newData.set(store.store_id, {
                  store_problems: problemData.data.store_problems || [],
                  vending_problems: problemData.data.vending_problems || [],
                  lost_items: lostData.data || []
                })
              }
            })
          )
          setAllProblemsData(newData)
        } catch (error) {
          console.error('Error loading all problems data:', error)
        } finally {
          setLoadingAllProblems(false)
        }
      }
      loadData()
    }
  }, [showAllProblemsModal, storeStatuses])

  // 알림 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (showAllNotificationsModal) {
      const loadData = async () => {
        setLoadingAllNotifications(true)
        const newData = new Map<string, {
          in_progress_requests: any[]
          completed_requests: any[]
          store_problems: any[]
          vending_problems: any[]
          lost_items: any[]
        }>()
        
        const notificationStores = storeStatuses.filter((store) => {
          // 확인 처리되지 않은 항목만 카운트
          const requestCount = store.in_progress_request_count + 
                              (store.unconfirmed_completed_request_count || 0) + 
                              (store.unconfirmed_rejected_request_count || 0)
          const problemCount = (store.unprocessed_store_problems || 0) + 
                              (store.unconfirmed_vending_problems || 0)
          const lostItemCount = store.unconfirmed_lost_items || 0
          const notificationCount = requestCount + problemCount + lostItemCount
          return notificationCount > 0
        })
        
        try {
          await Promise.all(
            notificationStores.map(async (store) => {
              const timestamp = new Date().getTime()
              const [requestResponse, problemResponse, lostResponse] = await Promise.all([
                fetch(`/api/business/stores/${store.store_id}/requests?t=${timestamp}`, {
                  cache: 'no-store',
                }),
                fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
                  cache: 'no-store',
                }),
                fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
                  cache: 'no-store',
                })
              ])
              
              const requestData = await requestResponse.json()
              const problemData = await problemResponse.json()
              const lostData = await lostResponse.json()
              
              if (requestResponse.ok && requestData.data) {
                newData.set(store.store_id, {
                  in_progress_requests: requestData.data.in_progress || [],
                  completed_requests: requestData.data.completed || [],
                  store_problems: problemData.data?.store_problems || [],
                  vending_problems: problemData.data?.vending_problems || [],
                  lost_items: lostData.data || []
                })
              }
            })
          )
          setAllNotificationsData(newData)
        } catch (error) {
          console.error('Error loading all notifications data:', error)
        } finally {
          setLoadingAllNotifications(false)
        }
      }
      loadData()
    }
  }, [showAllNotificationsModal, storeStatuses])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">매장 관리 현황</h1>
            <p className="text-gray-600 mt-1">실시간 매장별 업무 진행 상태를 확인하세요</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadStoreStatuses()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              전체 새로고침
            </button>
            <Link
              href="/business/dashboard"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              대시보드로
            </Link>
          </div>
        </div>
        {/* 알림 배너 */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-1 -right-1 text-red-500 text-xs">⚠</span>
            </div>
            <p className="text-sm text-blue-800 flex-1">
              <strong>새로고침을 해야 출근 상태가 정확합니다.</strong> 자동 새로고침은 30분마다 실행됩니다, 오전 8시부터 저녁 11시까지만 작동합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">전체 매장</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total} 곳</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">금일운영</div>
          <div className="text-2xl font-bold text-gray-900">{stats.completed} / {stats.operating} 곳</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">접수</div>
            <Link
              href="/business/supply-requests"
              className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded hover:bg-purple-600 transition-colors"
            >
              전부보기
            </Link>
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">요청 접수 건</span>
              <span className="text-xl font-bold text-blue-600">{stats.received}건</span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">물품요청 접수 건</span>
                <span className="text-xl font-bold text-purple-600">{stats.receivedSupply}건</span>
              </div>
              {stats.inProgressSupply > 0 && (
                <div className="flex items-center justify-end mt-1">
                  <span className="text-xs text-gray-500">
                    처리중 <span className="font-semibold text-purple-500">{stats.inProgressSupply}건</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {stats.received > 0 && (
              <button
                onClick={() => {
                  // 모든 매장의 접수 요청을 보여주는 모달 열기
                  setShowReceivedRequestsModal(true)
                  // 모든 매장의 접수 요청을 로드
                  loadAllReceivedRequests()
                }}
                className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
              >
                접수확인
              </button>
            )}
            {stats.receivedSupply > 0 && (
              <button
                onClick={() => loadAllReceivedSupplyRequests()}
                className="flex-1 px-3 py-1.5 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
              >
                물품요청란 접수확인
              </button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 mb-1">문제발생</div>
              {stats.problem > 0 && <span className="text-red-500">⚠️</span>}
            </div>
            {stats.problem > 0 && (
              <button
                onClick={() => setShowAllProblemsModal(true)}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              >
                전부보기
              </button>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.problem} 곳</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 mb-1">알림</div>
            {stats.notifications > 0 && (
              <button
                onClick={() => setShowAllNotificationsModal(true)}
                className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
              >
                전부보기
              </button>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.notifications} 곳</div>
        </div>
      </div>

      {/* 필터 버튼 + 날짜/전체요청 버튼 */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'operating', 'completed', 'in_progress', 'problem'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {filterType === 'all' && '전체'}
              {filterType === 'operating' && '금일 운영'}
              {filterType === 'completed' && '완료'}
              {filterType === 'in_progress' && '진행중'}
              {filterType === 'problem' && '문제발생'}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-gray-600">
          <div>오늘: {now}</div>
          <button
            onClick={() => {
              setBroadcastMode(true)
              setSelectedStore(null)
              setShowRequestCreateModal(true)
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            전체 요청접수
          </button>
        </div>
      </div>

      {/* 매장 목록 */}
      <div className="space-y-4">
        {filteredStores.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            표시할 매장이 없습니다.
          </div>
        ) : (
          <>
            {/* 펼친 매장들 (전체 너비) */}
            {filteredStores
              .filter((status) => expandedStores.has(status.store_id))
              .map((status) => {
                const totalProblems = status.store_problem_count + status.vending_problem_count + status.lost_item_count
                const hasRequests = status.received_request_count > 0 || (status.received_supply_request_count || 0) > 0 || status.in_progress_request_count > 0 || status.completed_request_count > 0 || status.rejected_request_count > 0
                const notificationCount = getTotalNotificationCount(status)
                const isExpanded = true
                
                return (
                  <div
                    key={status.store_id}
                    className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 mb-4 ${
                      !status.is_work_day
                        ? 'border-gray-300 opacity-60'
                        : status.has_problem
                        ? 'border-red-500'
                        : status.attendance_status === 'clocked_out'
                        ? 'border-green-500'
                        : 'border-blue-500'
                    }`}
                  >
                    {/* 펼친 상태: 기존 상세 정보 표시 */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{status.store_name}</h3>
                            <span 
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}
                              title={`출근상태: ${status.attendance_status}, 작업일: ${status.is_work_day ? '예' : '아니오'}`}
                            >
                              {getStatusLabel(status)}
                            </span>
                            {notificationCount > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                {notificationCount}
                              </span>
                            )}
                            {/* 접기 버튼 */}
                            <button
                              onClick={() => {
                                setExpandedStores((prev) => {
                                  const newSet = new Set(prev)
                                  newSet.delete(status.store_id)
                                  return newSet
                                })
                              }}
                              className="ml-auto px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                              title="접기"
                            >
                              ▲ 접기
                            </button>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {status.store_address && <span>{status.store_address}</span>}
                            {status.staff_name && (
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                {status.staff_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              {formatTimeAgo(status.last_update_time)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 전체 진행률 */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">전체 진행률</span>
                          <span className="text-sm font-bold text-blue-600">{status.checklist_completion_rate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              status.checklist_completion_rate >= 70 ? 'bg-blue-600' : 
                              status.checklist_completion_rate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${status.checklist_completion_rate}%` }}
                          ></div>
                        </div>
                      </div>
                      {/* 상세 정보 (4개 컬럼) */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        {/* 관리전후 상태 */}
                        <div
                          onClick={() => {
                            setSelectedStore(status)
                            setShowBeforeAfterModal(true)
                          }}
                          className="border rounded-lg p-4 cursor-pointer transition-colors border-gray-200 hover:bg-gray-50"
                        >
                          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <span>📸</span>
                            <span>관리전후 상태</span>
                          </h3>
                          <div className="space-y-2">
                            {status.before_after_photos && status.before_after_photos.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                  <span className="text-sm text-gray-900 font-semibold">관리전후 사진</span>
                                  <span className="text-sm font-semibold text-gray-900 ml-auto">
                                    {status.before_after_photos.length}건
                                  </span>
                                </div>
                                {/* 썸네일 2개만 표시 */}
                                <div className="flex items-center gap-1 mt-2">
                                  {status.before_after_photos.slice(0, 2).map((photo, idx) => {
                                    // 관리후 사진 우선, 없으면 관리전 사진
                                    const thumbnailUrl = photo.after_photo_url || photo.before_photo_url
                                    if (thumbnailUrl) {
                                      return (
                                        <img
                                          key={photo.id}
                                          src={thumbnailUrl}
                                          alt={photo.area}
                                          className="w-8 h-8 object-cover rounded"
                                        />
                                      )
                                    }
                                    return null
                                  })}
                                  {status.before_after_photos.length > 2 && (
                                    <span className="text-xs text-gray-600 ml-1">
                                      +{status.before_after_photos.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">관리전후 사진</span>
                                <span className="text-sm font-semibold text-gray-400">없음</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 제품입고 및 보관 상태 */}
                        <div
                          onClick={() => handleOpenInventoryModal(status)}
                          className="border rounded-lg p-4 cursor-pointer transition-colors border-gray-200 hover:bg-gray-50"
                        >
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <span>📦</span>
                      <span>제품 입고 및 보관 상태</span>
                    </h3>
                    <div className="space-y-2">
                      {status.has_product_inflow_today && (
                        <div className="space-y-1 bg-green-50 rounded p-2 -mx-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm text-gray-900 font-semibold">오늘 제품 입고</span>
                            <span className="text-sm font-semibold text-gray-900 ml-auto">있음</span>
                          </div>
                        </div>
                      )}
                      {!status.has_product_inflow_today && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">오늘 제품 입고</span>
                          <span className="text-sm font-semibold text-gray-400">없음</span>
                        </div>
                      )}
                      {status.storage_photos && status.storage_photos.length > 0 ? (
                        <div className="space-y-1 bg-blue-50 rounded p-2 -mx-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm text-gray-900 font-semibold">보관 사진</span>
                            <div className="ml-auto flex items-center gap-1">
                              {status.storage_photos.slice(0, 2).map((photo) => (
                                <img
                                  key={photo.id}
                                  src={photo.photo_url}
                                  alt="보관 사진"
                                  className="w-8 h-8 object-cover rounded"
                                />
                              ))}
                              {status.storage_photos.length > 2 && (
                                <span className="text-xs text-gray-600 ml-1">
                                  +{status.storage_photos.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">보관 사진</span>
                          <span className="text-sm font-semibold text-gray-400">없음</span>
                        </div>
                      )}
                      </div>
                    </div>

                    {/* 매장 상황 */}
                      <div
                        onClick={() => handleOpenProblemModal(status)}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          totalProblems > 0
                            ? 'border-gray-200 hover:bg-gray-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>매장 상황</span>
                    </h3>
                    <div className="space-y-2">
                      {status.store_problem_count > 0 && (
                        <div className="space-y-1 bg-red-50 rounded p-2 -mx-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm text-gray-900 font-semibold">매장 문제 보고</span>
                            <span className="text-sm font-semibold text-gray-900 ml-auto">
                              {status.store_problem_count}건
                            </span>
                          </div>
                          <div className="pl-4 text-xs text-gray-600">
                            미처리 <span className="font-semibold text-red-600">{status.unprocessed_store_problems}</span>건 / 
                            처리 완료 <span className="font-semibold text-green-600">{status.completed_store_problems}</span>건
                          </div>
                        </div>
                      )}
                      {status.vending_problem_count > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm text-gray-700">자판기 내부 문제</span>
                            <span className="text-sm font-semibold text-gray-900 ml-auto">
                              {status.vending_problem_count}건
                            </span>
                          </div>
                          <div className="pl-4 text-xs text-gray-600">
                            미확인 <span className="font-semibold text-red-600">{status.unconfirmed_vending_problems}</span>건 / 
                            확인 <span className="font-semibold text-green-600">{status.confirmed_vending_problems}</span>건
                          </div>
                        </div>
                      )}
                      {status.lost_item_count > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm text-gray-700">분실물 습득</span>
                            <span className="text-sm font-semibold text-gray-900 ml-auto">
                              {status.lost_item_count}건
                            </span>
                          </div>
                          <div className="pl-4 text-xs text-gray-600">
                            미확인 <span className="font-semibold text-red-600">{status.unconfirmed_lost_items}</span>건 / 
                            확인 <span className="font-semibold text-green-600">{status.confirmed_lost_items}</span>건
                          </div>
                        </div>
                      )}
                      {totalProblems === 0 && (
                        <p className="text-sm text-gray-500">문제 없음</p>
                      )}
                      </div>
                    </div>

                    {/* 요청란 상황 */}
                    <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">
                        요청란 상황
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStore(status)
                          setBroadcastMode(false)
                          setShowRequestCreateModal(true)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        요청접수
                      </button>
                    </div>
                    <div className="space-y-3">
                      {/* 접수 */}
                      {(status.received_request_count > 0 || (status.received_supply_request_count || 0) > 0) && (
                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                          {status.received_request_count > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">요청 접수 건 {status.received_request_count}개</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewReceivedRequests(status.store_id)
                                }}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                              >
                                접수확인
                              </button>
                            </div>
                          )}
                          {(status.received_supply_request_count || 0) > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">물품요청 접수 건 {status.received_supply_request_count}개</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  loadAllReceivedSupplyRequests()
                                }}
                                className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                              >
                                물품요청란 접수확인
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 처리중 */}
                      {status.in_progress_request_count > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">처리중</span>
                          <span className="text-sm font-semibold text-orange-600">
                            {status.in_progress_request_count}건
                          </span>
                        </div>
                      )}
                      
                      {/* 반려처리 */}
                      {(() => {
                        // 클라이언트에서 확인된 반려처리 항목 제외
                        const rejectedRequests = storeCompletedRequests.get(status.store_id) || []
                        const unconfirmedRejected = rejectedRequests.filter((r: any) => {
                          if (r.status !== 'rejected') return false
                          const confirmedDate = confirmedRequestDates.get(r.id)
                          if (!confirmedDate) {
                            return !confirmedRequestIds.has(r.id)
                          }
                          return false // 확인된 항목은 제외
                        })
                        return unconfirmedRejected.length > 0 ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">반려처리</span>
                              <span className="text-sm font-semibold text-red-600">
                                {unconfirmedRejected.length}건
                              </span>
                            </div>
                          </div>
                        ) : null
                      })()}
                      
                      {/* 처리완료 */}
                      {(() => {
                        // 해당 매장의 처리완료 요청 목록 가져오기
                        const completedRequests = storeCompletedRequests.get(status.store_id) || []
                        // 확인되지 않은 항목만 필터링 (오늘 확인한 것도 제외)
                        const unconfirmedRequests = completedRequests.filter((r: any) => {
                          if (r.status !== 'completed') return false
                          const confirmedDate = confirmedRequestDates.get(r.id)
                          if (!confirmedDate) {
                            return !confirmedRequestIds.has(r.id)
                          }
                          return false // 확인된 항목은 제외
                        })
                        
                        return unconfirmedRequests.length > 0 ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">처리완료</span>
                              <span className="text-sm font-semibold text-green-600">
                                {unconfirmedRequests.length}건
                              </span>
                            </div>
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="space-y-2 mt-2"
                            >
                              {(() => {
                                if (unconfirmedRequests.length === 0) {
                                  return null
                                }
                                
                                // 3건 이상일 때는 안내 메시지 표시
                                if (unconfirmedRequests.length >= 3) {
                                  return (
                                    <div className="border rounded p-3 bg-blue-50 border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-700 font-medium mb-1">
                                            확인 안된 처리완료 항목이 {unconfirmedRequests.length}건 있습니다.
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            전체 보기에서 확인하실 수 있습니다.
                                          </p>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleOpenRequestModal(status)
                                          }}
                                          className="ml-3 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex-shrink-0 whitespace-nowrap"
                                        >
                                          전체 보기
                                        </button>
                                      </div>
                                    </div>
                                  )
                                }
                                
                                // 2건 이하일 때는 개별 항목 표시
                                return unconfirmedRequests.map((request: any) => {
                                  const confirmedDate = confirmedRequestDates.get(request.id)
                                  const isConfirmedToday = confirmedDate && isToday(confirmedDate)
                                  
                                  return (
                                    <div
                                      key={request.id}
                                      className={`border rounded p-2 text-xs ${
                                        isConfirmedToday ? 'opacity-60 bg-gray-50' : 'bg-white'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-700 flex-1 truncate mr-2">
                                          -{request.title}
                                        </span>
                                        {!isConfirmedToday && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleConfirmRequest(request.id)
                                              // 확인 후 해당 매장의 요청 목록 다시 로드
                                              setTimeout(() => {
                                                loadStoreCompletedRequests(status.store_id)
                                              }, 500)
                                            }}
                                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                                          >
                                            확인
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                            </div>
                          </div>
                        ) : null
                      })()}
                      
                      {!hasRequests && (
                        <p className="text-sm text-gray-500">요청 없음</p>
                      )}
                    </div>
                    {hasRequests && (
                      <div
                        onClick={() => handleOpenRequestModal(status)}
                        className="mt-3 text-center text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        전체 보기 →
                      </div>
                    )}
                    </div>
                  </div>

                    {/* 매장 상세 링크 */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Link
                        href={`/business/stores/${status.store_id}/detail`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        매장 상세 보기 →
                      </Link>
                    </div>
                  </div>
                )
                })}

            {/* 접힌 매장들 (그리드 레이아웃) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredStores
                .filter((status) => !expandedStores.has(status.store_id))
                .map((status) => {
                  // 매장상황 건수: 미처리/미확인 항목들의 합계
                  const storeSituationCount = (status.unprocessed_store_problems || 0) + 
                                             (status.unconfirmed_vending_problems || 0) + 
                                             (status.unconfirmed_lost_items || 0)
                  
                  return (
                    <div
                      key={status.store_id}
                      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 p-4 ${
                        !status.is_work_day
                          ? 'border-gray-300 opacity-60'
                          : status.has_problem
                          ? 'border-red-500'
                          : status.attendance_status === 'clocked_out'
                          ? 'border-green-500'
                          : 'border-blue-500'
                      }`}
                    >
                      {/* 접힌 상태: 간략 정보만 표시 */}
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          setExpandedStores((prev) => {
                            const newSet = new Set(prev)
                            newSet.add(status.store_id)
                            return newSet
                          })
                        }}
                      >
                        <div className="flex flex-col gap-2">
                          {/* 매장 이름 */}
                          <h3 className="text-base font-bold text-gray-900 truncate" title={status.store_name}>
                            {status.store_name}
                          </h3>
                          {/* 출근상태 */}
                          <div className="flex items-center gap-2">
                            <span 
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}
                            >
                              {getStatusLabel(status)}
                            </span>
                          </div>
                          {/* 매장상황 건수 */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">매장상황:</span>
                            <span className={`text-xs font-semibold ${
                              storeSituationCount > 0 ? 'text-red-600' : 'text-gray-400'
                            }`}>
                              {storeSituationCount}건
                            </span>
                          </div>
                          {/* 펼치기 아이콘 */}
                          <div className="flex justify-end mt-1">
                            <span className="text-gray-400 text-xs">▼ 펼치기</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </div>

      {/* 관리전후 사진 모달 */}
      {showBeforeAfterModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowBeforeAfterModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedStore.store_name} - 관리전후 상태</h2>
              <button onClick={() => setShowBeforeAfterModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-6">
              {selectedStore.before_after_photos && selectedStore.before_after_photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStore.before_after_photos.map((photo) => (
                    <div key={photo.id} className="border rounded-lg overflow-hidden">
                      <div className="p-3 bg-gray-50 border-b">
                        <h4 className="text-sm font-semibold text-gray-700">{photo.area || '구역 미지정'}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-3">
                        {photo.before_photo_url ? (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">관리전</p>
                            <img
                              src={photo.before_photo_url}
                              alt="관리전"
                              className="w-full h-48 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => {
                                // 모든 관리전후 사진을 배열로 만들기
                                const allPhotos: Array<{ url: string; area: string; type: 'before' | 'after' }> = []
                                selectedStore.before_after_photos?.forEach((p) => {
                                  if (p.before_photo_url) {
                                    allPhotos.push({ url: p.before_photo_url, area: p.area, type: 'before' })
                                  }
                                  if (p.after_photo_url) {
                                    allPhotos.push({ url: p.after_photo_url, area: p.area, type: 'after' })
                                  }
                                })
                                const currentIndex = allPhotos.findIndex(p => p.url === photo.before_photo_url)
                                setSelectedImageInfo({
                                  url: photo.before_photo_url,
                                  area: photo.area || '구역 미지정',
                                  type: 'before',
                                  allPhotos,
                                  currentIndex: currentIndex >= 0 ? currentIndex : 0,
                                })
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-48 bg-gray-100 rounded">
                            <span className="text-xs text-gray-400">관리전 사진 없음</span>
                          </div>
                        )}
                        {photo.after_photo_url ? (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">관리후</p>
                            <img
                              src={photo.after_photo_url}
                              alt="관리후"
                              className="w-full h-48 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => {
                                // 모든 관리전후 사진을 배열로 만들기
                                const allPhotos: Array<{ url: string; area: string; type: 'before' | 'after' }> = []
                                selectedStore.before_after_photos?.forEach((p) => {
                                  if (p.before_photo_url) {
                                    allPhotos.push({ url: p.before_photo_url, area: p.area, type: 'before' })
                                  }
                                  if (p.after_photo_url) {
                                    allPhotos.push({ url: p.after_photo_url, area: p.area, type: 'after' })
                                  }
                                })
                                const currentIndex = allPhotos.findIndex(p => p.url === photo.after_photo_url)
                                setSelectedImageInfo({
                                  url: photo.after_photo_url,
                                  area: photo.area || '구역 미지정',
                                  type: 'after',
                                  allPhotos,
                                  currentIndex: currentIndex >= 0 ? currentIndex : 0,
                                })
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-48 bg-gray-100 rounded">
                            <span className="text-xs text-gray-400">관리후 사진 없음</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">관리전후 사진이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 제품 입고 및 보관 사진 모달 */}
      {showInventoryModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInventoryModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedStore.store_name} - 제품입고 및 보관 상태</h2>
              <button onClick={() => setShowInventoryModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* 오늘 제품 입고 */}
              <div>
                <h3 className="text-lg font-medium mb-3">오늘 제품 입고</h3>
                {inventoryPhotos.product_inflow.length === 0 ? (
                  <p className="text-gray-500">제품 입고 사진이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {inventoryPhotos.product_inflow.map((photo) => (
                      <div key={photo.id} className="border rounded-lg overflow-hidden">
                        <img
                          src={photo.photo_url}
                          alt={photo.photo_type}
                          className="w-full h-48 object-cover cursor-pointer"
                          onClick={() => setSelectedImage(photo.photo_url)}
                        />
                        <div className="p-2 text-sm text-gray-600">
                          제품 입고
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 보관 사진 */}
              <div>
                <h3 className="text-lg font-medium mb-3">보관 사진</h3>
                {inventoryPhotos.storage.length === 0 ? (
                  <p className="text-gray-500">보관 사진이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {inventoryPhotos.storage.map((photo) => (
                      <div key={photo.id} className="border rounded-lg overflow-hidden">
                        <img
                          src={photo.photo_url}
                          alt={photo.photo_type}
                          className="w-full h-48 object-cover cursor-pointer"
                          onClick={() => setSelectedImage(photo.photo_url)}
                        />
                        <div className="p-2 text-sm text-gray-600">
                          보관 사진
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 매장 상황 모달 */}
      {showProblemModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowProblemModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedStore.store_name} - 매장 상황</h2>
              <button onClick={() => setShowProblemModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            {loadingProblemModal ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-lg">데이터를 불러오는 중...</p>
              </div>
            ) : (
              <div className="space-y-6">
              {/* 매장 문제 보고 */}
              <div>
                <button
                  onClick={() => setExpandedSections((prev) => ({ ...prev, storeProblems: !prev.storeProblems }))}
                  className="flex items-center justify-between w-full text-left mb-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-red-700">매장 문제 보고</h3>
                    {!expandedSections.storeProblems && (
                      <span className="text-sm font-semibold text-red-600 bg-white px-3 py-1 rounded-full">
                        {problemReports.store_problems.filter((p) => p.status !== 'completed').length}건
                      </span>
                    )}
                  </div>
                  <span className="text-red-500 text-lg">
                    {expandedSections.storeProblems ? '▼' : '▶'}
                  </span>
                </button>
                {expandedSections.storeProblems && (
                  <>
                    {problemReports.store_problems.length === 0 ? (
                      <p className="text-gray-500">매장 문제 보고 내역이 없습니다.</p>
                    ) : (
                      <div className="space-y-4">
                    {/* 미처리 항목 */}
                    {problemReports.store_problems
                      .filter((p) => p.status !== 'completed')
                      .map((problem) => {
                        // description에서 원본 내용만 추출
                        const originalDescription = problem.description?.split('\n\n[처리 완료]')[0] || problem.description
                        const originalPhotos = problem.photo_url ? getPhotoUrls(problem.photo_url) : []
                        
                        return (
                          <div key={problem.id} className="border-2 border-red-300 bg-red-50 rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                {/* 카테고리 */}
                                <div className="mb-3">
                                  <span className="inline-block px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-md">
                                    {problem.title?.replace(/^매장 문제:\s*/, '') || problem.title}
                                  </span>
                                </div>
                                
                                {/* 설명란 - 원본 내용만 */}
                                {originalDescription && (
                                  <div className="mb-3 p-3 bg-white border border-red-200 rounded-md">
                                    <p className="text-base text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                                      {originalDescription}
                                    </p>
                                  </div>
                                )}
                                
                                {/* 사진 - 원본 사진만 */}
                                {originalPhotos.length > 0 && (
                                  <div className="mt-3">
                                    <div className="flex flex-wrap gap-2">
                                      {originalPhotos.map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={url}
                                          alt={`${problem.title} 사진 ${idx + 1}`}
                                          className="w-32 h-32 object-cover rounded-lg border-2 border-red-200 cursor-pointer hover:border-red-400 transition-colors shadow-sm"
                                          onClick={() => setSelectedImage(url)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 작성 시간 */}
                                <p className="text-xs text-gray-500 mt-3">
                                  {new Date(problem.created_at).toLocaleString('ko-KR')}
                                </p>
                              </div>
                              
                              {/* 처리 완료 버튼 */}
                              <button
                                onClick={() => setShowCompletionForm(problem.id)}
                                className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                처리 완료
                              </button>
                            </div>
                            
                            {showCompletionForm === problem.id && (
                              <div className="mt-4 p-4 bg-white border border-red-200 rounded-lg space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    처리 완료 설명
                                  </label>
                                  <textarea
                                    value={completionDescription}
                                    onChange={(e) => setCompletionDescription(e.target.value)}
                                    placeholder="처리 완료 설명을 입력하세요"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    사진 첨부
                                  </label>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || [])
                                      const filePromises = files.map((file) => {
                                        // 파일 크기 체크 (5MB)
                                        if (file.size > 5 * 1024 * 1024) {
                                          alert('파일 크기는 5MB 이하여야 합니다.')
                                          return null
                                        }
                                        return new Promise<string | null>((resolve) => {
                                          const reader = new FileReader()
                                          reader.onload = (event) => {
                                            resolve(event.target?.result as string)
                                          }
                                          reader.onerror = () => resolve(null)
                                          reader.readAsDataURL(file)
                                        })
                                      })
                                      Promise.all(filePromises).then((urls) => {
                                        const validUrls = urls.filter((url): url is string => url !== null)
                                        setCompletionPhotos((prev) => [...prev, ...validUrls])
                                      })
                                      // input 초기화
                                      if (e.target) {
                                        e.target.value = ''
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  />
                                  <p className="mt-1 text-xs text-gray-500">여러 사진을 선택할 수 있습니다 (최대 5MB)</p>
                                  {completionPhotos.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {completionPhotos.map((url, idx) => (
                                        <div key={idx} className="relative">
                                          <img
                                            src={url}
                                            alt={`처리 완료 사진 ${idx + 1}`}
                                            className="w-20 h-20 object-cover rounded"
                                          />
                                          <button
                                            onClick={() => {
                                              setCompletionPhotos((prev) => prev.filter((_, i) => i !== idx))
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCompleteStoreProblem(problem.id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    완료
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowCompletionForm(null)
                                      setCompletionDescription('')
                                      setCompletionPhotos([])
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    
                    {/* 완료된 항목 - 아래로 이동하고 연하게 표시 (24시간 이내만 표시) */}
                    {problemReports.store_problems
                      .filter((p) => {
                        if (p.status !== 'completed') return false
                        // 처리 완료 후 24시간 이내만 표시
                        if (p.updated_at) {
                          const completedTime = new Date(p.updated_at).getTime()
                          const now = new Date().getTime()
                          const hours24 = 24 * 60 * 60 * 1000
                          return (now - completedTime) <= hours24
                        }
                        // updated_at이 없으면 created_at 기준으로 24시간 체크
                        const createdTime = new Date(p.created_at).getTime()
                        const now = new Date().getTime()
                        const hours24 = 24 * 60 * 60 * 1000
                        return (now - createdTime) <= hours24
                      })
                      .map((problem) => {
                        // description에서 원본과 처리 완료 내용 분리
                        const descriptionParts = problem.description?.split('\n\n[처리 완료]') || []
                        const originalDescription = descriptionParts[0] || ''
                        const completionDescription = descriptionParts[1] || ''
                        
                        // 전체 사진
                        const allPhotos = problem.photo_url ? getPhotoUrls(problem.photo_url) : []
                        
                        return (
                          <div key={problem.id} className="border border-gray-300 bg-gray-50 rounded-lg p-4 opacity-60">
                            <div className="flex-1">
                              {/* 카테고리와 처리 완료 배지 */}
                              <div className="mb-3 flex items-center gap-2 flex-wrap">
                                <span className="inline-block px-3 py-1 bg-gray-400 text-white text-sm font-semibold rounded-md">
                                  {problem.title?.replace(/^매장 문제:\s*/, '') || problem.title}
                                </span>
                                <span className="inline-block px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md">
                                  처리 완료
                                </span>
                              </div>
                              
                              {/* 원본 문제 보고 내용 */}
                              {originalDescription && (
                                <div className="mb-3 p-3 bg-white border border-gray-200 rounded-md">
                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {originalDescription}
                                  </p>
                                </div>
                              )}
                              
                              {/* 전체 사진 */}
                              {allPhotos.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex flex-wrap gap-2">
                                    {allPhotos.map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`${problem.title} 사진 ${idx + 1}`}
                                        className="w-24 h-24 object-cover rounded-lg border border-gray-300 cursor-pointer opacity-70"
                                        onClick={() => setSelectedImage(url)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* 구분선 */}
                              {completionDescription && (
                                <>
                                  <div className="my-4 border-t border-gray-300"></div>
                                  
                                  {/* 처리 완료 내용 */}
                                  <div className="mb-3">
                                    <p className="text-xs text-gray-500 mb-2 font-semibold">처리 완료</p>
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {completionDescription}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              )}
                              
                              {/* 작성 시간 및 처리 완료 시간 */}
                              <div className="mt-3 space-y-1">
                                <p className="text-xs text-gray-400">
                                  작성: {new Date(problem.created_at).toLocaleString('ko-KR')}
                                </p>
                                {problem.updated_at && problem.updated_at !== problem.created_at && (
                                  <p className="text-xs text-green-600">
                                    처리 완료: {new Date(problem.updated_at).toLocaleString('ko-KR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 자판기 내부 문제 */}
              <div>
                <button
                  onClick={() => setExpandedSections((prev) => ({ ...prev, vendingProblems: !prev.vendingProblems }))}
                  className="flex items-center justify-between w-full text-left mb-3 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-orange-700">자판기 내부 문제</h3>
                    {!expandedSections.vendingProblems && (
                      <span className="text-sm font-semibold text-orange-600 bg-white px-3 py-1 rounded-full">
                        {problemReports.vending_problems.filter((p) => p.status !== 'completed').length}건
                      </span>
                    )}
                  </div>
                  <span className="text-orange-500 text-lg">
                    {expandedSections.vendingProblems ? '▼' : '▶'}
                  </span>
                </button>
                {expandedSections.vendingProblems && (
                  <>
                    {problemReports.vending_problems.length === 0 ? (
                      <p className="text-gray-500">자판기 내부 문제 내역이 없습니다.</p>
                    ) : (
                      <div className="space-y-4">
                    {/* 미확인 항목 */}
                    {problemReports.vending_problems
                      .filter((p) => p.status !== 'completed')
                      .map((problem) => (
                        <div key={problem.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{problem.title}</h4>
                              {problem.description && (
                                <p className="text-sm text-gray-600 mt-1">{problem.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(problem.created_at).toLocaleString('ko-KR')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleConfirmProblem(problem.id)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              확인
                            </button>
                          </div>
                          {problem.photo_url && (
                            <div className="mt-2">
                              {getPhotoUrls(problem.photo_url).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`${problem.title} 사진 ${idx + 1}`}
                                  className="w-32 h-32 object-cover rounded cursor-pointer mr-2"
                                  onClick={() => setSelectedImage(url)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    
                    {/* 확인된 항목 - 연하게 표시 */}
                    {problemReports.vending_problems
                      .filter((p) => p.status === 'completed')
                      .map((problem) => (
                        <div key={problem.id} className="border border-gray-300 bg-gray-50 rounded-lg p-4 opacity-60">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-700">{problem.title}</h4>
                                <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                                  확인 완료
                                </span>
                              </div>
                              {problem.description && (
                                <p className="text-sm text-gray-600 mt-1">{problem.description}</p>
                              )}
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-400">
                                  작성: {new Date(problem.created_at).toLocaleString('ko-KR')}
                                </p>
                                {problem.updated_at && problem.updated_at !== problem.created_at && (
                                  <p className="text-xs text-green-600">
                                    확인: {new Date(problem.updated_at).toLocaleString('ko-KR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {problem.photo_url && (
                            <div className="mt-2">
                              {getPhotoUrls(problem.photo_url).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`${problem.title} 사진 ${idx + 1}`}
                                  className="w-24 h-24 object-cover rounded cursor-pointer mr-2 opacity-70"
                                  onClick={() => setSelectedImage(url)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 분실물 습득 */}
              <div>
                <button
                  onClick={() => setExpandedSections((prev) => ({ ...prev, lostItems: !prev.lostItems }))}
                  className="flex items-center justify-between w-full text-left mb-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-blue-700">분실물 습득</h3>
                    {!expandedSections.lostItems && (
                      <span className="text-sm font-semibold text-blue-600 bg-white px-3 py-1 rounded-full">
                        {lostItems.filter((item) => item.status !== 'completed' && !confirmedLostItemIds.has(item.id)).length}건
                      </span>
                    )}
                  </div>
                  <span className="text-blue-500 text-lg">
                    {expandedSections.lostItems ? '▼' : '▶'}
                  </span>
                </button>
                {expandedSections.lostItems && (
                  <>
                    {lostItems.length === 0 ? (
                      <p className="text-gray-500">분실물 습득 내역이 없습니다.</p>
                    ) : (
                      <div className="space-y-4">
                        {/* 미확인 항목 */}
                        {lostItems
                          .filter((item) => item.status !== 'completed' && !confirmedLostItemIds.has(item.id))
                          .map((item) => (
                        <div key={item.id} className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              {/* 카테고리 배지 - description에서 카테고리 추출 */}
                              <div className="mb-3">
                                {(() => {
                                  // description에서 [카테고리: ...] 패턴 추출
                                  const categoryMatch = item.description?.match(/\[카테고리:\s*(.+?)\]/)
                                  const category = categoryMatch ? categoryMatch[1] : item.type
                                  return (
                                    <span className="inline-block px-4 py-2 bg-blue-600 text-white text-base font-semibold rounded-md shadow-sm">
                                      {category}
                                    </span>
                                  )
                                })()}
                              </div>
                              
                              {/* 보관장소 - 별도 표시 */}
                              {item.storage_location && (
                                <div className="mb-3 p-3 bg-white border-2 border-blue-200 rounded-md shadow-sm">
                                  <p className="text-sm font-semibold text-gray-700 mb-1">보관장소</p>
                                  <p className="text-base text-gray-800 font-medium">
                                    {item.storage_location}
                                  </p>
                                </div>
                              )}
                              
                              {/* 설명란 - 카테고리와 보관장소 제외한 나머지 설명 */}
                              {item.description && (() => {
                                // [카테고리: ...] 제거
                                let cleanDescription = item.description.replace(/\[카테고리:.*?\]\s*/g, '').trim()
                                // 보관장소:로 시작하는 라인 제거 (이미 별도로 표시하므로)
                                cleanDescription = cleanDescription.split('\n')
                                  .filter(line => !line.trim().startsWith('보관장소:'))
                                  .join('\n')
                                  .trim()
                                return cleanDescription ? (
                                  <div className="mb-3 p-4 bg-white border-2 border-blue-200 rounded-md shadow-sm">
                                    <p className="text-base text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                                      {cleanDescription}
                                    </p>
                                  </div>
                                ) : null
                              })()}
                              
                              {/* 사진 - 크기 증가 및 시각성 향상 */}
                              {item.photo_url && (
                                <div className="mt-4">
                                  <div className="flex flex-wrap gap-3">
                                    {getPhotoUrls(item.photo_url).map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`${item.type} 사진 ${idx + 1}`}
                                        className="w-40 h-40 object-cover rounded-lg border-2 border-blue-200 cursor-pointer hover:border-blue-400 transition-colors shadow-md hover:shadow-lg"
                                        onClick={() => setSelectedImage(url)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* 작성 시간 */}
                              <p className="text-xs text-gray-500 mt-4">
                                {new Date(item.created_at).toLocaleString('ko-KR')}
                              </p>
                            </div>
                            
                            {/* 확인 버튼 */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('Confirm button clicked for item:', item.id)
                                handleConfirmLostItem(item.id)
                              }}
                              className="ml-4 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors shadow-sm"
                            >
                              확인
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* 확인된 항목 - 연하게 표시 */}
                      {lostItems
                        .filter((item) => item.status === 'completed' || confirmedLostItemIds.has(item.id))
                        .map((item) => (
                          <div key={item.id} className="border-2 border-gray-300 bg-gray-50 rounded-lg p-4 opacity-60">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                {/* 카테고리 배지 */}
                                <div className="mb-3">
                                  {(() => {
                                    const categoryMatch = item.description?.match(/\[카테고리:\s*(.+?)\]/)
                                    const category = categoryMatch ? categoryMatch[1] : item.type
                                    return (
                                      <span className="inline-block px-4 py-2 bg-gray-400 text-white text-base font-semibold rounded-md shadow-sm">
                                        {category}
                                      </span>
                                    )
                                  })()}
                                </div>
                                
                                {/* 보관장소 */}
                                {item.storage_location && (
                                  <div className="mb-3 p-3 bg-white border-2 border-gray-200 rounded-md shadow-sm">
                                    <p className="text-sm font-semibold text-gray-700 mb-1">보관장소</p>
                                    <p className="text-base text-gray-800 font-medium">
                                      {item.storage_location}
                                    </p>
                                  </div>
                                )}
                                
                                {/* 설명란 */}
                                {item.description && (() => {
                                  let cleanDescription = item.description.replace(/\[카테고리:.*?\]\s*/g, '').trim()
                                  cleanDescription = cleanDescription.split('\n')
                                    .filter(line => !line.trim().startsWith('보관장소:'))
                                    .join('\n')
                                    .trim()
                                  return cleanDescription ? (
                                    <div className="mb-3 p-4 bg-white border-2 border-gray-200 rounded-md shadow-sm">
                                      <p className="text-base text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                                        {cleanDescription}
                                      </p>
                                    </div>
                                  ) : null
                                })()}
                                
                                {/* 사진 */}
                                {item.photo_url && (
                                  <div className="mt-4">
                                    <div className="flex flex-wrap gap-3">
                                      {getPhotoUrls(item.photo_url).map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={url}
                                          alt={`${item.type} 사진 ${idx + 1}`}
                                          className="w-40 h-40 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-400 transition-colors shadow-md opacity-70"
                                          onClick={() => setSelectedImage(url)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 작성 시간 및 확인 시간 */}
                                <div className="mt-4 space-y-1">
                                  <p className="text-xs text-gray-500">
                                    작성: {new Date(item.created_at).toLocaleString('ko-KR')}
                                  </p>
                                  {(item.status === 'completed' || confirmedLostItemIds.has(item.id)) && item.updated_at && (
                                    <p className="text-xs text-green-600 font-medium">
                                      확인: {new Date(item.updated_at).toLocaleString('ko-KR')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* 확인 완료 배지 */}
                              <div className="ml-4 flex items-start">
                                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-md">
                                  확인 완료
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
              )}
          </div>
        </div>
      )}

      {/* 요청란 상황 모달 */}
      {showRequestModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedStore.store_name} - 요청란 상황</h2>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-6">
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">요청란을 불러오는 중...</span>
                </div>
              ) : (
                <>
                  {/* 접수 */}
                  {requests.received && requests.received.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">접수</h3>
                  <div className="space-y-4">
                    {requests.received.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        {editingRequestId === request.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                카테고리
                              </label>
                              <select
                                value={requestFormData.category}
                                onChange={(e) => setRequestFormData({ ...requestFormData, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="">선택하세요</option>
                                <option value="제품 관련 요청">제품 관련 요청</option>
                                <option value="자판기 관련 요청">자판기 관련 요청</option>
                                <option value="무인 택배함 관련">무인 택배함 관련</option>
                                <option value="매장 시설/청결 관련">매장 시설/청결 관련</option>
                                <option value="운영 관련">운영 관련</option>
                                <option value="기타">기타</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                요청 내용
                              </label>
                              <textarea
                                value={requestFormData.description}
                                onChange={(e) => setRequestFormData({ ...requestFormData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                사진 첨부
                              </label>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || [])
                                  const filePromises = files.map((file) => {
                                    if (file.size > 5 * 1024 * 1024) {
                                      alert('파일 크기는 5MB 이하여야 합니다.')
                                      return null
                                    }
                                    return new Promise<string | null>((resolve) => {
                                      const reader = new FileReader()
                                      reader.onload = (event) => {
                                        resolve(event.target?.result as string)
                                      }
                                      reader.onerror = () => resolve(null)
                                      reader.readAsDataURL(file)
                                    })
                                  })
                                  Promise.all(filePromises).then((urls) => {
                                    const validUrls = urls.filter((url): url is string => url !== null)
                                    setRequestPhotos((prev) => [...prev, ...validUrls])
                                  })
                                  if (e.target) {
                                    e.target.value = ''
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                              {requestPhotos.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {requestPhotos.map((url, idx) => (
                                    <div key={idx} className="relative">
                                      <img
                                        src={url}
                                        alt={`요청 사진 ${idx + 1}`}
                                        className="w-20 h-20 object-cover rounded"
                                      />
                                      <button
                                        onClick={() => {
                                          setRequestPhotos((prev) => prev.filter((_, i) => i !== idx))
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateRequest(request.id)}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRequestId(null)
                                  setRequestFormData({ category: '', description: '', photos: [] })
                                  setRequestPhotos([])
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{request.title}</h4>
                                  {request.created_by_user?.role === 'store_manager' && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                      (점주 직접 요청)
                                    </span>
                                  )}
                                </div>
                                {request.description && (
                                  <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(request.created_at).toLocaleString('ko-KR')}
                                </p>
                                {request.photo_url && (
                                  <div className="mt-2">
                                    <div className="flex flex-wrap gap-2">
                                      {getPhotoUrls(request.photo_url).map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={url}
                                          alt={`${request.title} 사진 ${idx + 1}`}
                                          className="w-32 h-32 object-cover rounded cursor-pointer"
                                          onClick={() => setSelectedImage(url)}
                                          onError={(e) => {
                                            console.error('Image load error:', url)
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveRequest(request.id)}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                  처리중으로 변경
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRequestId(request.id)
                                    setRequestFormData({
                                      category: request.title,
                                      description: request.description || '',
                                      photos: [],
                                    })
                                    setRequestPhotos([])
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                >
                                  수정
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 진행중 */}
              <div>
                <h3 className="text-lg font-medium mb-3">처리중</h3>
                {(() => {
                  console.log('Rendering in_progress section. requests.in_progress:', requests.in_progress)
                  console.log('requests.in_progress.length:', requests.in_progress?.length || 0)
                  return null
                })()}
                {!requests.in_progress || requests.in_progress.length === 0 ? (
                  <p className="text-gray-500">진행중인 요청이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {requests.in_progress.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{request.title}</h4>
                          {request.created_by_user?.role === 'store_manager' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              (점주 직접 요청)
                            </span>
                          )}
                        </div>
                        {request.description && (
                          <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                        )}
                        {request.photo_url && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2">
                              {getPhotoUrls(request.photo_url).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`${request.title} 사진 ${idx + 1}`}
                                  className="w-32 h-32 object-cover rounded cursor-pointer"
                                  onClick={() => setSelectedImage(url)}
                                  onError={(e) => {
                                    console.error('Image load error:', url)
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
                    ))}
                  </div>
                )}
              </div>

              {/* 반려처리 */}
              <div>
                <h3 className="text-lg font-medium mb-3">반려처리</h3>
                {requests.rejected && requests.rejected.length === 0 ? (
                  <p className="text-gray-500">반려처리된 요청이 없습니다.</p>
                ) : (
                  <>
                    <div className="mb-3 text-sm text-gray-600">
                      총 {requests.rejected?.filter((r) => {
                        const confirmedDate = confirmedRequestDates.get(r.id)
                        if (!confirmedDate) {
                          return !confirmedRequestIds.has(r.id)
                        }
                        return false // 확인된 항목은 카운트에서 제외
                      }).length || 0}건 (확인 안된 항목만 표시)
                    </div>
                    <div className="space-y-4">
                      {(() => {
                        const today = new Date().toISOString().split('T')[0]
                        // 확인 안된 항목과 확인된 항목 분리
                        const unconfirmed = (requests.rejected || []).filter((r) => {
                          const confirmedDate = confirmedRequestDates.get(r.id)
                          if (!confirmedDate) {
                            return !confirmedRequestIds.has(r.id)
                          }
                          return false
                        })
                        
                        const confirmedToday = (requests.rejected || []).filter((r) => {
                          const confirmedDate = confirmedRequestDates.get(r.id)
                          return confirmedDate && isToday(confirmedDate)
                        })
                        
                        // 확인 안된 항목 먼저 표시, 그 다음 확인된 항목 표시 (가장 아래로, 연하게)
                        return [...unconfirmed, ...confirmedToday].map((request) => {
                          const hasRejectionDetails = request.rejection_description || request.rejection_photo_url
                          const isViewing = viewingCompletedRequestId === request.id
                          const confirmedDate = confirmedRequestDates.get(request.id)
                          const isConfirmedToday = confirmedDate && isToday(confirmedDate)
                          
                          return (
                            <div 
                              key={request.id} 
                              className={`border rounded-lg p-4 transition-all ${
                                isConfirmedToday ? 'opacity-40 bg-gray-50' : 'border-red-300 bg-red-50'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  {/* 요청란 카테고리 */}
                                  <div className="flex items-center gap-2 mb-3">
                                    <h4 className="font-medium text-lg">{request.title}</h4>
                                    {request.created_by_user?.role === 'store_manager' && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                        (점주 직접 요청)
                                      </span>
                                    )}
                                    {isConfirmedToday && (
                                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">확인 완료</span>
                                    )}
                                  </div>
                                  
                                  {/* 요청란 사진 */}
                                  {request.photo_url && (
                                    <div className="mb-3">
                                      <div className="flex flex-wrap gap-2">
                                        {getPhotoUrls(request.photo_url).map((url, idx) => (
                                          <img
                                            key={idx}
                                            src={url}
                                            alt={`${request.title} 사진 ${idx + 1}`}
                                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 cursor-pointer"
                                            onClick={() => setSelectedImage(url)}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 요청란 설명 - [반려 처리] 부분 제거 */}
                                  {request.description && (() => {
                                    // description에서 [반려 처리] 부분 제거
                                    let cleanDescription = request.description
                                    if (cleanDescription.includes('[반려 처리]')) {
                                      cleanDescription = cleanDescription.split('[반려 처리]')[0].trim()
                                    }
                                    return cleanDescription ? (
                                      <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{cleanDescription}</p>
                                    ) : null
                                  })()}
                                  
                                  {/* 구분선 */}
                                  <hr className="my-4 border-gray-300" />
                                  
                                  {/* 반려처리 섹션 */}
                                  <div className="mt-4">
                                    <h5 className="text-base font-semibold text-red-700 mb-3">반려처리</h5>
                                    
                                    {/* 반려 사유 사진 */}
                                    {(() => {
                                      // rejection_photo_url이 있으면 사용
                                      const rejectionPhotoUrl = request.rejection_photo_url
                                      
                                      if (rejectionPhotoUrl) {
                                        try {
                                          const photoUrls = getPhotoUrls(rejectionPhotoUrl)
                                          if (photoUrls && photoUrls.length > 0) {
                                            return (
                                              <div className="mb-3">
                                                <p className="text-sm font-medium text-gray-700 mb-2">반려 사유 사진 :</p>
                                                <div className="flex flex-wrap gap-2">
                                                  {photoUrls.map((url, idx) => (
                                                    <img
                                                      key={idx}
                                                      src={url}
                                                      alt={`반려 사진 ${idx + 1}`}
                                                      className="w-32 h-32 object-cover rounded-lg border-2 border-red-300 cursor-pointer"
                                                      onClick={() => setSelectedImage(url)}
                                                      onError={(e) => {
                                                        console.error('반려 사진 로드 실패:', url)
                                                        e.currentTarget.style.display = 'none'
                                                      }}
                                                    />
                                                  ))}
                                                </div>
                                              </div>
                                            )
                                          }
                                        } catch (error) {
                                          console.error('반려 사진 URL 파싱 오류:', error)
                                        }
                                      }
                                      return null
                                    })()}
                                    
                                    {/* 사유 */}
                                    {(() => {
                                      // rejection_description이 있으면 사용, 없으면 description에서 추출
                                      let rejectionReason = request.rejection_description
                                      if (!rejectionReason && request.description) {
                                        const match = request.description.match(/\[반려 처리\]\s*(.+)/)
                                        if (match) {
                                          rejectionReason = match[1].trim()
                                        }
                                      }
                                      return rejectionReason ? (
                                        <div className="mb-3">
                                          <p className="text-sm text-gray-700">
                                            <span className="font-medium">사유 : </span>
                                            <span className="whitespace-pre-wrap">{rejectionReason}</span>
                                          </p>
                                        </div>
                                      ) : null
                                    })()}
                                  </div>
                                  
                                  {/* 날짜 정보 */}
                                  <div className="mt-4 space-y-1">
                                    <p className="text-xs text-gray-400">
                                      작성: {new Date(request.created_at).toLocaleString('ko-KR')}
                                    </p>
                                    {request.updated_at && (
                                      <p className="text-xs text-red-600">
                                        반려 처리: {new Date(request.updated_at).toLocaleString('ko-KR')}
                                      </p>
                                    )}
                                    {isConfirmedToday && confirmedDate && (
                                      <p className="text-xs text-gray-400">
                                        확인: {new Date(confirmedDate).toLocaleDateString('ko-KR')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {!isConfirmedToday && (
                                  <button
                                    onClick={() => handleConfirmRequest(request.id)}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                  >
                                    확인
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </>
                )}
              </div>

              {/* 처리완료 */}
              <div>
                <h3 className="text-lg font-medium mb-3">처리완료</h3>
                {requests.completed.length === 0 ? (
                  <p className="text-gray-500">처리완료된 요청이 없습니다.</p>
                ) : (
                  <>
                    <div className="mb-3 text-sm text-gray-600">
                      총 {requests.completed.filter((r) => {
                        const confirmedDate = confirmedRequestDates.get(r.id)
                        if (!confirmedDate) {
                          return !confirmedRequestIds.has(r.id)
                        }
                        return false // 확인된 항목은 카운트에서 제외
                      }).length}건 (확인 안된 항목만 표시)
                    </div>
                    <div className="space-y-4">
                      {(() => {
                        const today = new Date().toISOString().split('T')[0]
                        // 확인 안된 항목과 확인된 항목 분리
                        const unconfirmed = requests.completed.filter((r) => {
                          const confirmedDate = confirmedRequestDates.get(r.id)
                          if (!confirmedDate) {
                            return !confirmedRequestIds.has(r.id)
                          }
                          return false
                        })
                        
                        const confirmedToday = requests.completed.filter((r) => {
                          const confirmedDate = confirmedRequestDates.get(r.id)
                          return confirmedDate && isToday(confirmedDate)
                        })
                        
                        // 확인 안된 항목 먼저 표시, 그 다음 확인된 항목 표시 (가장 아래로, 연하게)
                        return [...unconfirmed, ...confirmedToday].map((request) => {
                          // 처리 완료 내용 추출
                          const hasCompletionDetails = request.completion_description || request.completion_photo_url
                          const isViewing = viewingCompletedRequestId === request.id
                          
                          const confirmedDate = confirmedRequestDates.get(request.id)
                          const isConfirmedToday = confirmedDate && isToday(confirmedDate)
                          
                          return (
                            <div 
                              key={request.id} 
                              className={`border rounded-lg p-4 transition-all ${
                                isConfirmedToday ? 'opacity-40 bg-gray-50' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{request.title}</h4>
                                    {request.created_by_user?.role === 'store_manager' && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                        (점주 직접 요청)
                                      </span>
                                    )}
                                    {isConfirmedToday && (
                                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">확인 완료</span>
                                    )}
                                  </div>
                                  {request.description && (
                                    <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    작성: {new Date(request.created_at).toLocaleString('ko-KR')}
                                  </p>
                                  {request.updated_at && (
                                    <p className="text-xs text-gray-400">
                                      처리 완료: {new Date(request.updated_at).toLocaleString('ko-KR')}
                                    </p>
                                  )}
                                  {isConfirmedToday && confirmedDate && (
                                    <p className="text-xs text-gray-400">
                                      확인: {new Date(confirmedDate).toLocaleDateString('ko-KR')}
                                    </p>
                                  )}
                                </div>
                                {!isConfirmedToday && (
                                  <button
                                    onClick={() => {
                                      if (hasCompletionDetails && !isViewing) {
                                        // 처리 완료 내용 보기
                                        setViewingCompletedRequestId(request.id)
                                      } else {
                                        // 확인 처리
                                        handleConfirmRequest(request.id)
                                      }
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                  >
                                    {hasCompletionDetails && !isViewing ? '확인' : '확인'}
                                  </button>
                                )}
                              </div>

                              {/* 처리 완료 내용 표시 */}
                              {isViewing && hasCompletionDetails && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                                  {/* 완료 처리한 사람 표시 */}
                                  {(request as any).completed_by_user && (
                                    <div>
                                      <h5 className="text-sm font-semibold text-blue-800 mb-1">완료 처리한 사람</h5>
                                      <p className="text-sm text-gray-700">
                                        {(request as any).completed_by_user.name}
                                        {request.completed_at && (
                                          <span className="text-gray-500 ml-2">
                                            ({new Date(request.completed_at).toLocaleString('ko-KR')})
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {request.completion_description && (
                                    <div>
                                      <h5 className="text-sm font-semibold text-blue-800 mb-2">처리 완료 내용</h5>
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.completion_description}</p>
                                    </div>
                                  )}
                                  {request.completion_photo_url && (
                                    <div>
                                      <h5 className="text-sm font-semibold text-blue-800 mb-2">처리 완료 사진</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {getPhotoUrls(request.completion_photo_url).map((url, idx) => (
                                          <img
                                            key={idx}
                                            src={url}
                                            alt={`처리 완료 사진 ${idx + 1}`}
                                            className="w-32 h-32 object-cover rounded-lg border-2 border-blue-300 cursor-pointer"
                                            onClick={() => setSelectedImage(url)}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        handleConfirmRequest(request.id)
                                        setViewingCompletedRequestId(null)
                                      }}
                                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                    >
                                      확인
                                    </button>
                                    <button
                                      onClick={() => setViewingCompletedRequestId(null)}
                                      className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                                    >
                                      닫기
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* 원본 사진 */}
                              {request.photo_url && !isViewing && (
                                <div className="mt-2">
                                  <div className="flex flex-wrap gap-2">
                                    {getPhotoUrls(request.photo_url).map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`${request.title} 사진 ${idx + 1}`}
                                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 cursor-pointer"
                                        onClick={() => setSelectedImage(url)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 요청 생성 모달 */}
      {showRequestCreateModal && (selectedStore || broadcastMode) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowRequestCreateModal(false)
            setBroadcastMode(false)
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">요청 작성</h2>
              <button
                onClick={() => {
                  setShowRequestCreateModal(false)
                  setBroadcastMode(false)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              대상: {broadcastMode ? '전체 매장' : selectedStore?.store_name || ''}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <select
                  value={requestFormData.category}
                  onChange={(e) => setRequestFormData({ ...requestFormData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">선택하세요</option>
                  <option value="제품 관련 요청">제품 관련 요청</option>
                  <option value="자판기 관련 요청">자판기 관련 요청</option>
                  <option value="무인 택배함 관련">무인 택배함 관련</option>
                  <option value="매장 시설/청결 관련">매장 시설/청결 관련</option>
                  <option value="운영 관련">운영 관련</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  요청 내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={requestFormData.description}
                  onChange={(e) => setRequestFormData({ ...requestFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                  placeholder="요청 내용을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.capture = 'environment'
                      input.multiple = true
                      input.onchange = async (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || [])
                        for (const file of files) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert(`${file.name}은(는) 5MB를 초과합니다.`)
                            continue
                          }
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            setRequestPhotos((prev) => [...prev, event.target?.result as string])
                          }
                          reader.readAsDataURL(file)
                        }
                      }
                      input.click()
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    📷 즉시 촬영
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.multiple = true
                      input.onchange = async (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || [])
                        for (const file of files) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert(`${file.name}은(는) 5MB를 초과합니다.`)
                            continue
                          }
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            setRequestPhotos((prev) => [...prev, event.target?.result as string])
                          }
                          reader.readAsDataURL(file)
                        }
                      }
                      input.click()
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    🖼️ 갤러리
                  </button>
                </div>

                {requestPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {requestPhotos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square">
                        <img
                          src={url}
                          alt={`사진 ${idx + 1}`}
                          className="w-full h-full object-cover rounded-lg border-2 border-gray-300"
                        />
                        <button
                          onClick={() => {
                            setRequestPhotos((prev) => prev.filter((_, i) => i !== idx))
                          }}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateRequest}
                  disabled={!requestFormData.category || !requestFormData.description}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  등록하기
                </button>
                <button
                  onClick={() => {
                    setShowRequestCreateModal(false)
                    setRequestFormData({ category: '', description: '', photos: [] })
                    setRequestPhotos([])
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 (일반) */}
      {selectedImage && !selectedImageInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <img
            src={selectedImage}
            alt="확대"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
          >
            ×
          </button>
        </div>
      )}

      {/* 관리전후 사진 확대 모달 (area 표기 + 좌우 네비게이션) */}
      {selectedImageInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={() => setSelectedImageInfo(null)}>
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* 이전 버튼 */}
            {selectedImageInfo.currentIndex > 0 && (
              <button
                className="absolute left-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-4xl font-bold w-12 h-12 rounded-full flex items-center justify-center transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  const prevIndex = selectedImageInfo.currentIndex - 1
                  const prevPhoto = selectedImageInfo.allPhotos[prevIndex]
                  setSelectedImageInfo({
                    ...selectedImageInfo,
                    url: prevPhoto.url,
                    area: prevPhoto.area,
                    type: prevPhoto.type,
                    currentIndex: prevIndex,
                  })
                }}
              >
                ‹
              </button>
            )}

            {/* 이미지 */}
            <div className="flex flex-col items-center">
              <img
                src={selectedImageInfo.url}
                alt={`${selectedImageInfo.area} ${selectedImageInfo.type === 'before' ? '관리전' : '관리후'}`}
                className="max-w-full max-h-[85vh] object-contain"
              />
              {/* area 및 타입 표기 */}
              <div className="mt-4 text-white text-center">
                <p className="text-lg font-semibold">
                  {selectedImageInfo.area} - {selectedImageInfo.type === 'before' ? '관리전' : '관리후'} 사진
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  {selectedImageInfo.currentIndex + 1} / {selectedImageInfo.allPhotos.length}
                </p>
              </div>
            </div>

            {/* 다음 버튼 */}
            {selectedImageInfo.currentIndex < selectedImageInfo.allPhotos.length - 1 && (
              <button
                className="absolute right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-4xl font-bold w-12 h-12 rounded-full flex items-center justify-center transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  const nextIndex = selectedImageInfo.currentIndex + 1
                  const nextPhoto = selectedImageInfo.allPhotos[nextIndex]
                  setSelectedImageInfo({
                    ...selectedImageInfo,
                    url: nextPhoto.url,
                    area: nextPhoto.area,
                    type: nextPhoto.type,
                    currentIndex: nextIndex,
                  })
                }}
              >
                ›
              </button>
            )}

            {/* 닫기 버튼 */}
            <button
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
              onClick={() => setSelectedImageInfo(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 문제발생 전체보기 모달 */}
      {showAllProblemsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAllProblemsModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-red-700">전체 문제발생 현황</h2>
              <button onClick={() => setShowAllProblemsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>
            {loadingAllProblems ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {storeStatuses
                  .filter((store) => {
                    // 미확인 문제가 있는 매장만 표시
                    return store.has_problem && 
                           ((store.unprocessed_store_problems || 0) > 0 || 
                            (store.unconfirmed_vending_problems || 0) > 0 || 
                            (store.unconfirmed_lost_items || 0) > 0)
                  })
                  .map((store) => {
                    const storeProblems = allProblemsData.get(store.store_id)?.store_problems || []
                    const vendingProblems = allProblemsData.get(store.store_id)?.vending_problems || []
                    const lostItems = allProblemsData.get(store.store_id)?.lost_items || []
                    
                    // 미처리/미확인 항목만 필터링 (확인 처리된 항목 제외)
                    const unprocessedStoreProblems = storeProblems.filter((p: any) => 
                      p.status !== 'completed' && !confirmedProblemIds.has(p.id)
                    )
                    const unconfirmedVendingProblems = vendingProblems.filter((p: any) => 
                      p.status !== 'completed' && !confirmedProblemIds.has(p.id)
                    )
                    const unconfirmedLostItems = lostItems.filter((item: any) => 
                      item.status !== 'completed' && !confirmedLostItemIds.has(item.id)
                    )
                    
                    const totalUnresolved = unprocessedStoreProblems.length + unconfirmedVendingProblems.length + unconfirmedLostItems.length
                    
                    if (totalUnresolved === 0) return null
                    
                    return (
                      <div key={store.store_id} className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-red-800">{store.store_name}</h3>
                          <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full font-semibold">
                            미해결 {totalUnresolved}건
                          </span>
                        </div>
                        <div className="space-y-4">
                          {/* 매장 문제 보고 - 개별 항목 */}
                          {unprocessedStoreProblems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <h4 className="font-semibold text-gray-700">매장 문제 보고</h4>
                                <span className="text-sm font-semibold text-red-600">
                                  {unprocessedStoreProblems.length}건
                                </span>
                              </div>
                              <div className="space-y-3">
                                {unprocessedStoreProblems.map((problem: any) => {
                                  const originalDescription = problem.description?.split('\n\n[처리 완료]')[0] || problem.description
                                  const originalPhotos = problem.photo_url ? getPhotoUrls(problem.photo_url) : []
                                  return (
                                    <div key={problem.id} className="border-2 border-red-300 bg-white rounded-lg p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                          <div className="mb-2">
                                            <span className="inline-block px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-md">
                                              {problem.title?.replace(/^매장 문제:\s*/, '') || problem.title || '매장 문제'}
                                            </span>
                                          </div>
                                          {originalDescription && (
                                            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {originalDescription}
                                              </p>
                                            </div>
                                          )}
                                          {originalPhotos.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {originalPhotos.map((url: string, idx: number) => (
                                                <img
                                                  key={idx}
                                                  src={url}
                                                  alt={`${problem.title} 사진 ${idx + 1}`}
                                                  className="w-24 h-24 object-cover rounded-lg border-2 border-red-200 cursor-pointer hover:border-red-400"
                                                  onClick={() => setSelectedImage(url)}
                                                />
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-xs text-gray-500 mt-2">
                                            {new Date(problem.created_at).toLocaleString('ko-KR')}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => {
                                            setSelectedStore(store)
                                            setShowProblemModal(true)
                                            setShowAllProblemsModal(false)
                                          }}
                                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
                                        >
                                          처리 완료
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* 자판기 내부 문제 - 개별 항목 */}
                          {unconfirmedVendingProblems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <h4 className="font-semibold text-gray-700">자판기 내부 문제</h4>
                                <span className="text-sm font-semibold text-orange-600">
                                  {unconfirmedVendingProblems.length}건
                                </span>
                              </div>
                              <div className="space-y-3">
                                {unconfirmedVendingProblems.map((problem: any) => {
                                  const originalDescription = problem.description?.split('\n\n[처리 완료]')[0] || problem.description
                                  const originalPhotos = problem.photo_url ? getPhotoUrls(problem.photo_url) : []
                                  return (
                                    <div key={problem.id} className="border-2 border-orange-300 bg-white rounded-lg p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                          <div className="mb-2">
                                            <span className="inline-block px-3 py-1 bg-orange-600 text-white text-sm font-semibold rounded-md">
                                              {problem.title || '자판기 내부 문제'}
                                            </span>
                                          </div>
                                          {originalDescription && (
                                            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {originalDescription}
                                              </p>
                                            </div>
                                          )}
                                          {originalPhotos.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {originalPhotos.map((url: string, idx: number) => (
                                                <img
                                                  key={idx}
                                                  src={url}
                                                  alt={`${problem.title} 사진 ${idx + 1}`}
                                                  className="w-24 h-24 object-cover rounded-lg border-2 border-orange-200 cursor-pointer hover:border-orange-400"
                                                  onClick={() => setSelectedImage(url)}
                                                />
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-xs text-gray-500 mt-2">
                                            {new Date(problem.created_at).toLocaleString('ko-KR')}
                                          </p>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(`/api/business/problem-reports/${problem.id}/confirm`, {
                                                method: 'PATCH',
                                              })
                                              if (response.ok) {
                                                // 데이터 다시 로드
                                                const timestamp = new Date().getTime()
                                                const [problemResponse, lostResponse] = await Promise.all([
                                                  fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  }),
                                                  fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  })
                                                ])
                                                const problemData = await problemResponse.json()
                                                const lostData = await lostResponse.json()
                                                if (problemResponse.ok && problemData.data) {
                                                  setAllProblemsData((prev) => {
                                                    const newMap = new Map(prev)
                                                    newMap.set(store.store_id, {
                                                      store_problems: problemData.data.store_problems || [],
                                                      vending_problems: problemData.data.vending_problems || [],
                                                      lost_items: lostData.data || []
                                                    })
                                                    return newMap
                                                  })
                                                }
                                              }
                                            } catch (error) {
                                              console.error('Error confirming problem:', error)
                                            }
                                          }}
                                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
                                        >
                                          확인
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* 분실물 습득 - 개별 항목 */}
                          {unconfirmedLostItems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <h4 className="font-semibold text-gray-700">분실물 습득</h4>
                                <span className="text-sm font-semibold text-blue-600">
                                  {unconfirmedLostItems.length}건
                                </span>
                              </div>
                              <div className="space-y-3">
                                {unconfirmedLostItems.map((item: any) => {
                                  const photos = item.photo_url ? getPhotoUrls(item.photo_url) : []
                                  return (
                                    <div key={item.id} className="border-2 border-blue-300 bg-white rounded-lg p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                          <div className="mb-2">
                                            <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-md">
                                              {item.type || '분실물'}
                                            </span>
                                          </div>
                                          {item.description && (
                                            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {item.description}
                                              </p>
                                            </div>
                                          )}
                                          {item.storage_location && (
                                            <div className="mb-2 text-sm text-gray-600">
                                              보관 위치: <span className="font-semibold">{item.storage_location}</span>
                                            </div>
                                          )}
                                          {photos.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {photos.map((url: string, idx: number) => (
                                                <img
                                                  key={idx}
                                                  src={url}
                                                  alt={`분실물 사진 ${idx + 1}`}
                                                  className="w-24 h-24 object-cover rounded-lg border-2 border-blue-200 cursor-pointer hover:border-blue-400"
                                                  onClick={() => setSelectedImage(url)}
                                                />
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-xs text-gray-500 mt-2">
                                            {new Date(item.created_at).toLocaleString('ko-KR')}
                                          </p>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(`/api/business/lost-items/${item.id}/confirm`, {
                                                method: 'PATCH',
                                              })
                                              if (response.ok) {
                                                // 데이터 다시 로드
                                                const timestamp = new Date().getTime()
                                                const [problemResponse, lostResponse] = await Promise.all([
                                                  fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  }),
                                                  fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  })
                                                ])
                                                const problemData = await problemResponse.json()
                                                const lostData = await lostResponse.json()
                                                if (problemResponse.ok && problemData.data) {
                                                  setAllProblemsData((prev) => {
                                                    const newMap = new Map(prev)
                                                    newMap.set(store.store_id, {
                                                      store_problems: problemData.data.store_problems || [],
                                                      vending_problems: problemData.data.vending_problems || [],
                                                      lost_items: lostData.data || []
                                                    })
                                                    return newMap
                                                  })
                                                }
                                              }
                                            } catch (error) {
                                              console.error('Error confirming lost item:', error)
                                            }
                                          }}
                                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
                                        >
                                          확인
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                {storeStatuses.filter((store) => store.has_problem).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    문제가 발생한 매장이 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 알림 전체보기 모달 */}
      {showAllNotificationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAllNotificationsModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-yellow-700">전체 알림 현황</h2>
              <button onClick={() => setShowAllNotificationsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>
            {loadingAllNotifications ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {storeStatuses
                  .filter((store) => {
                    // 확인 처리되지 않은 항목만 카운트
                    const requestCount = store.in_progress_request_count + 
                                        (store.unconfirmed_completed_request_count || 0) + 
                                        (store.unconfirmed_rejected_request_count || 0)
                    const problemCount = (store.unprocessed_store_problems || 0) + 
                                        (store.unconfirmed_vending_problems || 0)
                    const lostItemCount = store.unconfirmed_lost_items || 0
                    const notificationCount = requestCount + problemCount + lostItemCount
                    return notificationCount > 0
                  })
                  .map((store) => {
                    const notifications = allNotificationsData.get(store.store_id) || {
                      in_progress_requests: [],
                      completed_requests: [],
                      store_problems: [],
                      vending_problems: [],
                      lost_items: []
                    }
                    
                    // 확인 처리되지 않은 항목만 필터링
                    const unconfirmedCompletedRequests = notifications.completed_requests.filter((r: any) => {
                      const confirmedDate = confirmedRequestDates.get(r.id)
                      if (!confirmedDate) return !confirmedRequestIds.has(r.id)
                      return isToday(confirmedDate)
                    })
                    const unconfirmedRejectedRequests = notifications.in_progress_requests.filter((r: any) => r.status === 'rejected').filter((r: any) => {
                      const confirmedDate = confirmedRequestDates.get(r.id)
                      if (!confirmedDate) return !confirmedRequestIds.has(r.id)
                      return isToday(confirmedDate)
                    })
                    const unconfirmedStoreProblems = notifications.store_problems.filter((p: any) => p.status !== 'completed' && !confirmedProblemIds.has(p.id))
                    const unconfirmedVendingProblems = notifications.vending_problems.filter((p: any) => p.status !== 'completed' && !confirmedProblemIds.has(p.id))
                    const unconfirmedLostItems = notifications.lost_items.filter((item: any) => 
                      item.status !== 'completed' && !confirmedLostItemIds.has(item.id)
                    )
                    
                    const totalNotifications = notifications.in_progress_requests.filter((r: any) => r.status !== 'rejected').length + 
                      unconfirmedCompletedRequests.length + 
                      unconfirmedRejectedRequests.length + 
                      unconfirmedStoreProblems.length + 
                      unconfirmedVendingProblems.length + 
                      unconfirmedLostItems.length
                    
                    if (totalNotifications === 0) return null
                    
                    return (
                      <div key={store.store_id} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-yellow-800">{store.store_name}</h3>
                          <span className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-full font-semibold">
                            총 {totalNotifications}건
                          </span>
                        </div>
                        <div className="space-y-4">
                          {/* 처리중 요청 - 개별 항목 (반려 제외) */}
                          {notifications.in_progress_requests.filter((r: any) => r.status !== 'rejected').length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <h4 className="font-semibold text-gray-700">처리중 요청</h4>
                                <span className="text-sm font-semibold text-orange-600">
                                  {notifications.in_progress_requests.filter((r: any) => r.status !== 'rejected').length}건
                                </span>
                              </div>
                              <div className="space-y-3">
                                {notifications.in_progress_requests.filter((r: any) => r.status !== 'rejected').map((request: any) => {
                                  const photos = request.photo_url ? getPhotoUrls(request.photo_url) : []
                                  return (
                                    <div key={request.id} className="border-2 border-orange-300 bg-white rounded-lg p-4 shadow-sm">
                                      <div className="flex-1">
                                        <div className="mb-2">
                                          <span className="inline-block px-3 py-1 bg-orange-600 text-white text-sm font-semibold rounded-md">
                                            {request.title || '요청'}
                                          </span>
                                        </div>
                                        {request.description && (
                                          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                              {request.description}
                                            </p>
                                          </div>
                                        )}
                                        {photos.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {photos.map((url: string, idx: number) => (
                                              <img
                                                key={idx}
                                                src={url}
                                                alt={`요청 사진 ${idx + 1}`}
                                                className="w-24 h-24 object-cover rounded-lg border-2 border-orange-200 cursor-pointer hover:border-orange-400"
                                                onClick={() => setSelectedImage(url)}
                                              />
                                            ))}
                                          </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                          {new Date(request.created_at).toLocaleString('ko-KR')}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* 처리완료 요청 - 개별 항목 (미확인만) */}
                          {unconfirmedCompletedRequests.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <h4 className="font-semibold text-gray-700">처리완료 요청</h4>
                                <span className="text-sm font-semibold text-green-600">
                                  {unconfirmedCompletedRequests.length}건
                                </span>
                              </div>
                              <div className="space-y-3">
                                {unconfirmedCompletedRequests.map((request: any) => {
                                    const confirmedDate = confirmedRequestDates.get(request.id)
                                    const isConfirmedToday = confirmedDate && isToday(confirmedDate)
                                    const photos = request.photo_url ? getPhotoUrls(request.photo_url) : []
                                    return (
                                      <div key={request.id} className={`border-2 border-green-300 bg-white rounded-lg p-4 shadow-sm ${isConfirmedToday ? 'opacity-60' : ''}`}>
                                        <div className="flex justify-between items-start mb-3">
                                          <div className="flex-1">
                                            <div className="mb-2">
                                              <span className="inline-block px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-md">
                                                {request.title || '요청'}
                                              </span>
                                              {isConfirmedToday && (
                                                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">확인 완료</span>
                                              )}
                                            </div>
                                            {request.description && (
                                              <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                  {request.description}
                                                </p>
                                              </div>
                                            )}
                                            {photos.length > 0 && (
                                              <div className="mt-2 flex flex-wrap gap-2">
                                                {photos.map((url: string, idx: number) => (
                                                  <img
                                                    key={idx}
                                                    src={url}
                                                    alt={`요청 사진 ${idx + 1}`}
                                                    className="w-24 h-24 object-cover rounded-lg border-2 border-green-200 cursor-pointer hover:border-green-400"
                                                    onClick={() => setSelectedImage(url)}
                                                  />
                                                ))}
                                              </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                              {new Date(request.created_at).toLocaleString('ko-KR')}
                                            </p>
                                          </div>
                                          {!isConfirmedToday && (
                                            <button
                                              onClick={async () => {
                                                await handleConfirmRequest(request.id)
                                                // 데이터 다시 로드
                                                const timestamp = new Date().getTime()
                                                const [requestResponse, problemResponse, lostResponse] = await Promise.all([
                                                  fetch(`/api/business/stores/${store.store_id}/requests?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  }),
                                                  fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  }),
                                                  fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  })
                                                ])
                                                const requestData = await requestResponse.json()
                                                const problemData = await problemResponse.json()
                                                const lostData = await lostResponse.json()
                                                if (requestResponse.ok && requestData.data) {
                                                  setAllNotificationsData((prev) => {
                                                    const newMap = new Map(prev)
                                                    newMap.set(store.store_id, {
                                                      in_progress_requests: requestData.data.in_progress || [],
                                                      completed_requests: requestData.data.completed || [],
                                                      store_problems: problemData.data?.store_problems || [],
                                                      vending_problems: problemData.data?.vending_problems || [],
                                                      lost_items: lostData.data || []
                                                    })
                                                    return newMap
                                                  })
                                                }
                                              }}
                                              className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
                                            >
                                              확인
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )}
                          
                          {/* 매장 문제 보고 - 개별 항목 (미확인만) */}
                          {unconfirmedStoreProblems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <h4 className="font-semibold text-gray-700">매장 문제 보고</h4>
                                <span className="text-sm font-semibold text-red-600">
                                  {unconfirmedStoreProblems.length}건
                                </span>
                              </div>
                              <div className="space-y-3">
                                {unconfirmedStoreProblems.map((problem: any) => {
                                  const originalDescription = problem.description?.split('\n\n[처리 완료]')[0] || problem.description
                                  const originalPhotos = problem.photo_url ? getPhotoUrls(problem.photo_url) : []
                                  return (
                                    <div key={problem.id} className="border-2 border-red-300 bg-white rounded-lg p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                          <div className="mb-2">
                                            <span className="inline-block px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-md">
                                              {problem.title?.replace(/^매장 문제:\s*/, '') || problem.title || '매장 문제'}
                                            </span>
                                          </div>
                                          {originalDescription && (
                                            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {originalDescription}
                                              </p>
                                            </div>
                                          )}
                                          {originalPhotos.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {originalPhotos.map((url: string, idx: number) => (
                                                <img
                                                  key={idx}
                                                  src={url}
                                                  alt={`${problem.title} 사진 ${idx + 1}`}
                                                  className="w-24 h-24 object-cover rounded-lg border-2 border-red-200 cursor-pointer hover:border-red-400"
                                                  onClick={() => setSelectedImage(url)}
                                                />
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-xs text-gray-500 mt-2">
                                            {new Date(problem.created_at).toLocaleString('ko-KR')}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => {
                                            setSelectedStore(store)
                                            setShowProblemModal(true)
                                            setShowAllNotificationsModal(false)
                                          }}
                                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
                                        >
                                          처리 완료
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* 자판기 내부 문제 - 개별 항목 */}
                          {notifications.vending_problems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <h4 className="font-semibold text-gray-700">자판기 내부 문제</h4>
                                <span className="text-sm font-semibold text-orange-600">
                                  {notifications.vending_problems.length}건
                                </span>
                              </div>
                              <div className="space-y-3">
                                {notifications.vending_problems.map((problem: any) => {
                                  const originalDescription = problem.description?.split('\n\n[처리 완료]')[0] || problem.description
                                  const originalPhotos = problem.photo_url ? getPhotoUrls(problem.photo_url) : []
                                  return (
                                    <div key={problem.id} className="border-2 border-orange-300 bg-white rounded-lg p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                          <div className="mb-2">
                                            <span className="inline-block px-3 py-1 bg-orange-600 text-white text-sm font-semibold rounded-md">
                                              {problem.title || '자판기 내부 문제'}
                                            </span>
                                          </div>
                                          {originalDescription && (
                                            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {originalDescription}
                                              </p>
                                            </div>
                                          )}
                                          {originalPhotos.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {originalPhotos.map((url: string, idx: number) => (
                                                <img
                                                  key={idx}
                                                  src={url}
                                                  alt={`${problem.title} 사진 ${idx + 1}`}
                                                  className="w-24 h-24 object-cover rounded-lg border-2 border-orange-200 cursor-pointer hover:border-orange-400"
                                                  onClick={() => setSelectedImage(url)}
                                                />
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-xs text-gray-500 mt-2">
                                            {new Date(problem.created_at).toLocaleString('ko-KR')}
                                          </p>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(`/api/business/problem-reports/${problem.id}/confirm`, {
                                                method: 'PATCH',
                                              })
                                              if (response.ok) {
                                                // 데이터 다시 로드
                                                const timestamp = new Date().getTime()
                                                const [requestResponse, problemResponse, lostResponse] = await Promise.all([
                                                  fetch(`/api/business/stores/${store.store_id}/requests?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  }),
                                                  fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  }),
                                                  fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  })
                                                ])
                                                const requestData = await requestResponse.json()
                                                const problemData = await problemResponse.json()
                                                const lostData = await lostResponse.json()
                                                if (requestResponse.ok && requestData.data) {
                                                  setAllNotificationsData((prev) => {
                                                    const newMap = new Map(prev)
                                                    newMap.set(store.store_id, {
                                                      in_progress_requests: requestData.data.in_progress || [],
                                                      completed_requests: requestData.data.completed || [],
                                                      store_problems: problemData.data?.store_problems || [],
                                                      vending_problems: problemData.data?.vending_problems || [],
                                                      lost_items: lostData.data || []
                                                    })
                                                    return newMap
                                                  })
                                                }
                                              }
                                            } catch (error) {
                                              console.error('Error confirming problem:', error)
                                            }
                                          }}
                                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
                                        >
                                          확인
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* 분실물 습득 - 개별 항목 (미확인만) */}
                          {unconfirmedLostItems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <h4 className="font-semibold text-gray-700">분실물 습득</h4>
                                <span className="text-sm font-semibold text-blue-600">
                                  {unconfirmedLostItems.length}건
                                </span>
                              </div>
                              <div className="space-y-3">
                                {unconfirmedLostItems.map((item: any) => {
                                  const photos = item.photo_url ? getPhotoUrls(item.photo_url) : []
                                  return (
                                    <div key={item.id} className="border-2 border-blue-300 bg-white rounded-lg p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                          <div className="mb-2">
                                            <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-md">
                                              {item.type || '분실물'}
                                            </span>
                                          </div>
                                          {item.description && (
                                            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {item.description}
                                              </p>
                                            </div>
                                          )}
                                          {item.storage_location && (
                                            <div className="mb-2 text-sm text-gray-600">
                                              보관 위치: <span className="font-semibold">{item.storage_location}</span>
                                            </div>
                                          )}
                                          {photos.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              {photos.map((url: string, idx: number) => (
                                                <img
                                                  key={idx}
                                                  src={url}
                                                  alt={`분실물 사진 ${idx + 1}`}
                                                  className="w-24 h-24 object-cover rounded-lg border-2 border-blue-200 cursor-pointer hover:border-blue-400"
                                                  onClick={() => setSelectedImage(url)}
                                                />
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-xs text-gray-500 mt-2">
                                            {new Date(item.created_at).toLocaleString('ko-KR')}
                                          </p>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(`/api/business/lost-items/${item.id}/confirm`, {
                                                method: 'PATCH',
                                              })
                                              if (response.ok) {
                                                // 데이터 다시 로드
                                                const timestamp = new Date().getTime()
                                                const [requestResponse, problemResponse, lostResponse] = await Promise.all([
                                                  fetch(`/api/business/stores/${store.store_id}/requests?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  }),
                                                  fetch(`/api/business/stores/${store.store_id}/problem-reports?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  }),
                                                  fetch(`/api/business/stores/${store.store_id}/lost-items?t=${timestamp}`, {
                                                    cache: 'no-store',
                                                  })
                                                ])
                                                const requestData = await requestResponse.json()
                                                const problemData = await problemResponse.json()
                                                const lostData = await lostResponse.json()
                                                if (requestResponse.ok && requestData.data) {
                                                  setAllNotificationsData((prev) => {
                                                    const newMap = new Map(prev)
                                                    newMap.set(store.store_id, {
                                                      in_progress_requests: requestData.data.in_progress || [],
                                                      completed_requests: requestData.data.completed || [],
                                                      store_problems: problemData.data?.store_problems || [],
                                                      vending_problems: problemData.data?.vending_problems || [],
                                                      lost_items: lostData.data || []
                                                    })
                                                    return newMap
                                                  })
                                                }
                                              }
                                            } catch (error) {
                                              console.error('Error confirming lost item:', error)
                                            }
                                          }}
                                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
                                        >
                                          확인
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                {storeStatuses.filter((store) => {
                  const notificationCount = store.in_progress_request_count + store.completed_request_count + store.store_problem_count + store.vending_problem_count + store.lost_item_count
                  return notificationCount > 0
                }).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    알림이 있는 매장이 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 물품요청 접수 확인 모달 */}
      {showReceivedSupplyRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowReceivedSupplyRequestsModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">물품요청 접수 확인</h2>
              <button onClick={() => setShowReceivedSupplyRequestsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-4">
              {receivedSupplyRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  접수된 물품 요청이 없습니다.
                </div>
              ) : (
                receivedSupplyRequests.map((request: any) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        {request.stores?.name && (
                          <div className="text-xs text-gray-500 mb-1">
                            매장: {request.stores.name}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{request.title}</h4>
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                            {request.category || '-'}
                          </span>
                        </div>
                        {request.description && (
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{request.description}</p>
                        )}
                        {request.photo_url && (
                          <div className="mt-2">
                            <img
                              src={request.photo_url}
                              alt="요청 사진"
                              className="w-32 h-32 object-cover rounded border border-gray-300"
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          요청자: {request.users?.name || '-'} | {new Date(request.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/business/supply-requests/${request.id}/confirm`, {
                              method: 'POST',
                            })
                            
                            if (response.ok) {
                              alert('요청 확인되었습니다. 처리중으로 변경되었습니다.')
                              await loadAllReceivedSupplyRequests()
                              loadStoreStatuses()
                            } else {
                              const errorData = await response.json()
                              alert(errorData.error || '요청 확인 중 오류가 발생했습니다.')
                            }
                          } catch (error) {
                            console.error('Error confirming supply request:', error)
                            alert('요청 확인 중 오류가 발생했습니다.')
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        요청 확인
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/business/supply-requests/${request.id}/forward`, {
                              method: 'POST',
                            })
                            
                            if (response.ok) {
                              alert('점주에게 전달되었습니다.')
                              await loadAllReceivedSupplyRequests()
                              loadStoreStatuses()
                            } else {
                              const errorData = await response.json()
                              alert(errorData.error || '점주 전달 중 오류가 발생했습니다.')
                            }
                          } catch (error) {
                            console.error('Error forwarding supply request:', error)
                            alert('점주 전달 중 오류가 발생했습니다.')
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        점주 전달
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 접수 확인 모달 */}
      {showReceivedRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowReceivedRequestsModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">접수 확인</h2>
              <button onClick={() => setShowReceivedRequestsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-4">
              {receivedRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  접수된 요청이 없습니다.
                </div>
              ) : (
                receivedRequests.map((request) => {
                  const isEditing = editingReceivedRequest === request.id
                  const photos = request.photo_url ? (typeof request.photo_url === 'string' ? JSON.parse(request.photo_url) : request.photo_url) : []
                  
                  return (
                    <div key={request.id} className="border rounded-lg p-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              카테고리
                            </label>
                            <select
                              value={receivedRequestFormData.category}
                              onChange={(e) => setReceivedRequestFormData({ ...receivedRequestFormData, category: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                              <option value="">선택하세요</option>
                              <option value="제품 관련 요청">제품 관련 요청</option>
                              <option value="자판기 관련 요청">자판기 관련 요청</option>
                              <option value="무인 택배함 관련 요청">무인 택배함 관련 요청</option>
                              <option value="매장시설/청결 관련 요청">매장시설/청결 관련 요청</option>
                              <option value="운영 관련 요청">운영 관련 요청</option>
                              <option value="기타">기타</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              요청 내용
                            </label>
                            <textarea
                              value={receivedRequestFormData.description}
                              onChange={(e) => setReceivedRequestFormData({ ...receivedRequestFormData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={5}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/business/requests/${request.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      category: receivedRequestFormData.category || request.title,
                                      description: receivedRequestFormData.description || request.description,
                                    }),
                                  })
                                  
                                  if (response.ok) {
                                    const data = await response.json()
                                    if (data.success) {
                                      // 목록 새로고침
                                      const storeId = request.store_id
                                      await handleViewReceivedRequests(storeId)
                                      setEditingReceivedRequest(null)
                                      setReceivedRequestFormData({ category: '', description: '' })
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error updating request:', error)
                                  alert('요청 수정 중 오류가 발생했습니다.')
                                }
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => {
                                setEditingReceivedRequest(null)
                                setReceivedRequestFormData({ category: '', description: '' })
                              }}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              {request.store_name && (
                                <div className="text-xs text-gray-500 mb-1">
                                  매장: {request.store_name}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{request.title}</h4>
                                {request.created_by_user?.role === 'store_manager' && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    (점주 직접 요청)
                                  </span>
                                )}
                              </div>
                              {request.description && (
                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{request.description}</p>
                              )}
                              {photos.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {photos.map((url: string, idx: number) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt={`요청 사진 ${idx + 1}`}
                                      className="w-24 h-24 object-cover rounded border border-gray-300"
                                    />
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(request.created_at).toLocaleString('ko-KR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => {
                                setEditingReceivedRequest(request.id)
                                setReceivedRequestFormData({
                                  category: request.title,
                                  description: request.description || '',
                                })
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                              수정
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/business/requests/${request.id}/status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      status: 'in_progress',
                                    }),
                                  })
                                  
                                  if (response.ok) {
                                    const data = await response.json()
                                    if (data.success) {
                                      alert('접수가 확인되었습니다. 처리중으로 변경되었습니다.')
                                      // 목록 새로고침
                                      if (request.store_id) {
                                        await handleViewReceivedRequests(request.store_id)
                                      } else {
                                        // 전체 접수 목록인 경우
                                        await loadAllReceivedRequests()
                                      }
                                      // 대시보드 새로고침
                                      loadStoreStatuses()
                                    }
                                  } else {
                                    const errorData = await response.json()
                                    alert(errorData.error || '접수 확인 중 오류가 발생했습니다.')
                                  }
                                } catch (error) {
                                  console.error('Error confirming request:', error)
                                  alert('접수 확인 중 오류가 발생했습니다.')
                                }
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              접수 확인
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
