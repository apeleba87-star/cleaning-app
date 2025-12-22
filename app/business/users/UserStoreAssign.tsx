'use client'

import { useState, FormEvent } from 'react'
import { User, Store } from '@/types/db'

// UserStoreAssign에서 사용하는 최소 필드 타입
type UserStoreAssignStore = Pick<Store, 'id' | 'name'>

interface UserStoreAssignProps {
  user: User
  stores: UserStoreAssignStore[]
  assignedStoreIds: string[]
  onSuccess: () => void
  onCancel: () => void
}

export default function UserStoreAssign({
  user,
  stores,
  assignedStoreIds,
  onSuccess,
  onCancel,
}: UserStoreAssignProps) {
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(assignedStoreIds)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/users/${user.id}/stores`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_ids: selectedStoreIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '매장 배정에 실패했습니다.')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        매장 배정: {user.name}
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배정할 매장을 선택하세요:
          </label>
          <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
            {stores.length === 0 ? (
              <p className="text-gray-500 text-sm">등록된 매장이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {stores.map((store) => (
                  <label
                    key={store.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStoreIds.includes(store.id)}
                      onChange={() => handleToggleStore(store.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{store.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {selectedStoreIds.length}개 매장이 선택되었습니다.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

