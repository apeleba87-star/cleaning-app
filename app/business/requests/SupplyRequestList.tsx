'use client'

import { useState } from 'react'
import { SupplyRequest, SupplyRequestStatus } from '@/types/db'
import { PhotoUploader } from '@/components/PhotoUploader'

interface SupplyRequestWithRelations extends SupplyRequest {
  users: { id: string; name: string } | null
  stores: { id: string; name: string } | null
}

interface SupplyRequestListProps {
  initialSupplyRequests: SupplyRequestWithRelations[]
  storeMap: Map<string, string>
}

export default function SupplyRequestList({ initialSupplyRequests, storeMap }: SupplyRequestListProps) {
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequestWithRelations[]>(initialSupplyRequests)
  const [statusFilter, setStatusFilter] = useState<SupplyRequestStatus | 'all'>('all')
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null)
  const [completionPhoto, setCompletionPhoto] = useState<string>('')
  const [completionDescription, setCompletionDescription] = useState<string>('')
  const [completing, setCompleting] = useState(false)

  // 상태 필터링 (서버에서 이미 14일 필터링이 완료됨)
  const filteredByStatus = statusFilter === 'all'
    ? supplyRequests
    : supplyRequests.filter(request => request.status === statusFilter)

  // 정렬: completed는 맨 아래, 그 외는 created_at 내림차순
  const filteredRequests = [...filteredByStatus].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const getStatusLabel = (status: SupplyRequestStatus) => {
    switch (status) {
      case 'received':
        return '접수'
      case 'in_progress':
        return '처리중'
      case 'manager_in_progress':
        return '점주 처리중'
      case 'completed':
        return '처리 완료'
      default:
        return status
    }
  }

  const getStatusColor = (status: SupplyRequestStatus) => {
    switch (status) {
      case 'received':
        return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200'
      case 'in_progress':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200'
      case 'manager_in_progress':
        return 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200'
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryLabel = (category: string | null) => {
    if (!category) return '-'
    return category
  }

  const handleConfirm = async (requestId: string) => {
    try {
      const response = await fetch(`/api/business/supply-requests/${requestId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || '요청 확인에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error confirming supply request:', error)
      alert('요청 확인 중 오류가 발생했습니다.')
    }
  }

  const handleForward = async (requestId: string) => {
    try {
      const response = await fetch(`/api/business/supply-requests/${requestId}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || '점주 전달에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error forwarding supply request:', error)
      alert('점주 전달 중 오류가 발생했습니다.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            statusFilter === 'all'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/30'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setStatusFilter('received')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            statusFilter === 'received'
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md shadow-gray-500/30'
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
          처리중
        </button>
        <button
          onClick={() => setStatusFilter('manager_in_progress')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            statusFilter === 'manager_in_progress'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/30'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          점주 처리중
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            statusFilter === 'completed'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md shadow-green-500/30'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          처리 완료
        </button>
      </div>

      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                매장
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                제목
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                요청자
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                요청일
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">물품 요청이 없습니다</p>
                    <p className="text-sm text-gray-400 mt-1">새로운 물품 요청이 등록되면 여기에 표시됩니다</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr 
                  key={request.id} 
                  className={`group hover:bg-purple-50/50 transition-colors duration-200 ${request.status === 'completed' ? 'opacity-75' : ''}`}
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {request.stores?.name || storeMap.get(request.store_id) || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`text-base font-semibold ${request.status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                      {request.title}
                    </div>
                    {request.description && (
                      <div className="text-sm text-gray-600 mt-2 whitespace-normal break-words max-w-md leading-relaxed">
                        {request.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={`text-sm font-medium ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getCategoryLabel(request.category)}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={`text-sm font-medium ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}`}>
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
                    <div className={`text-sm font-medium ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(request.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {request.status === 'received' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirm(request.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          요청 확인
                        </button>
                        <button
                          onClick={() => handleForward(request.id)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          점주 전달
                        </button>
                      </div>
                    )}
                    {request.status === 'in_progress' && (
                      <button
                        onClick={() => setCompletingRequestId(request.id)}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        처리 완료
                      </button>
                    )}
                    {request.status === 'completed' && (
                      <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs text-green-700 font-semibold">완료됨</span>
                        </div>
                        {request.completion_photo_url && (
                          <div className="mt-1.5">
                            <img
                              src={request.completion_photo_url}
                              alt="처리 완료 사진"
                              className="w-20 h-20 object-cover rounded-lg border border-green-200"
                            />
                          </div>
                        )}
                        {request.completion_description && (
                          <div className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                            {request.completion_description}
                          </div>
                        )}
                      </div>
                    )}
                    {request.status === 'manager_in_progress' && (
                      <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-purple-700 font-semibold">점주 처리 대기중</span>
                        </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">물품 요청이 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">새로운 물품 요청이 등록되면 여기에 표시됩니다</p>
            </div>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border-l-4 ${
                request.status === 'completed' ? 'opacity-75 border-gray-300' : 'border-purple-500'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-base font-bold ${request.status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
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
                    <span>{getCategoryLabel(request.category)}</span>
                    <span>·</span>
                    <span>{request.users?.name || '-'}</span>
                    <span>·</span>
                    <span>{new Date(request.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {request.description && (
                    <div className={`text-sm text-gray-600 mt-2 whitespace-normal break-words leading-relaxed ${request.status === 'completed' ? 'text-gray-400' : ''}`}>
                      {request.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                {request.status === 'received' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(request.id)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 text-sm font-medium shadow-sm hover:shadow transition-all duration-200"
                    >
                      요청 확인
                    </button>
                    <button
                      onClick={() => handleForward(request.id)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 text-sm font-medium shadow-sm hover:shadow transition-all duration-200"
                    >
                      점주 전달
                    </button>
                  </div>
                )}
                {request.status === 'in_progress' && (
                  <button
                    onClick={() => setCompletingRequestId(request.id)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-medium shadow-sm hover:shadow transition-all duration-200"
                  >
                    처리 완료
                  </button>
                )}
                {request.status === 'completed' && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-700 font-semibold">완료됨</span>
                    </div>
                    {request.completion_photo_url && (
                      <div className="mt-2">
                        <img
                          src={request.completion_photo_url}
                          alt="처리 완료 사진"
                          className="w-full h-32 object-cover rounded-lg border border-green-200"
                        />
                      </div>
                    )}
                    {request.completion_description && (
                      <div className="text-xs text-gray-600 mt-2">
                        {request.completion_description}
                      </div>
                    )}
                  </div>
                )}
                {request.status === 'manager_in_progress' && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-purple-700 font-semibold">점주 처리 대기중</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 처리 완료 모달 */}
      {completingRequestId && (() => {
        const completingRequest = supplyRequests.find(r => r.id === completingRequestId)
        if (!completingRequest) return null
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">물품 요청 처리 완료</h2>
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
                  entity="supply"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                onClick={async () => {
                  try {
                    setCompleting(true)
                    const response = await fetch(`/api/business/supply-requests/${completingRequestId}/complete`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        completion_photo_url: completionPhoto.trim() || null,
                        completion_description: completionDescription.trim() || null,
                      }),
                    })

                    if (response.ok) {
                      alert('물품 요청 처리가 완료되었습니다.')
                      setCompletingRequestId(null)
                      setCompletionPhoto('')
                      setCompletionDescription('')
                      window.location.reload()
                    } else {
                      const data = await response.json()
                      alert(data.error || '처리 완료에 실패했습니다.')
                    }
                  } catch (error: any) {
                    console.error('Error completing supply request:', error)
                    alert('처리 완료 중 오류가 발생했습니다.')
                  } finally {
                    setCompleting(false)
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 font-medium shadow-md shadow-purple-500/30 hover:shadow-lg transition-all duration-200"
                disabled={completing}
              >
                {completing ? '처리 중...' : '완료'}
              </button>
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}
