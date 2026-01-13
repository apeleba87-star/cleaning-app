'use client'

import { useState } from 'react'
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
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null)
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null)
  const [completionPhoto, setCompletionPhoto] = useState<string>('')
  const [completionDescription, setCompletionDescription] = useState<string>('')
  const [rejectionDescription, setRejectionDescription] = useState<string>('')
  const [completing, setCompleting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(request => request.status === statusFilter)

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

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
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

      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                매장
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                제목
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                작성자
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                작성일
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
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
                      <div className={`text-sm text-gray-600 mt-2 whitespace-normal break-words max-w-md leading-relaxed ${request.status === 'completed' || request.status === 'rejected' ? 'text-gray-400' : ''}`}>
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
                  <td className="px-6 py-5 whitespace-nowrap">
                    {request.status === 'received' && (
                      <button
                        onClick={() => handleConfirm(request.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        요청 확인
                      </button>
                    )}
                    {request.status === 'in_progress' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCompletingRequestId(request.id)}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          처리 완료
                        </button>
                        <button
                          onClick={() => setRejectingRequestId(request.id)}
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          반려
                        </button>
                      </div>
                    )}
                    {request.status === 'completed' && (
                      <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs text-green-700 font-semibold">완료됨</span>
                        </div>
                        {(request as any).storage_location && (
                          <div className="text-xs text-gray-700 mt-1.5">
                            <span className="font-semibold text-green-800">보관장소:</span> {(request as any).storage_location}
                          </div>
                        )}
                        {request.completion_description && (
                          <div className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                            <span className="font-semibold text-green-800">상세내용:</span> {request.completion_description}
                          </div>
                        )}
                        {request.completion_photo_url && (
                          <div className="mt-1.5">
                            <img
                              src={request.completion_photo_url}
                              alt="처리 완료 사진"
                              className="w-20 h-20 object-cover rounded-lg border border-green-200"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {request.status === 'rejected' && (
                      <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-xs text-red-700 font-semibold">반려됨</span>
                        </div>
                        {request.rejection_description && (
                          <div className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                            {request.rejection_description}
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
                      <div className="text-xs text-gray-700 mt-2">
                        <span className="font-semibold text-green-800">보관장소:</span> {(request as any).storage_location}
                      </div>
                    )}
                    {request.completion_description && (
                      <div className="text-xs text-gray-600 mt-2">
                        <span className="font-semibold text-green-800">상세내용:</span> {request.completion_description}
                      </div>
                    )}
                    {request.completion_photo_url && (
                      <div className="mt-2">
                        <img
                          src={request.completion_photo_url}
                          alt="처리 완료 사진"
                          className="w-full h-32 object-cover rounded-lg border border-green-200"
                        />
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
                      <div className="text-xs text-gray-600 mt-2">
                        {request.rejection_description}
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
