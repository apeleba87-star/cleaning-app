'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'

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
}

interface LostItem {
  id: string
  type: string
  description: string | null
  photo_url: string | null
  status: string
  created_at: string
}

interface Request {
  id: string
  title: string
  description: string | null
  status: string
  confirmed_at: string | null
  completion_photo_url: string | null
  created_at: string
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
  const [requests, setRequests] = useState<{ in_progress: Request[]; completed: Request[] }>({ in_progress: [], completed: [] })
  const [confirmedRequestIds, setConfirmedRequestIds] = useState<Set<string>>(new Set())
  const [confirmedProblemIds, setConfirmedProblemIds] = useState<Set<string>>(new Set())
  const [confirmedLostItemIds, setConfirmedLostItemIds] = useState<Set<string>>(new Set())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showCompletionForm, setShowCompletionForm] = useState<string | null>(null)
  const [completionDescription, setCompletionDescription] = useState('')
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([])
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
        setStoreStatuses(data.data || [])
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
      
      if (problemResponse.ok) {
        setProblemReports(problemData.data || { store_problems: [], vending_problems: [] })
      }
      if (lostResponse.ok) {
        setLostItems(lostData.data || [])
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
        setRequests(data.data || { in_progress: [], completed: [] })
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
      }
    } catch (error) {
      console.error('Error confirming request:', error)
      alert('확인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleConfirmProblem = async (problemId: string) => {
    try {
      const response = await fetch(`/api/business/problem-reports/${problemId}/confirm`, {
        method: 'PATCH',
      })

      if (response.ok) {
        setConfirmedProblemIds((prev) => new Set(prev).add(problemId))
        // 상태 갱신
        loadStoreStatuses()
        handleOpenProblemModal(selectedStore!)
      }
    } catch (error) {
      console.error('Error confirming problem:', error)
      alert('확인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleConfirmLostItem = async (lostItemId: string) => {
    try {
      const response = await fetch(`/api/business/lost-items/${lostItemId}/confirm`, {
        method: 'PATCH',
      })

      if (response.ok) {
        setConfirmedLostItemIds((prev) => new Set(prev).add(lostItemId))
        // 상태 갱신
        loadStoreStatuses()
        handleOpenProblemModal(selectedStore!)
      }
    } catch (error) {
      console.error('Error confirming lost item:', error)
      alert('확인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleCompleteStoreProblem = async (problemId: string) => {
    try {
      const response = await fetch(`/api/business/problem-reports/${problemId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: completionDescription,
          photo_urls: completionPhotos,
        }),
      })

      if (response.ok) {
        setShowCompletionForm(null)
        setCompletionDescription('')
        setCompletionPhotos([])
        // 상태 갱신
        loadStoreStatuses()
        handleOpenProblemModal(selectedStore!)
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
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">매장 상태</h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => loadStoreStatuses()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            수동 새로고침
          </button>
          <Link
            href="/business/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← 대시보드로
          </Link>
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>새로고침을 해야 출근 상태가 정확합니다.</strong> 자동 새로고침은 30분마다 실행되며, 오전 8시부터 저녁 11시까지만 작동합니다.
        </p>
      </div>

      {sortedStores.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">매장이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedStores.map((status) => {
            const totalProblems = status.store_problem_count + status.vending_problem_count + status.lost_item_count
            const hasRequests = status.in_progress_request_count > 0 || status.completed_request_count > 0
            
            return (
              <div
                key={status.store_id}
                className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 ${
                  !status.is_work_day
                    ? 'border-gray-300 opacity-60'
                    : status.has_problem
                    ? 'border-red-500'
                    : 'border-green-500'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{status.store_name}</h2>
                  <div className="flex items-center gap-2">
                    {status.work_day && (
                      <span className="text-sm text-gray-500">작업일: {status.work_day}</span>
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 제품입고 및 보관 상태 */}
                  <div
                    onClick={() => handleOpenInventoryModal(status)}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      제품입고 및 보관 상태
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">오늘 제품 입고</span>
                        <span className={`text-sm font-semibold ${status.has_product_inflow_today ? 'text-green-600' : 'text-gray-400'}`}>
                          {status.has_product_inflow_today ? '있음' : '없음'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">보관 사진</span>
                        <span className={`text-sm font-semibold ${status.has_storage_photos ? 'text-green-600' : 'text-gray-400'}`}>
                          {status.has_storage_photos ? '있음' : '없음'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 매장 상황 */}
                  <div
                    onClick={() => handleOpenProblemModal(status)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      totalProblems > 0
                        ? 'border-red-200 bg-red-50 hover:bg-red-100'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      매장 상황
                    </h3>
                    <div className="space-y-2">
                      {status.store_problem_count > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-sm text-gray-700">매장 문제 보고</span>
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
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
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
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
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
                  <div
                    onClick={() => handleOpenRequestModal(status)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      hasRequests
                        ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      요청란 상황
                    </h3>
                    <div className="space-y-2">
                      {status.in_progress_request_count > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">진행중</span>
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
            )
          })}
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
                          {photo.photo_type === 'product_receipt' ? '제품 입고' : '주문서'}
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
                          {photo.photo_type === 'store_storage' ? '매장 보관' : '택배함'}
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
                <h3 className="text-lg font-medium mb-3">매장 문제 보고</h3>
                {problemReports.store_problems.length === 0 ? (
                  <p className="text-gray-500">매장 문제 보고 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {problemReports.store_problems.map((problem) => (
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
                          {problem.status !== 'completed' && (
                            <button
                              onClick={() => setShowCompletionForm(problem.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              처리 완료
                            </button>
                          )}
                        </div>
                        {showCompletionForm === problem.id && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                            <textarea
                              value={completionDescription}
                              onChange={(e) => setCompletionDescription(e.target.value)}
                              placeholder="처리 완료 설명을 입력하세요"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCompleteStoreProblem(problem.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
                  </div>
                )}
              </div>

              {/* 자판기 내부 문제 */}
              <div>
                <h3 className="text-lg font-medium mb-3">자판기 내부 문제</h3>
                {problemReports.vending_problems.length === 0 ? (
                  <p className="text-gray-500">자판기 내부 문제 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {problemReports.vending_problems
                      .filter((p) => !confirmedProblemIds.has(p.id))
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
                  </div>
                )}
              </div>

              {/* 분실물 습득 */}
              <div>
                <h3 className="text-lg font-medium mb-3">분실물 습득</h3>
                {lostItems.length === 0 ? (
                  <p className="text-gray-500">분실물 습득 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {lostItems
                      .filter((item) => !confirmedLostItemIds.has(item.id))
                      .map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{item.type}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(item.created_at).toLocaleString('ko-KR')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleConfirmLostItem(item.id)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              확인
                            </button>
                          </div>
                          {item.photo_url && (
                            <div className="mt-2">
                              {getPhotoUrls(item.photo_url).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`${item.type} 사진 ${idx + 1}`}
                                  className="w-32 h-32 object-cover rounded cursor-pointer mr-2"
                                  onClick={() => setSelectedImage(url)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
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
              {/* 진행중 */}
              <div>
                <h3 className="text-lg font-medium mb-3">진행중</h3>
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
                  <div className="space-y-4">
                    {requests.completed
                      .filter((r) => !confirmedRequestIds.has(r.id))
                      .map((request) => (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{request.title}</h4>
                              {request.description && (
                                <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(request.created_at).toLocaleString('ko-KR')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleConfirmRequest(request.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              확인
                            </button>
                          </div>
                          {request.completion_photo_url && (
                            <div className="mt-2">
                              {getPhotoUrls(request.completion_photo_url).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`${request.title} 완료 사진 ${idx + 1}`}
                                  className="w-32 h-32 object-cover rounded cursor-pointer mr-2"
                                  onClick={() => setSelectedImage(url)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
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
