'use client'

import { useEffect, useState } from 'react'

interface PendingOwnerUser {
  id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
  companies: {
    id: string
    name: string
  } | null
}

export default function PendingOwnerSignupsSection() {
  const [users, setUsers] = useState<PendingOwnerUser[]>([])
  const [loading, setLoading] = useState(true)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPendingUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/platform/users/pending-owner')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '가입 대기 목록을 불러오지 못했습니다.')
      }
      setUsers(data.users || [])
    } catch (err: any) {
      setError(err.message || '가입 대기 목록 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingUsers()
  }, [])

  const handleApprove = async (id: string) => {
    if (!confirm('해당 업체관리자 가입을 승인하시겠습니까?')) {
      return
    }

    try {
      setProcessingUserId(id)
      setError(null)
      const response = await fetch(`/api/platform/users/${id}/approve-owner`, {
        method: 'PATCH',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '승인 처리에 실패했습니다.')
      }
      setUsers((prev) => prev.filter((user) => user.id !== id))
    } catch (err: any) {
      setError(err.message || '승인 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingUserId(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold">업체관리자 가입 승인 대기</h2>
        <span className="text-sm text-gray-600">{users.length}명</span>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500 py-4">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="text-sm text-gray-500 py-4">승인 대기 중인 업체관리자 가입이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-700">{user.email || '-'}</p>
                  <p className="text-xs text-gray-500">
                    회사: {user.companies?.name || '-'} / 신청일: {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApprove(user.id)}
                  disabled={processingUserId === user.id}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processingUserId === user.id ? '승인 중...' : '승인'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
