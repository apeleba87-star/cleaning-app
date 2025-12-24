'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SupplyRequest, SupplyRequestStatus } from '@/types/db'
import { PhotoUploader } from '@/components/PhotoUploader'

interface SupplyRequestWithRelations extends SupplyRequest {
  users: { id: string; name: string } | null
  stores: { id: string; name: string } | null
}

export default function StoreManagerSuppliesPage() {
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequestWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null)
  const [completionPhoto, setCompletionPhoto] = useState<string>('')
  const [completionDescription, setCompletionDescription] = useState<string>('')
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    loadSupplyRequests()
  }, [])

  const loadSupplyRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/store-manager/supply-requests')
      if (!response.ok) {
        throw new Error('물품 요청 목록을 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success && data.data) {
        // 정렬: completed는 맨 아래, 그 외는 created_at 내림차순
        const sorted = [...data.data].sort((a: any, b: any) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1
          if (a.status !== 'completed' && b.status === 'completed') return -1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setSupplyRequests(sorted)
      }
    } catch (error: any) {
      console.error('Error loading supply requests:', error)
      alert('물품 요청 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (requestId: string) => {
    if (!completionPhoto.trim()) {
      alert('처리 완료 사진을 업로드해주세요.')
      return
    }

    try {
      setCompleting(true)
      const response = await fetch(`/api/store-manager/supply-requests/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completion_photo_url: completionPhoto,
          completion_description: completionDescription.trim() || null,
        }),
      })

      if (response.ok) {
        alert('물품 요청 처리가 완료되었습니다.')
        setCompletingRequestId(null)
        setCompletionPhoto('')
        setCompletionDescription('')
        loadSupplyRequests()
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
  }

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
        return 'bg-gray-100 text-gray-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'manager_in_progress':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">물품 요청 관리</h1>
        <Link
          href="/store-manager/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제목
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                요청자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                요청일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {supplyRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  처리할 물품 요청이 없습니다.
                </td>
              </tr>
            ) : (
              supplyRequests.map((request) => (
                <tr 
                  key={request.id}
                  className={request.status === 'completed' ? 'opacity-60' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${request.status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                      {request.title}
                    </div>
                    {request.description && (
                      <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                        {request.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {request.category || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {request.users?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(request.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.status === 'manager_in_progress' && (
                      <button
                        onClick={() => setCompletingRequestId(request.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        처리 완료
                      </button>
                    )}
                    {request.status === 'completed' && (
                      <div>
                        <span className="text-green-600">완료됨</span>
                        {request.completion_photo_url && (
                          <div className="mt-2">
                            <img
                              src={request.completion_photo_url}
                              alt="처리 완료 사진"
                              className="w-20 h-20 object-cover rounded border"
                            />
                          </div>
                        )}
                        {request.completion_description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {request.completion_description}
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

      {/* 처리 완료 모달 */}
      {completingRequestId && (() => {
        const completingRequest = supplyRequests.find(r => r.id === completingRequestId)
        if (!completingRequest) return null
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">물품 요청 처리 완료</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  처리 완료 사진 <span className="text-red-500">*</span>
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
                onClick={() => handleComplete(completingRequestId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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

