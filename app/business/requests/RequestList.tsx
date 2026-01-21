'use client'

import { useState, useEffect } from 'react'
import { Request, RequestStatus } from '@/types/db'
import { PhotoUploader } from '@/components/PhotoUploader'

interface RequestWithRelations extends Request {
  users: { id: string; name: string } | null
  stores: { id: string; name: string } | null
}

interface RequestListProps {
  initialRequests: RequestWithRelations[]
  storeMap: Map<string, string>
}

export default function RequestList({ initialRequests, storeMap }: RequestListProps) {
  const [requests, setRequests] = useState<RequestWithRelations[]>(initialRequests)
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false) // 아카이브 보기 여부
  const [showAllPeriod, setShowAllPeriod] = useState(false) // 전체 기간 보기 여부
  const [loading, setLoading] = useState(false)
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null)
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null)
  const [completionPhoto, setCompletionPhoto] = useState<string>('')
  const [completionDescription, setCompletionDescription] = useState<string>('')
  const [rejectionDescription, setRejectionDescription] = useState<string>('')
  const [completing, setCompleting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null) // 확대 보기 중인 이미지

  // ESC 키로 이미지 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingImage) {
        setViewingImage(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [viewingImage])

  // 아카이브 및 전체 기간 필터링
  const filteredRequests = requests.filter(request => {
    // 아카이브 필터
    if (!showArchived && request.is_archived) {
      return false
    }
    if (showArchived && !request.is_archived) {
      return false
    }
    // 상태 필터
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false
    }
    return true
  })

  const getStatusLabel = (status: RequestStatus) => {
    switch (status) {
      case 'received':
        return '접수'
      case 'in_progress':
        return '진행중'
      case 'completed':
        return '완료'
      case 'rejected':
        return '거부됨'
      default:
        return status
    }
  }

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'received':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200'
      case 'in_progress':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200'
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200'
      case 'rejected':
        return 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleConfirm = async (requestId: string) => {
    try {
      console.log('Confirming request:', requestId)
      const response = await fetch(`/api/business/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        const text = await response.text()
        console.error('Response text:', text)
        alert('서버 응답을 파싱할 수 없습니다.')
        return
      }

      console.log('Confirm response:', { status: response.status, ok: response.ok, data })

      if (response.ok && data.success) {
        setRequests(prev => prev.map(r => 
          r.id === requestId ? { ...r, status: 'in_progress' } : r
        ))
        alert('요청이 처리중으로 변경되었습니다.')
      } else {
        const errorMessage = data.error || data.message || `요청 확인에 실패했습니다. (${response.status})`
        console.error('Confirm request error:', { status: response.status, statusText: response.statusText, data })
        alert(errorMessage)
      }
    } catch (error: any) {
      console.error('Error confirming request:', error)
      alert(error.message || '요청 확인 중 오류가 발생했습니다.')
    }
  }

  const handleComplete = async () => {
    if (!completingRequestId) return

    try {
      setCompleting(true)
      const response = await fetch(`/api/business/requests/${completingRequestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completion_photo_url: completionPhoto.trim() || null,
          completion_description: completionDescription.trim() || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRequests(prev => prev.map(r => 
            r.id === completingRequestId 
              ? { ...r, status: 'completed', completion_photo_url: completionPhoto || null, completion_description: completionDescription || null }
              : r
          ))
          alert('요청 처리가 완료되었습니다.')
          setCompletingRequestId(null)
          setCompletionPhoto('')
          setCompletionDescription('')
        } else {
          alert(data.error || '처리 완료에 실패했습니다.')
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

  const handleReject = async () => {
    if (!rejectingRequestId) return

    try {
      setRejecting(true)
      const response = await fetch(`/api/business/requests/${rejectingRequestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejection_description: rejectionDescription.trim() || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRequests(prev => prev.map(r => 
            r.id === rejectingRequestId 
              ? { ...r, status: 'rejected', rejection_description: rejectionDescription || null }
              : r
          ))
          alert('요청이 반려되었습니다.')
          setRejectingRequestId(null)
          setRejectionDescription('')
        } else {
          alert(data.error || '반려 처리에 실패했습니다.')
        }
      } else {
        const data = await response.json()
        alert(data.error || '반려 처리에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      alert('반려 처리 중 오류가 발생했습니다.')
    } finally {
      setRejecting(false)
    }
  }

  // 전체 기간 보기: 아카이브된 요청도 포함하여 로드
  const handleLoadAllPeriod = async () => {
    if (showAllPeriod) {
      // 이미 전체 기간 보기 중이면 원래 데이터로 복원
      setRequests(initialRequests)
      setShowAllPeriod(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/business/requests?include_archived=true&all_period=true')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRequests(data.data || [])
          setShowAllPeriod(true)
        }
      }
    } catch (error) {
      console.error('Error loading all period requests:', error)
      alert('전체 기간 요청을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 아카이브 보기: 아카이브된 요청만 로드
  const handleLoadArchived = async () => {
    if (showArchived) {
      // 이미 아카이브 보기 중이면 원래 데이터로 복원
      setRequests(initialRequests)
      setShowArchived(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/business/requests?include_archived=true&archived_only=true')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRequests(data.data || [])
          setShowArchived(true)
        }
      }
    } catch (error) {
      console.error('Error loading archived requests:', error)
      alert('아카이브된 요청을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* PC 화면: 필터와 액션 버튼을 분리된 영역으로 배치 */}
      <div className="mb-6 space-y-4">
        {/* 상태 필터 영역 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap hidden sm:inline">상태 필터:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setStatusFilter('received')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                statusFilter === 'received'
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md shadow-yellow-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              접수
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                statusFilter === 'in_progress'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              진행중
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                statusFilter === 'completed'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md shadow-green-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              완료
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                statusFilter === 'rejected'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              거부됨
            </button>
          </div>
        </div>
        
        {/* 아카이브 및 전체 기간 보기 옵션 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap hidden sm:inline">보기 옵션:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleLoadArchived}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                showArchived
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? '로딩 중...' : showArchived ? '아카이브 숨기기' : '아카이브 보기'}
            </button>
            <button
              onClick={handleLoadAllPeriod}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                showAllPeriod
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? '로딩 중...' : showAllPeriod ? '최근 30일만 보기' : '전체 기간 보기'}
            </button>
          </div>
        </div>
      </div>

      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">
                매장
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[38%]">
                제목
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[10%]">
                작성자
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[8%]">
                상태
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">
                작성일
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[20%]">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">요청이 없습니다</p>
                    <p className="text-sm text-gray-400 mt-1">새로운 요청이 등록되면 여기에 표시됩니다</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr key={request.id} className={`group hover:bg-blue-50/50 transition-colors duration-200 ${request.status === 'completed' || request.status === 'rejected' ? 'opacity-75' : ''}`}>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {request.stores?.name || storeMap.get(request.store_id) || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`text-base font-semibold ${request.status === 'completed' || request.status === 'rejected' ? 'text-gray-500' : 'text-gray-900'}`}>
                      {request.title}
                    </div>
                    {request.description && (
                      <div className={`text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words leading-relaxed ${request.status === 'completed' || request.status === 'rejected' ? 'text-gray-400' : ''}`}>
                        {request.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={`text-sm font-medium ${request.status === 'completed' || request.status === 'rejected' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {request.users?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(request.status)}`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={`text-sm font-medium ${request.status === 'completed' || request.status === 'rejected' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(request.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {request.status === 'received' && (
                      <button
                        onClick={() => handleConfirm(request.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                      >
                        요청 확인
                      </button>
                    )}
                    {request.status === 'in_progress' && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => setCompletingRequestId(request.id)}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                        >
                          처리 완료
                        </button>
                        <button
                          onClick={() => setRejectingRequestId(request.id)}
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                        >
                          반려
                        </button>
                      </div>
                    )}
                    {request.status === 'completed' && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-1.5 mb-2">
                          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs text-green-700 font-semibold">완료됨</span>
                        </div>
                        {(request as any).storage_location && (
                          <div className="text-xs text-gray-700 mt-2 mb-2">
                            <span className="font-semibold text-green-800">보관장소:</span> {(request as any).storage_location}
                          </div>
                        )}
                        {request.completion_description && (
                          <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap break-words leading-relaxed">
                            <span className="font-semibold text-green-800">상세내용:</span> {request.completion_description}
                          </div>
                        )}
                        {request.completion_photo_url && (
                          <div className="mt-3">
                            <img
                              src={request.completion_photo_url}
                              alt="처리 완료 사진"
                              className="w-24 h-24 object-cover rounded-lg border border-green-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setViewingImage(request.completion_photo_url || null)}
                            />
                            <p className="text-xs text-gray-500 mt-1">클릭하여 크게 보기</p>
                          </div>
                        )}
                      </div>
                    )}
                    {request.status === 'rejected' && (
                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <div className="flex items-center gap-1.5 mb-2">
                          <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-xs text-red-700 font-semibold">반려됨</span>
                        </div>
                        {request.rejection_description && (
                          <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap break-words leading-relaxed">
                            <span className="font-semibold text-red-800">반려 사유:</span> {request.rejection_description}
                          </div>
                        )}
                        {request.rejection_photo_url && (
                          <div className="mt-3">
                            <img
                              src={request.rejection_photo_url}
                              alt="반려 사진"
                              className="w-24 h-24 object-cover rounded-lg border border-red-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setViewingImage(request.rejection_photo_url || null)}
                            />
                            <p className="text-xs text-gray-500 mt-1">클릭하여 크게 보기</p>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">요청이 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">새로운 요청이 등록되면 여기에 표시됩니다</p>
            </div>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border-l-4 ${
                request.status === 'completed' || request.status === 'rejected' 
                  ? 'opacity-75 border-gray-300' 
                  : 'border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-base font-bold ${request.status === 'completed' || request.status === 'rejected' ? 'text-gray-500' : 'text-gray-900'}`}>
                      {request.title}
                    </span>
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(request.status)}`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3 space-x-2">
                    <span className="font-medium">{request.stores?.name || storeMap.get(request.store_id) || '-'}</span>
                    <span>·</span>
                    <span>{request.users?.name || '-'}</span>
                    <span>·</span>
                    <span>{new Date(request.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {request.description && (
                    <div className={`text-sm text-gray-600 mt-2 whitespace-normal break-words leading-relaxed ${request.status === 'completed' || request.status === 'rejected' ? 'text-gray-400' : ''}`}>
                      {request.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                {request.status === 'received' && (
                  <button
                    onClick={() => handleConfirm(request.id)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 text-sm font-medium shadow-sm hover:shadow transition-all duration-200"
                  >
                    요청 확인
                  </button>
                )}
                {request.status === 'in_progress' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCompletingRequestId(request.id)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-medium shadow-sm hover:shadow transition-all duration-200"
                    >
                      처리 완료
                    </button>
                    <button
                      onClick={() => setRejectingRequestId(request.id)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 text-sm font-medium shadow-sm hover:shadow transition-all duration-200"
                    >
                      반려
                    </button>
                  </div>
                )}
                {request.status === 'completed' && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-700 font-semibold">완료됨</span>
                    </div>
                    {(request as any).storage_location && (
                      <div className="text-xs text-gray-700 mt-2 mb-2">
                        <span className="font-semibold text-green-800">보관장소:</span> {(request as any).storage_location}
                      </div>
                    )}
                    {request.completion_description && (
                      <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap break-words leading-relaxed">
                        <span className="font-semibold text-green-800">상세내용:</span> {request.completion_description}
                      </div>
                    )}
                    {request.completion_photo_url && (
                      <div className="mt-3">
                        <img
                          src={request.completion_photo_url}
                          alt="처리 완료 사진"
                          className="w-full h-40 object-cover rounded-lg border border-green-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setViewingImage(request.completion_photo_url || null)}
                        />
                        <p className="text-xs text-gray-500 mt-1 text-center">클릭하여 크게 보기</p>
                      </div>
                    )}
                  </div>
                )}
                {request.status === 'rejected' && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-red-700 font-semibold">반려됨</span>
                    </div>
                    {request.rejection_description && (
                      <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap break-words leading-relaxed">
                        <span className="font-semibold text-red-800">반려 사유:</span> {request.rejection_description}
                      </div>
                    )}
                    {request.rejection_photo_url && (
                      <div className="mt-3">
                        <img
                          src={request.rejection_photo_url}
                          alt="반려 사진"
                          className="w-full h-40 object-cover rounded-lg border border-red-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setViewingImage(request.rejection_photo_url || null)}
                        />
                        <p className="text-xs text-gray-500 mt-1 text-center">클릭하여 크게 보기</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 처리 완료 모달 */}
      {completingRequestId && (() => {
        const completingRequest = requests.find(r => r.id === completingRequestId)
        if (!completingRequest) return null
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-md shadow-green-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">요청 처리 완료</h2>
              </div>
              
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
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

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                처리 내용 설명 (선택)
              </label>
              <textarea
                value={completionDescription}
                onChange={(e) => setCompletionDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                rows={4}
                placeholder="처리 내용을 입력하세요..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setCompletingRequestId(null)
                  setCompletionPhoto('')
                  setCompletionDescription('')
                }}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
                disabled={completing}
              >
                취소
              </button>
              <button
                onClick={handleComplete}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-medium shadow-md shadow-green-500/30 hover:shadow-lg transition-all duration-200"
                disabled={completing}
              >
                {completing ? '처리 중...' : '완료'}
              </button>
            </div>
            </div>
          </div>
        )
      })()}

      {/* 반려 모달 */}
      {rejectingRequestId && (() => {
        const rejectingRequest = requests.find(r => r.id === rejectingRequestId)
        if (!rejectingRequest) return null
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md shadow-red-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">요청 반려</h2>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  반려 사유 (선택)
                </label>
                <textarea
                  value={rejectionDescription}
                  onChange={(e) => setRejectionDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  rows={4}
                  placeholder="반려 사유를 입력하세요..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setRejectingRequestId(null)
                    setRejectionDescription('')
                  }}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
                  disabled={rejecting}
                >
                  취소
                </button>
                <button
                  onClick={handleReject}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 font-medium shadow-md shadow-red-500/30 hover:shadow-lg transition-all duration-200"
                  disabled={rejecting}
                >
                  {rejecting ? '처리 중...' : '반려'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
