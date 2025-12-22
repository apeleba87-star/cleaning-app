'use client'

import { useState } from 'react'
import { RequestCategory, RequestCategoryType, Store } from '@/types/db'
import CategoryForm from './CategoryForm'

interface CategoryWithStore extends RequestCategory {
  stores: { id: string; name: string } | null
}

// CategoryList에서 사용하는 최소 필드 타입
type CategoryListStore = Pick<Store, 'id' | 'name'>

interface CategoryListProps {
  initialCategories: CategoryWithStore[]
  stores: CategoryListStore[]
}

export default function CategoryList({ initialCategories, stores }: CategoryListProps) {
  const [categories, setCategories] = useState<CategoryWithStore[]>(initialCategories)
  const [editingCategory, setEditingCategory] = useState<CategoryWithStore | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingCategory(null)
    setShowForm(true)
    setError(null)
  }

  const handleEdit = (category: CategoryWithStore) => {
    setEditingCategory(category)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('정말 이 카테고리를 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.')
      }

      setCategories(categories.filter((c) => c.id !== categoryId))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = (category: CategoryWithStore) => {
    if (editingCategory) {
      setCategories(categories.map((c) => (c.id === category.id ? category : c)))
    } else {
      setCategories([category, ...categories])
    }
    setShowForm(false)
    setEditingCategory(null)
    setError(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingCategory(null)
    setError(null)
  }

  const getTypeLabel = (type: RequestCategoryType) => {
    return type === 'issue' ? '이슈' : '물품'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + 새 카테고리 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <CategoryForm
            category={editingCategory}
            stores={stores}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                타입
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매장
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                생성일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  등록된 카테고리가 없습니다.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {category.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        category.type === 'issue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {getTypeLabel(category.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {category.stores?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(category.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

