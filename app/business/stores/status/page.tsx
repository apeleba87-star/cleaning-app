'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { uploadPhoto } from '@/lib/supabase/upload'

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
  in_progress_request_count: number
  completed_request_count: number
  unconfirmed_completed_request_count: number
  before_photo_count: number
  after_photo_count: number
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
}

interface Request {
  id: string
  title: string
  description: string | null
  photo_url: string | null
  status: string
  created_at: string
  updated_at: string | null
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
  const [showProblemModal, setShowProblemModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<StoreStatus | null>(null)
  const [inventoryPhotos, setInventoryPhotos] = useState<{ product_inflow: InventoryPhoto[]; storage: InventoryPhoto[] }>({ product_inflow: [], storage: [] })
  const [problemReports, setProblemReports] = useState<{ store_problems: ProblemReport[]; vending_problems: ProblemReport[] }>({ store_problems: [], vending_problems: [] })
  const [lostItems, setLostItems] = useState<LostItem[]>([])
  const [requests, setRequests] = useState<{ received: Request[]; in_progress: Request[]; completed: Request[] }>({ received: [], in_progress: [], completed: [] })
  const [confirmedRequestIds, setConfirmedRequestIds] = useState<Set<string>>(new Set())
  const [confirmedProblemIds, setConfirmedProblemIds] = useState<Set<string>>(new Set())
  const [confirmedLostItemIds, setConfirmedLostItemIds] = useState<Set<string>>(new Set())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
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
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [requestFormData, setRequestFormData] = useState({
    category: '',
    description: '',
    photos: [] as string[],
  })
  const [requestPhotos, setRequestPhotos] = useState<string[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 시간 체크 함수 (8시 ~ 23시)
  const isWithinRefreshHours = () => {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 8 && hour < 23
  }

  useEffect(() => {
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

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearInterval(hourCheckInterval)
    }
  }, [])

  const loadStoreStatuses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/business/stores/status')
      const data = await response.json()

      if (response.ok) {
        console.log('=== Store Statuses API Response ===')
        console.log('Total stores:', data.data?.length || 0)
        data.data?.forEach((store: any) => {
          console.log(`\nStore: ${store.store_name} (${store.store_id})`)
          console.log('  - store_problem_count:', store.store_problem_count)
          console.log('  - vending_problem_count:', store.vending_problem_count)
          console.log('  - lost_item_count:', store.lost_item_count)
          console.log('  - unprocessed_store_problems:', store.unprocessed_store_problems)
          console.log('  - unconfirmed_vending_problems:', store.unconfirmed_vending_problems)
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
      // 1. 작업일 여부 (오늘이 작업일이면 우선)
      const aIsWorkDay = a.is_work_day
      const bIsWorkDay = b.is_work_day
      if (aIsWorkDay !== bIsWorkDay) {
        return aIsWorkDay ? -1 : 1
      }

      // 2. 문제 상태 (문제가 있으면 우선)
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

    try {
      const [problemResponse, lostResponse] = await Promise.all([
        fetch(`/api/business/stores/${store.store_id}/problem-reports`),
        fetch(`/api/business/stores/${store.store_id}/lost-items`)
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
          if (item.status === 'completed' || item.status === 'confirmed' || item.status === 'processed') {
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
    }
  }

  const handleOpenRequestModal = async (store: StoreStatus) => {
    setSelectedStore(store)
    setShowRequestModal(true)

    try {
      const response = await fetch(`/api/business/stores/${store.store_id}/requests`)
      const data = await response.json()
      if (response.ok) {
        setRequests(data.data || { received: [], in_progress: [], completed: [] })
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }

  const handleConfirmRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/business/requests/${requestId}/confirm`, {
        method: 'PATCH',
      })

      if (response.ok) {
        setConfirmedRequestIds((prev) => new Set(prev).add(requestId))
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

  const handleCreateRequest = async () => {
    if (!requestFormData.category || !requestFormData.description) {
      alert('카테고리와 요청 내용을 입력해주세요.')
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

      const response = await fetch('/api/business/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStore.store_id,
          category: requestFormData.category,
          description: requestFormData.description,
          photo_urls: photoUrls,
        }),
      })

      if (response.ok) {
        setShowRequestCreateModal(false)
        setRequestFormData({ category: '', description: '', photos: [] })
        setRequestPhotos([])
        loadStoreStatuses()
        alert('요청이 등록되었습니다. (처리중으로 설정됨)')
      } else {
        const data = await response.json()
        alert(data.error || '요청 등록 중 오류가 발생했습니다.')
      }
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
        alert(data.error || `확인 처리 중 오류가 발생했습니다. (${response.status})`)
        return
      }

      if (data.success) {
        console.log('API call succeeded, updating UI...')
        console.log('API returned data:', data.data)
        
        // API 응답에서 반환된 상태 값 사용 (completed, confirmed, processed 중 하나)
        const newStatus = data.data?.status || data.status || 'completed'
        const newUpdatedAt = data.data?.updated_at || new Date().toISOString()
        
        console.log('Updating lost item with status:', newStatus)
        
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

        // 상태 갱신 (약간의 지연 후, API 업데이트가 반영될 시간 확보)
        await new Promise(resolve => setTimeout(resolve, 500))
        await loadStoreStatuses()
        
        // 모달 데이터 새로고침 (데이터베이스에서 최신 상태 가져오기)
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
      } else {
        console.error('Confirm failed:', data)
        alert(data.error || '확인 처리 중 오류가 발생했습니다.')
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
      if (filter === 'problem') return store.has_problem
      return true
    })
  }, [sortedStores, filter])

  // 통계 계산
  const stats = useMemo(() => ({
    total: storeStatuses.length,
    operating: storeStatuses.filter((s) => s.is_work_day).length,
    completed: storeStatuses.filter((s) => s.attendance_status === 'clocked_out').length,
    problem: storeStatuses.filter((s) => s.has_problem).length,
    notifications: storeStatuses.reduce((sum, s) => sum + s.in_progress_request_count + s.completed_request_count + s.store_problem_count + s.vending_problem_count + s.lost_item_count, 0),
  }), [storeStatuses])

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
    if (status.attendance_status === 'clocked_out') return '완료'
    if (status.attendance_status === 'clocked_in') return '진행중'
    return '미시작'
  }

  const getStatusColor = (status: StoreStatus): string => {
    if (!status.is_work_day) return 'bg-gray-100 text-gray-700'
    if (status.attendance_status === 'clocked_out') return 'bg-green-100 text-green-700'
    if (status.attendance_status === 'clocked_in') return 'bg-blue-100 text-blue-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  const getTotalNotificationCount = (status: StoreStatus): number => {
    return status.in_progress_request_count + status.completed_request_count + status.store_problem_count + status.vending_problem_count + status.lost_item_count
  }

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
        {/* 안내 문구 */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            💡 <strong>새로고침을 해야 출근 상태가 정확합니다.</strong> 자동 새로고침은 30분마다 실행되며, 오전 8시부터 저녁 11시까지만 작동합니다.
          </p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">전체 매장</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">금일 운영</div>
          <div className="text-2xl font-bold text-gray-900">{stats.operating}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 mb-1">완료</div>
          <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600 mb-1">문제발생</div>
            {stats.problem > 0 && <span className="text-red-500">⚠️</span>}
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.problem}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-600 mb-1">알림</div>
          <div className="text-2xl font-bold text-gray-900">{stats.notifications}</div>
        </div>
      </div>

      {/* 필터 버튼 */}
      <div className="flex gap-2 mb-6 flex-wrap">
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

      {/* 매장 목록 */}
      <div className="space-y-4">
        {filteredStores.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            표시할 매장이 없습니다.
          </div>
        ) : (
          filteredStores.map((status) => {
            const totalProblems = status.store_problem_count + status.vending_problem_count + status.lost_item_count
            const hasRequests = status.received_request_count > 0 || status.in_progress_request_count > 0 || status.completed_request_count > 0
            const notificationCount = getTotalNotificationCount(status)
            
            return (
              <div
                key={status.store_id}
                className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 ${
                  !status.is_work_day
                    ? 'border-gray-300 opacity-60'
                    : status.has_problem
                    ? 'border-red-500'
                    : status.attendance_status === 'clocked_out'
                    ? 'border-green-500'
                    : 'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{status.store_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                      {notificationCount > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          {notificationCount}
                        </span>
                      )}
                      {/* 문제보고가 있는 경우 즉시 새로고침 버튼 */}
                      {status.has_problem && (
                        <button
                          onClick={(e) => refreshStore(status.store_id, e)}
                          disabled={refreshing.has(status.store_id)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          title="이 매장만 즉시 새로고침"
                        >
                          {refreshing.has(status.store_id) ? '새로고침 중...' : '🔄 즉시 새로고침'}
                        </button>
                      )}
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
                {/* 상세 정보 (3개 컬럼) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                          setShowRequestCreateModal(true)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        요청접수
                      </button>
                    </div>
                    <div
                      onClick={() => handleOpenRequestModal(status)}
                      className={`cursor-pointer transition-colors ${
                        hasRequests
                          ? 'text-blue-600 hover:text-blue-800'
                          : 'text-gray-500'
                      }`}
                    >
                      <div className="space-y-2">
                        {status.received_request_count > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">접수</span>
                            <span className="text-sm font-semibold text-gray-600">
                              {status.received_request_count}건
                            </span>
                          </div>
                        )}
                        {status.in_progress_request_count > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">처리중</span>
                            <span className="text-sm font-semibold text-orange-600">
                              {status.in_progress_request_count}건
                            </span>
                          </div>
                        )}
                        {status.completed_request_count > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">처리완료</span>
                            <span className="text-sm font-semibold text-green-600">
                              {status.completed_request_count}건
                            </span>
                          </div>
                        )}
                        {!hasRequests && (
                          <p className="text-sm text-gray-500">요청 없음</p>
                        )}
                      </div>
                    </div>
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
          })
        )}
      </div>

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
                        {lostItems.filter((item) => item.status !== 'completed' && item.status !== 'confirmed' && item.status !== 'processed' && !confirmedLostItemIds.has(item.id)).length}건
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
                          .filter((item) => item.status !== 'completed' && item.status !== 'confirmed' && item.status !== 'processed' && !confirmedLostItemIds.has(item.id))
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
                        .filter((item) => item.status === 'completed' || item.status === 'confirmed' || item.status === 'processed' || confirmedLostItemIds.has(item.id))
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
                                  {(item.status === 'completed' || item.status === 'confirmed' || item.status === 'processed' || confirmedLostItemIds.has(item.id)) && item.updated_at && (
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
                                <h4 className="font-medium">{request.title}</h4>
                                {request.description && (
                                  <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(request.created_at).toLocaleString('ko-KR')}
                                </p>
                                {request.photo_url && (
                                  <div className="mt-2">
                                    {getPhotoUrls(request.photo_url).map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`${request.title} 사진 ${idx + 1}`}
                                        className="w-32 h-32 object-cover rounded cursor-pointer mr-2"
                                        onClick={() => setSelectedImage(url)}
                                      />
                                    ))}
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
                {requests.in_progress.length === 0 ? (
                  <p className="text-gray-500">진행중인 요청이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {requests.in_progress.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <h4 className="font-medium">{request.title}</h4>
                        {request.description && (
                          <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(request.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
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
                      총 {requests.completed.length}건 (확인 안된 항목만 표시)
                    </div>
                    <div className="space-y-4">
                      {requests.completed
                        .filter((r) => !confirmedRequestIds.has(r.id))
                        .map((request) => {
                          // 처리 완료 내용 추출
                          const hasCompletionDetails = request.completion_description || request.completion_photo_url
                          const isViewing = viewingCompletedRequestId === request.id
                          
                          return (
                            <div 
                              key={request.id} 
                              className={`border rounded-lg p-4 transition-all ${
                                confirmedRequestIds.has(request.id) ? 'opacity-60 bg-gray-50' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{request.title}</h4>
                                    {confirmedRequestIds.has(request.id) && (
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
                                </div>
                                {!confirmedRequestIds.has(request.id) && (
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
                        })}
                      {requests.completed.filter((r) => !confirmedRequestIds.has(r.id)).length === 0 && (
                        <p className="text-sm text-gray-500">확인 안된 처리완료 항목이 없습니다.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 요청 생성 모달 */}
      {showRequestCreateModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRequestCreateModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">요청 작성</h2>
              <button onClick={() => setShowRequestCreateModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
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

      {/* 이미지 확대 모달 */}
      {selectedImage && (
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
    </div>
  )
}
