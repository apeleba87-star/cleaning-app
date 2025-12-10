'use client'

import { useState, useEffect } from 'react'
import { Company } from '@/types/db'

interface User {
  id: string
  name: string
  email?: string
  role: string
  company_id: string | null
}

interface AssignOwnerModalProps {
  company: Company
  onSuccess: () => void
  onCancel: () => void
}

export default function AssignOwnerModal({ company, onSuccess, onCancel }: AssignOwnerModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 업체 관리자 역할을 가진 사용자들 조회
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/platform/users?role=business_owner')
        const data = await response.json()
        
        if (!response.ok) {
          setError(data.error || '사용자 목록을 불러오는 중 오류가 발생했습니다.')
          setFetching(false)
          return
        }

        setUsers(data.users || [])
        
        // 이미 이 회사에 연결된 업체 관리자가 있으면 선택
        const currentOwner = data.users?.find((u: User) => u.company_id === company.id)
        if (currentOwner) {
          setSelectedUserId(currentOwner.id)
        }
      } catch (err: any) {
        console.error('Error fetching users:', err)
        setError('사용자 목록을 불러오는 중 오류가 발생했습니다.')
      } finally {
        setFetching(false)
      }
    }

    fetchUsers()
  }, [company.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/users/${selectedUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: users.find(u => u.id === selectedUserId)?.name,
          role: 'business_owner',
          company_id: selectedUserId ? company.id : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업체 관리자 지정에 실패했습니다.')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('업체 관리자 지정을 해제하시겠습니까?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const currentOwner = users.find((u: User) => u.company_id === company.id)
      if (!currentOwner) {
        throw new Error('현재 지정된 업체 관리자가 없습니다.')
      }

      const response = await fetch(`/api/platform/users/${currentOwner.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: currentOwner.name,
          role: 'business_owner',
          company_id: null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업체 관리자 지정 해제에 실패했습니다.')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <p className="text-center">로딩 중...</p>
        </div>
      </div>
    )
  }

  const currentOwner = users.find((u: User) => u.company_id === company.id)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">업체 관리자 지정</h2>
        <p className="text-sm text-gray-600 mb-4">회사: <strong>{company.name}</strong></p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {currentOwner && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              현재 업체 관리자: <strong>{currentOwner.name}</strong>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-2">
              업체 관리자 선택
            </label>
            <select
              id="owner"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">업체 관리자 없음</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.company_id && user.company_id !== company.id ? '(다른 회사)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {users.length === 0 && (
                <span className="text-orange-600">
                  업체 관리자 역할을 가진 사용자가 없습니다. 
                  <br />
                  먼저 <a href="/platform/users" className="underline" target="_blank">전체 사용자 관리</a>에서 
                  사용자를 생성하고 역할을 '업체관리자'로 설정하세요.
                </span>
              )}
              {users.length > 0 && `${users.length}명의 업체 관리자가 있습니다.`}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            {currentOwner && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                지정 해제
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

