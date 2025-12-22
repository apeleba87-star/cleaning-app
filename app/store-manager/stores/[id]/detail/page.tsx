'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MonthlyReport from './MonthlyReport'

interface BeforeAfterPhoto {
  id: string
  before_photo_url: string | null
  after_photo_url: string | null
  area: string
  created_at: string
  work_date: string
}

interface ProductInflowPhoto {
  id: string
  photo_url: string
  photo_type: string
  description: string | null
  created_at: string
}

interface StoragePhoto {
  id: string
  photo_url: string
  description: string | null
  created_at: string
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
}

interface StoreDetailData {
  before_after_photos: BeforeAfterPhoto[]
  product_inflow_photos: ProductInflowPhoto[]
  storage_photos: StoragePhoto[]
  problem_reports: ProblemReport[]
  lost_items: LostItem[]
  requests: Request[]
}

export default function StoreDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const storeId = params.id as string
  const requestStatus = searchParams.get('requestStatus') as 'received' | 'in_progress' | 'completed' | null

  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'7days' | '30days' | 'thisMonth' | 'custom' | 'monthlyReport'>('7days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [detailData, setDetailData] = useState<StoreDetailData>({
    before_after_photos: [],
    product_inflow_photos: [],
    storage_photos: [],
    problem_reports: [],
    lost_items: [],
    requests: [],
  })
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageInfo, setSelectedImageInfo] = useState<{
    url: string
    area: string
    type: 'before' | 'after'
    allPhotos: Array<{ url: string; area: string; type: 'before' | 'after' }>
    currentIndex: number
  } | null>(null)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [confirmedRequestIds, setConfirmedRequestIds] = useState<Set<string>>(new Set())

  // 확인된 요청 ID 로드 (localStorage에서)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const storageKey = `confirmed_requests_${storeId}_${today}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const ids = JSON.parse(stored)
        setConfirmedRequestIds(new Set(ids))
      } catch (e) {
        console.error('Error loading confirmed requests:', e)
      }
    }
  }, [storeId])

  useEffect(() => {
    loadStoreInfo()
  }, [storeId])

  useEffect(() => {
    if (activeTab === 'custom' && (!customStartDate || !customEndDate)) {
      setLoading(false)
      return
    }
    if (activeTab !== 'monthlyReport') {
      loadDetailData()
      // 탭 변경 시 확장된 날짜 목록 초기화
      setExpandedDates(new Set())
    }
  }, [storeId, activeTab, customStartDate, customEndDate])

  const loadStoreInfo = async () => {
    try {
      const response = await fetch(`/api/store-manager/stores/${storeId}`)
      const data = await response.json()

      if (response.ok && data.data) {
        setStoreName(data.data.name || '')
      }
    } catch (err) {
      console.error('Error loading store info:', err)
    }
  }

  const getDateRange = () => {
    const today = new Date()
    let endDate = new Date(today)
    endDate.setHours(23, 59, 59, 999)

    let startDate: Date

    if (activeTab === '7days') {
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7)
    } else if (activeTab === '30days') {
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 30)
    } else if (activeTab === 'thisMonth') {
      // 이번달
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    } else {
      // 기간 선택
      if (!customStartDate || !customEndDate) {
        // 기본값: 최근 7일
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 7)
      } else {
        startDate = new Date(customStartDate)
        const customEnd = new Date(customEndDate)
        customEnd.setHours(23, 59, 59, 999)
        endDate = customEnd

        // 최대 3개월 체크
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays > 90) {
          // 기본값으로 되돌림
          startDate = new Date(today)
          startDate.setDate(startDate.getDate() - 7)
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
        }
      }
    }

    startDate.setHours(0, 0, 0, 0)

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
  }

  const loadDetailData = async () => {
    try {
      setLoading(true)
      const { startDate, endDate } = getDateRange()

      const response = await fetch(
        `/api/store-manager/stores/${storeId}/detail-data?start_date=${startDate}&end_date=${endDate}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러오는데 실패했습니다.')
      }

      setDetailData(data.data || {
        before_after_photos: [],
        product_inflow_photos: [],
        storage_photos: [],
        problem_reports: [],
        lost_items: [],
        requests: [],
      })
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = dayNames[date.getDay()]
    return `${month}월 ${day}일 (${dayName})`
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${month}/${day} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const getPhotoUrls = (photoUrl: string | null): string[] => {
    if (!photoUrl) return []
    try {
      const parsed = JSON.parse(photoUrl)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return photoUrl ? [photoUrl] : []
    }
  }

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      received: '접수',
      in_progress: '처리중',
      completed: '처리완료',
      rejected: '반려처리',
      pending: '대기중',
      confirmed: '확인',
      unconfirmed: '미확인',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      received: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-green-100 text-green-800',
      unconfirmed: 'bg-yellow-100 text-yellow-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  // 날짜별로 데이터 그룹화
  const groupDataByDate = () => {
    const grouped: {
      [date: string]: {
        before_after_photos: BeforeAfterPhoto[]
        product_inflow_photos: ProductInflowPhoto[]
        storage_photos: StoragePhoto[]
        problem_reports: ProblemReport[]
        lost_items: LostItem[]
        requests: Request[]
      }
    } = {}

    const getDateKey = (dateString: string) => {
      return dateString.split('T')[0]
    }

    // 관리전후 사진
    detailData.before_after_photos.forEach((photo) => {
      const dateKey = getDateKey(photo.work_date || photo.created_at)
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          before_after_photos: [],
          product_inflow_photos: [],
          storage_photos: [],
          problem_reports: [],
          lost_items: [],
          requests: [],
        }
      }
      grouped[dateKey].before_after_photos.push(photo)
    })

    // 제품 입고 사진
    detailData.product_inflow_photos.forEach((photo) => {
      const dateKey = getDateKey(photo.created_at)
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          before_after_photos: [],
          product_inflow_photos: [],
          storage_photos: [],
          problem_reports: [],
          lost_items: [],
          requests: [],
        }
      }
      grouped[dateKey].product_inflow_photos.push(photo)
    })

    // 보관 사진
    detailData.storage_photos.forEach((photo) => {
      const dateKey = getDateKey(photo.created_at)
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          before_after_photos: [],
          product_inflow_photos: [],
          storage_photos: [],
          problem_reports: [],
          lost_items: [],
          requests: [],
        }
      }
      grouped[dateKey].storage_photos.push(photo)
    })

    // 매장 문제 보고
    detailData.problem_reports.forEach((problem) => {
      const dateKey = getDateKey(problem.created_at)
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          before_after_photos: [],
          product_inflow_photos: [],
          storage_photos: [],
          problem_reports: [],
          lost_items: [],
          requests: [],
        }
      }
      grouped[dateKey].problem_reports.push(problem)
    })

    // 분실물
    detailData.lost_items.forEach((item) => {
      const dateKey = getDateKey(item.created_at)
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          before_after_photos: [],
          product_inflow_photos: [],
          storage_photos: [],
          problem_reports: [],
          lost_items: [],
          requests: [],
        }
      }
      grouped[dateKey].lost_items.push(item)
    })

    // 요청란
    detailData.requests.forEach((request) => {
      const dateKey = getDateKey(request.created_at)
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          before_after_photos: [],
          product_inflow_photos: [],
          storage_photos: [],
          problem_reports: [],
          lost_items: [],
          requests: [],
        }
      }
      grouped[dateKey].requests.push(request)
    })

    // 날짜순으로 정렬 (최신순)
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const toggleDateExpansion = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  const shouldGroupByDate = activeTab === '30days' || activeTab === 'thisMonth' || activeTab === 'custom'
  const groupedData = shouldGroupByDate ? groupDataByDate() : []

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{storeName || '매장 상세'}</h1>
          <Link
            href="/store-manager/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← 대시보드로
          </Link>
        </div>
      </div>

      {/* 기간별 탭 - 요청 상태 필터링 시 숨김 */}
      {!requestStatus && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-4 border-b">
            <button
              onClick={() => setActiveTab('7days')}
              className={`px-4 py-2 font-medium ${
                activeTab === '7days'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              최근 7일
            </button>
            <button
              onClick={() => setActiveTab('30days')}
              className={`px-4 py-2 font-medium ${
                activeTab === '30days'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              최근 30일
            </button>
            <button
              onClick={() => setActiveTab('thisMonth')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'thisMonth'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              이번달
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'custom'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              기간 선택
            </button>
            <button
              onClick={() => setActiveTab('monthlyReport')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'monthlyReport'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              월간 리포트
            </button>
          </div>
          {activeTab === 'custom' && (
          <div className="flex flex-col md:flex-row gap-4 items-end pt-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">시작일</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value)
                  setError(null)
                }}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">종료일</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value)
                  setError(null)
                  // 시작일보다 이전 날짜 선택 방지
                  if (customStartDate && e.target.value < customStartDate) {
                    setError('종료일은 시작일보다 이후여야 합니다.')
                  }
                  // 최대 3개월 체크
                  if (customStartDate) {
                    const start = new Date(customStartDate)
                    const end = new Date(e.target.value)
                    const diffTime = Math.abs(end.getTime() - start.getTime())
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    if (diffDays > 90) {
                      setError('날짜 범위는 최대 3개월(90일)까지 선택 가능합니다.')
                    }
                  }
                }}
                min={customStartDate || undefined}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-gray-500 self-end pb-2">
              최대 3개월(90일)까지 선택 가능
            </div>
          </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading && activeTab !== 'monthlyReport' ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : activeTab === 'monthlyReport' ? (
        <MonthlyReport storeId={storeId} storeName={storeName} />
      ) : shouldGroupByDate ? (
        // 날짜별 그룹화된 뷰 (30일, 이번달)
        <div className="space-y-4">
          {groupedData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              데이터가 없습니다.
            </div>
          ) : (
            groupedData.map(([date, data]) => {
              const isExpanded = expandedDates.has(date)
              // 요청 상태 필터링 시 요청란만 확인
              const filteredRequests = requestStatus 
                ? data.requests.filter(r => r.status === requestStatus)
                : data.requests
              const hasData = requestStatus
                ? filteredRequests.length > 0
                : (data.before_after_photos.length > 0 ||
                   data.product_inflow_photos.length > 0 ||
                   data.storage_photos.length > 0 ||
                   data.problem_reports.length > 0 ||
                   data.lost_items.length > 0 ||
                   data.requests.length > 0)

              if (!hasData) return null

              return (
                <div key={date} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleDateExpansion(date)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-900">{formatDate(date)}</span>
                      <span className="text-sm text-gray-500">
                        (관리전후 {data.before_after_photos.length}건, 
                        제품입고 {data.product_inflow_photos.length}건, 
                        보관 {data.storage_photos.length}건, 
                        문제 {data.problem_reports.length}건, 
                        분실물 {data.lost_items.length}건, 
                        요청 {data.requests.length}건)
                      </span>
                    </div>
                    <span className="text-gray-400 text-xl">{isExpanded ? '▼' : '▶'}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-4 border-t space-y-6">
                      {/* 관리전후 사진 - 요청 상태 필터링 시 숨김 */}
                      {!requestStatus && data.before_after_photos.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">관리전후 사진</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.before_after_photos.map((photo) => (
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
                                        className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                                        onClick={() => {
                                          const allPhotos: Array<{ url: string; area: string; type: 'before' | 'after' }> = []
                                          data.before_after_photos.forEach((p) => {
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
                                    <div className="flex items-center justify-center h-32 bg-gray-100 rounded">
                                      <span className="text-xs text-gray-400">관리전 사진 없음</span>
                                    </div>
                                  )}
                                  {photo.after_photo_url ? (
                                    <div>
                                      <p className="text-xs text-gray-600 mb-1">관리후</p>
                                      <img
                                        src={photo.after_photo_url}
                                        alt="관리후"
                                        className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                                        onClick={() => {
                                          const allPhotos: Array<{ url: string; area: string; type: 'before' | 'after' }> = []
                                          data.before_after_photos.forEach((p) => {
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
                                    <div className="flex items-center justify-center h-32 bg-gray-100 rounded">
                                      <span className="text-xs text-gray-400">관리후 사진 없음</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 제품입고 및 보관상태 - 요청 상태 필터링 시 숨김 */}
                      {!requestStatus && (data.product_inflow_photos.length > 0 || data.storage_photos.length > 0) && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">제품입고 및 보관상태</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {data.product_inflow_photos.length > 0 && (
                              <div>
                                <h4 className="text-md font-medium mb-2">제품 입고 ({data.product_inflow_photos.length}건)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {data.product_inflow_photos.map((photo) => (
                                    <div key={photo.id} className="border rounded-lg overflow-hidden">
                                      <img
                                        src={photo.photo_url}
                                        alt="제품 입고"
                                        className="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                                        onClick={() => setSelectedImage(photo.photo_url)}
                                      />
                                      <div className="p-2 text-xs text-gray-600">
                                        {formatDateTime(photo.created_at)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {data.storage_photos.length > 0 && (
                              <div>
                                <h4 className="text-md font-medium mb-2">보관 사진 ({data.storage_photos.length}건)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {data.storage_photos.map((photo) => (
                                    <div key={photo.id} className="border rounded-lg overflow-hidden">
                                      <img
                                        src={photo.photo_url}
                                        alt="보관 사진"
                                        className="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                                        onClick={() => setSelectedImage(photo.photo_url)}
                                      />
                                      <div className="p-2 text-xs text-gray-600">
                                        {formatDateTime(photo.created_at)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 매장상황 - 요청 상태 필터링 시 숨김 */}
                      {!requestStatus && (data.problem_reports.length > 0 || data.lost_items.length > 0) && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">매장상황</h3>
                          <div className="space-y-4">
                            {data.problem_reports.length > 0 && (
                              <div>
                                <h4 className="text-md font-medium mb-2 text-red-700">매장 문제 보고 ({data.problem_reports.length}건)</h4>
                                <div className="space-y-3">
                                  {data.problem_reports.map((problem) => {
                                    const photos = getPhotoUrls(problem.photo_url)
                                    return (
                                      <div key={problem.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <h5 className="font-semibold text-gray-900">{problem.title}</h5>
                                            {problem.description && (
                                              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{problem.description}</p>
                                            )}
                                          </div>
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(problem.status)}`}>
                                            {getStatusLabel(problem.status)}
                                          </span>
                                        </div>
                                        {photos.length > 0 && (
                                          <div className="flex gap-2 mt-3">
                                            {photos.map((url, idx) => (
                                              <img
                                                key={idx}
                                                src={url}
                                                alt={`문제 사진 ${idx + 1}`}
                                                className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                                onClick={() => setSelectedImage(url)}
                                              />
                                            ))}
                                          </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">{formatDateTime(problem.created_at)}</p>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            {data.lost_items.length > 0 && (
                              <div>
                                <h4 className="text-md font-medium mb-2 text-blue-700">분실물 습득 ({data.lost_items.length}건)</h4>
                                <div className="space-y-3">
                                  {data.lost_items.map((item) => {
                                    const photos = getPhotoUrls(item.photo_url)
                                    return (
                                      <div key={item.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <h5 className="font-semibold text-gray-900">{item.type}</h5>
                                            {item.description && (
                                              <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                                            )}
                                            {item.storage_location && (
                                              <p className="text-sm text-gray-600 mt-1">보관 위치: {item.storage_location}</p>
                                            )}
                                          </div>
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                                            {getStatusLabel(item.status)}
                                          </span>
                                        </div>
                                        {photos.length > 0 && (
                                          <div className="flex gap-2 mt-3">
                                            {photos.map((url, idx) => (
                                              <img
                                                key={idx}
                                                src={url}
                                                alt={`분실물 사진 ${idx + 1}`}
                                                className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                                onClick={() => setSelectedImage(url)}
                                              />
                                            ))}
                                          </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">{formatDateTime(item.created_at)}</p>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 요청란 */}
                      {filteredRequests.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">
                            요청란 ({filteredRequests.length}건)
                            {requestStatus && (
                              <span className="ml-2 text-sm font-normal text-gray-600">
                                ({requestStatus === 'received' ? '접수' : requestStatus === 'in_progress' ? '처리중' : '처리완료'})
                              </span>
                            )}
                          </h3>
                          <div className="space-y-3">
                            {filteredRequests.map((request) => {
                              const photos = getPhotoUrls(request.photo_url)
                              return (
                                <div key={request.id} className="border rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h5 className="font-semibold text-gray-900">{request.title}</h5>
                                      {request.description && (
                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{request.description}</p>
                                      )}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                                      {getStatusLabel(request.status)}
                                    </span>
                                  </div>
                                  {photos.length > 0 && (
                                    <div className="flex gap-2 mt-3">
                                      {photos.map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={url}
                                          alt={`요청 사진 ${idx + 1}`}
                                          className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                          onClick={() => setSelectedImage(url)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {request.status === 'completed' && request.completion_photo_url && (
                                    <div className="mt-3 p-3 bg-green-50 rounded">
                                      <p className="text-sm font-medium text-green-800 mb-1">처리 완료</p>
                                      {request.completion_description && (
                                        <p className="text-sm text-green-700">{request.completion_description}</p>
                                      )}
                                      {getPhotoUrls(request.completion_photo_url).map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={url}
                                          alt={`처리 완료 사진 ${idx + 1}`}
                                          className="w-20 h-20 object-cover rounded mt-2 cursor-pointer hover:opacity-80"
                                          onClick={() => setSelectedImage(url)}
                                        />
                                      ))}
                                      {request.completed_by_user && (
                                        <p className="text-xs text-green-600 mt-1">
                                          처리자: {request.completed_by_user.name}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {request.status === 'rejected' && request.rejection_description && (
                                    <div className="mt-3 p-3 bg-red-50 rounded">
                                      <p className="text-sm font-medium text-red-800 mb-1">반려 사유</p>
                                      <p className="text-sm text-red-700">{request.rejection_description}</p>
                                      {request.rejected_by_user && (
                                        <p className="text-xs text-red-600 mt-1">
                                          반려자: {request.rejected_by_user.name}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500 mt-2">{formatDateTime(request.created_at)}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        // 기존 뷰 (최근 7일) - business 앱과 동일한 구조
        <div className="space-y-6">
          {/* 관리전후 사진 - 요청 상태 필터링 시 숨김 */}
          {!requestStatus && (
            <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">관리전후 사진</h2>
            {detailData.before_after_photos.length === 0 ? (
              <p className="text-gray-500">관리전후 사진이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {detailData.before_after_photos.map((photo) => (
                  <div key={photo.id} className="border rounded-lg overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b">
                      <h4 className="text-sm font-semibold text-gray-700">{photo.area || '구역 미지정'}</h4>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(photo.work_date || photo.created_at)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {photo.before_photo_url ? (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">관리전</p>
                          <img
                            src={photo.before_photo_url}
                            alt="관리전"
                            className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => {
                              const allPhotos: Array<{ url: string; area: string; type: 'before' | 'after' }> = []
                              detailData.before_after_photos.forEach((p) => {
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
                        <div className="flex items-center justify-center h-32 bg-gray-100 rounded">
                          <span className="text-xs text-gray-400">관리전 사진 없음</span>
                        </div>
                      )}
                      {photo.after_photo_url ? (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">관리후</p>
                          <img
                            src={photo.after_photo_url}
                            alt="관리후"
                            className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => {
                              const allPhotos: Array<{ url: string; area: string; type: 'before' | 'after' }> = []
                              detailData.before_after_photos.forEach((p) => {
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
                        <div className="flex items-center justify-center h-32 bg-gray-100 rounded">
                          <span className="text-xs text-gray-400">관리후 사진 없음</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {/* 제품입고 및 보관상태 - 요청 상태 필터링 시 숨김 */}
          {!requestStatus && (
            <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">제품입고 및 보관상태</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 제품 입고 */}
              <div>
                <h3 className="text-lg font-medium mb-3">제품 입고</h3>
                {detailData.product_inflow_photos.length === 0 ? (
                  <p className="text-gray-500">제품 입고 사진이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {detailData.product_inflow_photos.map((photo) => (
                      <div key={photo.id} className="border rounded-lg overflow-hidden">
                        <img
                          src={photo.photo_url}
                          alt="제품 입고"
                          className="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedImage(photo.photo_url)}
                        />
                        <div className="p-2 text-xs text-gray-600">
                          {formatDateTime(photo.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 보관 사진 */}
              <div>
                <h3 className="text-lg font-medium mb-3">보관 사진</h3>
                {detailData.storage_photos.length === 0 ? (
                  <p className="text-gray-500">보관 사진이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {detailData.storage_photos.map((photo) => (
                      <div key={photo.id} className="border rounded-lg overflow-hidden">
                        <img
                          src={photo.photo_url}
                          alt="보관 사진"
                          className="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedImage(photo.photo_url)}
                        />
                        <div className="p-2 text-xs text-gray-600">
                          {formatDateTime(photo.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {/* 매장상황 - 요청 상태 필터링 시 숨김 */}
          {!requestStatus && (
            <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">매장상황</h2>
            <div className="space-y-4">
              {/* 매장 문제 보고 */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-red-700">매장 문제 보고 ({detailData.problem_reports.length}건)</h3>
                {detailData.problem_reports.length === 0 ? (
                  <p className="text-gray-500">매장 문제 보고가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {detailData.problem_reports.map((problem) => {
                      const photos = getPhotoUrls(problem.photo_url)
                      return (
                        <div key={problem.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{problem.title}</h4>
                              {problem.description && (
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{problem.description}</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(problem.status)}`}>
                              {getStatusLabel(problem.status)}
                            </span>
                          </div>
                          {photos.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {photos.map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`문제 사진 ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => setSelectedImage(url)}
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">{formatDateTime(problem.created_at)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 분실물 습득 */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-blue-700">분실물 습득 ({detailData.lost_items.length}건)</h3>
                {detailData.lost_items.length === 0 ? (
                  <p className="text-gray-500">분실물 습득 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {detailData.lost_items.map((item) => {
                      const photos = getPhotoUrls(item.photo_url)
                      return (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{item.type}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                              )}
                              {item.storage_location && (
                                <p className="text-sm text-gray-600 mt-1">보관 위치: {item.storage_location}</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                          {photos.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {photos.map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`분실물 사진 ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => setSelectedImage(url)}
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">{formatDateTime(item.created_at)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {/* 요청란 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              요청란 ({detailData.requests.filter(r => !requestStatus || r.status === requestStatus).length}건)
              {requestStatus && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({requestStatus === 'received' ? '접수' : requestStatus === 'in_progress' ? '처리중' : '처리완료'})
                </span>
              )}
            </h2>
            {detailData.requests.filter(r => !requestStatus || r.status === requestStatus).length === 0 ? (
              <p className="text-gray-500">요청 내역이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {detailData.requests
                  .filter((request) => {
                    // 요청 상태 필터링
                    if (requestStatus && request.status !== requestStatus) {
                      return false
                    }
                    // 확인된 요청은 당일에만 보이고 다음날 사라짐
                    if (confirmedRequestIds.has(request.id)) {
                      const today = new Date().toISOString().split('T')[0]
                      const requestDate = new Date(request.created_at).toISOString().split('T')[0]
                      return requestDate === today
                    }
                    return true
                  })
                  .map((request) => {
                  const photos = getPhotoUrls(request.photo_url)
                  const isConfirmed = confirmedRequestIds.has(request.id)
                  return (
                    <div 
                      key={request.id} 
                      className={`border rounded-lg p-4 ${isConfirmed ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{request.title}</h4>
                          {request.description && (
                            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{request.description}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      {photos.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {photos.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`요청 사진 ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => setSelectedImage(url)}
                            />
                          ))}
                        </div>
                      )}
                      {request.status === 'completed' && request.completion_photo_url && (
                        <div className="mt-3 p-3 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-800 mb-1">처리 완료</p>
                          {request.completion_description && (
                            <p className="text-sm text-green-700">{request.completion_description}</p>
                          )}
                          {getPhotoUrls(request.completion_photo_url).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`처리 완료 사진 ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded mt-2 cursor-pointer hover:opacity-80"
                              onClick={() => setSelectedImage(url)}
                            />
                          ))}
                          {request.completed_by_user && (
                            <p className="text-xs text-green-600 mt-1">
                              처리자: {request.completed_by_user.name}
                            </p>
                          )}
                          {!confirmedRequestIds.has(request.id) && (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/business/requests/${request.id}/confirm`, {
                                    method: 'PATCH',
                                  })
                                  if (response.ok) {
                                    const today = new Date().toISOString().split('T')[0]
                                    const storageKey = `confirmed_requests_${storeId}_${today}`
                                    const newConfirmedIds = new Set(confirmedRequestIds)
                                    newConfirmedIds.add(request.id)
                                    setConfirmedRequestIds(newConfirmedIds)
                                    localStorage.setItem(storageKey, JSON.stringify(Array.from(newConfirmedIds)))
                                    // 데이터 새로고침
                                    loadDetailData()
                                  } else {
                                    alert('확인 처리에 실패했습니다.')
                                  }
                                } catch (error) {
                                  console.error('Error confirming request:', error)
                                  alert('확인 처리 중 오류가 발생했습니다.')
                                }
                              }}
                              className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              확인
                            </button>
                          )}
                        </div>
                      )}
                      {request.status === 'rejected' && request.rejection_description && (
                        <div className="mt-3 p-3 bg-red-50 rounded">
                          <p className="text-sm font-medium text-red-800 mb-1">반려 사유</p>
                          <p className="text-sm text-red-700">{request.rejection_description}</p>
                          {request.rejected_by_user && (
                            <p className="text-xs text-red-600 mt-1">
                              반려자: {request.rejected_by_user.name}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">{formatDateTime(request.created_at)}</p>
                    </div>
                  )
                })}
              </div>
            )}
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
    </div>
  )
}



