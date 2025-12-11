'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Request } from '@/types/db'
import { useTodayAttendance } from '@/lib/hooks/useTodayAttendance'
import StoreSelector from '../attendance/StoreSelector'

interface RequestWithStore extends Request {
  stores?: { name: string }
  created_by_user?: { name: string }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestWithStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 출근 정보 가져오기
  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()

  useEffect(() => {
    if (!attendanceLoading) {
      loadRequests()
    }
  }, [attendanceLoading, attendanceStoreId, isClockedIn])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/staff/requests')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '요청란을 불러오는데 실패했습니다.')
      }

      // 출근한 매장이 있으면 해당 매장의 요청란만 필터링
      let filteredRequests = data.data || []
      if (attendanceStoreId && isClockedIn) {
        filteredRequests = filteredRequests.filter(
          (req: RequestWithStore) => req.store_id === attendanceStoreId
        )
      }

      setRequests(filteredRequests)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (requestId: string) => {
    if (!confirm('이 요청란을 완료 처리하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/business/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '완료 처리에 실패했습니다.')
      }

      // 요청란 목록 다시 로드
      loadRequests()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${month}월 ${day}일 ${hours}:${String(minutes).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">처리중인 요청란</h1>
        <p className="text-gray-600 text-sm">
          {attendanceStoreId && isClockedIn
            ? '출근한 매장의 요청란만 표시됩니다.'
            : '배정된 매장의 처리중인 요청란을 확인할 수 있습니다.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">처리중인 요청란이 없습니다.</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      처리중
                    </span>
                    <span className="text-sm text-gray-500">
                      {request.stores?.name || '알 수 없는 매장'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{request.title}</h3>
                  {request.description && (
                    <p className="text-gray-600 text-sm mb-3 whitespace-pre-wrap">
                      {request.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500">
                    <span>요청일: {formatDate(request.created_at)}</span>
                    {request.created_by_user && (
                      <span className="ml-3">요청자: {request.created_by_user.name}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => handleComplete(request.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  완료 처리
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


