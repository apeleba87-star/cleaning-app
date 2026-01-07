'use client'

import { useState, useEffect, useRef } from 'react'
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
  
  // 수정 관련 상태
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [editingRequest, setEditingRequest] = useState<Partial<SupplyRequestWithRelations>>({})
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  
  // 실시간 동기화를 위한 ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const editingRequestIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    loadSupplyRequests()
    
    // 실시간 상태 동기화 (5초마다 polling)
    pollingIntervalRef.current = setInterval(() => {
      // 편집 중이 아닌 요청만 자동 새로고침
      if (editingRequestIdsRef.current.size === 0) {
        loadSupplyRequests()
      }
    }, 5000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
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
        
        // 편집 중인 요청이 상태가 변경되었는지 확인
        if (editingRequestId) {
          const updatedRequest = sorted.find(r => r.id === editingRequestId)
          if (updatedRequest && updatedRequest.status !== 'received') {
            alert('요청 상태가 변경되어 수정 모드를 종료합니다.')
            setEditingRequestId(null)
            setEditingRequest({})
            editingRequestIdsRef.current.delete(editingRequestId)
          } else if (updatedRequest) {
            // 상태는 같지만 다른 필드가 변경되었을 수 있음
            setEditingRequest(updatedRequest)
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading supply requests:', error)
      alert('물품 요청 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (request: SupplyRequestWithRelations) => {
    if (request.status !== 'received') {
      alert('접수 상태인 요청만 수정할 수 있습니다.')
      return
    }
    setEditingRequestId(request.id)
    setEditingRequest({ ...request })
    editingRequestIdsRef.current.add(request.id)
  }

  const handleCancelEdit = () => {
    setEditingRequestId(null)
    setEditingRequest({})
    if (editingRequestId) {
      editingRequestIdsRef.current.delete(editingRequestId)
    }
  }

  const handleSave = async () => {
    if (!editingRequestId || !editingRequest.title?.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    try {
      setSaving(true)
      const originalRequest = supplyRequests.find(r => r.id === editingRequestId)
      if (!originalRequest) {
        alert('요청을 찾을 수 없습니다.')
        return
      }

      const response = await fetch(`/api/store-manager/supply-requests/${editingRequestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingRequest.title,
          description: editingRequest.description || null,
          category: editingRequest.category || null,
          photo_url: editingRequest.photo_url || null,
          original_updated_at: originalRequest.updated_at, // 충돌 감지용
        }),
      })

      if (response.ok) {
        alert('요청이 수정되었습니다.')
        setEditingRequestId(null)
        setEditingRequest({})
        editingRequestIdsRef.current.delete(editingRequestId)
        loadSupplyRequests()
      } else {
        const data = await response.json()
        if (response.status === 409 && data.conflict) {
          // 충돌 발생
          alert(data.error || '다른 사용자가 요청을 수정했습니다.')
          if (data.latestData) {
            // 최신 데이터로 업데이트
            setSupplyRequests(prev => prev.map(r => 
              r.id === editingRequestId ? data.latestData : r
            ))
          }
          setEditingRequestId(null)
          setEditingRequest({})
          editingRequestIdsRef.current.delete(editingRequestId)
          loadSupplyRequests()
        } else {
          alert(data.error || '수정에 실패했습니다.')
        }
      }
    } catch (error: any) {
      console.error('Error updating supply request:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('정말로 이 요청을 취소하시겠습니까?')) {
      return
    }

    try {
      setCancelling(requestId)
      const response = await fetch(`/api/store-manager/supply-requests/${requestId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('요청이 취소되었습니다.')
        loadSupplyRequests()
      } else {
        const data = await response.json()
        if (response.status === 409 && data.conflict) {
          alert(data.error || '요청 상태가 변경되어 취소할 수 없습니다.')
          loadSupplyRequests()
        } else {
          alert(data.error || '취소에 실패했습니다.')
        }
      }
    } catch (error: any) {
      console.error('Error cancelling supply request:', error)
      alert('취소 중 오류가 발생했습니다.')
    } finally {
      setCancelling(null)
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
    <div className="max-w-6xl mx-auto px-2 md:px-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">물품 요청 관리</h1>
        <Link
          href="/store-manager/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm self-start md:self-auto"
        >
          ← 대시보드로
        </Link>
      </div>

      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
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
                    {editingRequestId === request.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingRequest.title || ''}
                          onChange={(e) => setEditingRequest({ ...editingRequest, title: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="제목"
                        />
                        <textarea
                          value={editingRequest.description || ''}
                          onChange={(e) => setEditingRequest({ ...editingRequest, description: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          placeholder="설명"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <>
                        <div className={`text-sm font-medium ${request.status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                          {request.title}
                        </div>
                        {request.description && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                            {request.description}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRequestId === request.id ? (
                      <input
                        type="text"
                        value={editingRequest.category || ''}
                        onChange={(e) => setEditingRequest({ ...editingRequest, category: e.target.value as any })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="카테고리"
                      />
                    ) : (
                      <div className={`text-sm ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {request.category || '-'}
                      </div>
                    )}
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
                    <div className="flex gap-2 items-center">
                      {editingRequestId === request.id ? (
                        <>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {saving ? '저장 중...' : '저장'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          {request.status === 'received' && (
                            <>
                              <button
                                onClick={() => handleEdit(request)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleCancelRequest(request.id)}
                                disabled={cancelling === request.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                {cancelling === request.id ? '취소 중...' : '취소'}
                              </button>
                            </>
                          )}
                          {(request.status === 'in_progress' || request.status === 'manager_in_progress') && (
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
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="md:hidden space-y-4">
        {supplyRequests.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-6 text-center text-sm text-gray-500">
            처리할 물품 요청이 없습니다.
          </div>
        ) : (
          supplyRequests.map((request) => (
            <div
              key={request.id}
              className={`bg-white shadow-md rounded-lg p-4 ${request.status === 'completed' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {editingRequestId === request.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingRequest.title || ''}
                        onChange={(e) => setEditingRequest({ ...editingRequest, title: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="제목"
                      />
                      <textarea
                        value={editingRequest.description || ''}
                        onChange={(e) => setEditingRequest({ ...editingRequest, description: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        placeholder="설명"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <>
                      <h3 className={`text-base font-semibold mb-1 ${request.status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                        {request.title}
                      </h3>
                      {request.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {request.description}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${getStatusColor(request.status)}`}
                >
                  {getStatusLabel(request.status)}
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">카테고리:</span>
                  {editingRequestId === request.id ? (
                    <input
                      type="text"
                      value={editingRequest.category || ''}
                      onChange={(e) => setEditingRequest({ ...editingRequest, category: e.target.value as any })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="카테고리"
                    />
                  ) : (
                    <span className={request.status === 'completed' ? 'text-gray-400' : 'text-gray-700'}>
                      {request.category || '-'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">요청자:</span>
                  <span className={request.status === 'completed' ? 'text-gray-400' : 'text-gray-700'}>
                    {request.users?.name || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">요청일:</span>
                  <span className={request.status === 'completed' ? 'text-gray-400' : 'text-gray-700'}>
                    {new Date(request.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>

              {editingRequestId === request.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <>
                  {request.status === 'received' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(request)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors touch-manipulation"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        disabled={cancelling === request.id}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors touch-manipulation disabled:opacity-50"
                      >
                        {cancelling === request.id ? '취소 중...' : '요청 취소'}
                      </button>
                    </div>
                  )}
                  {(request.status === 'in_progress' || request.status === 'manager_in_progress') && (
                    <button
                      onClick={() => setCompletingRequestId(request.id)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors touch-manipulation"
                    >
                      처리 완료
                    </button>
                  )}
                  {request.status === 'completed' && (
                    <div className="space-y-2">
                      <div className="text-sm text-green-600 font-medium">완료됨</div>
                      {request.completion_photo_url && (
                        <div>
                          <img
                            src={request.completion_photo_url}
                            alt="처리 완료 사진"
                            className="w-full max-w-xs h-auto object-cover rounded border"
                          />
                        </div>
                      )}
                      {request.completion_description && (
                        <p className="text-xs text-gray-500">
                          {request.completion_description}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
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
