'use client'

import { useState, FormEvent } from 'react'
import { RequestCategory, RequestCategoryType, Store } from '@/types/db'

interface CategoryWithStore extends RequestCategory {
  stores: { id: string; name: string } | null
}

// CategoryForm에서 사용하는 최소 필드 타입
type CategoryFormStore = Pick<Store, 'id' | 'name'>

interface CategoryFormProps {
  category: CategoryWithStore | null
  stores: CategoryFormStore[]
  onSuccess: (category: CategoryWithStore) => void
  onCancel: () => void
}

export default function CategoryForm({
  category,
  stores,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const [storeId, setStoreId] = useState(category?.store_id || '')
  const [type, setType] = useState<RequestCategoryType>(category?.type || 'issue')
  const [name, setName] = useState(category?.name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = category
        ? `/api/admin/categories/${category.id}`
        : '/api/admin/categories'
      const method = category ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: storeId,
          type,
          name: name.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.')
      }

      onSuccess(data.category)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        {category ? '카테고리 수정' : '새 카테고리 추가'}
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 mb-1">
            매장 <span className="text-red-500">*</span>
          </label>
          <select
            id="store_id"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">매장을 선택하세요</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            타입 <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as RequestCategoryType)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="issue">이슈</option>
            <option value="supply">물품</option>
          </select>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            카테고리명 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="카테고리명을 입력하세요"
          />
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

