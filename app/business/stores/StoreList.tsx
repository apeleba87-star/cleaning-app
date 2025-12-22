'use client'

import { useState } from 'react'
import { Store, Franchise, CategoryTemplate } from '@/types/db'
import StoreForm from './StoreForm'

// StoreList에서 사용하는 최소 필드 타입
type StoreListFranchise = Pick<Franchise, 'id' | 'name'>
type StoreListCategoryTemplate = Pick<CategoryTemplate, 'id' | 'name' | 'category'>

interface StoreListProps {
  initialStores: Store[]
  franchises: StoreListFranchise[]
  categoryTemplates: StoreListCategoryTemplate[]
  companyId: string
  basePath?: string // 기본 경로 (예: '/business' 또는 '/franchise')
}

export default function StoreList({ initialStores, franchises, categoryTemplates, companyId, basePath = '/business' }: StoreListProps) {
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingStore(null)
    setShowForm(true)
    setError(null)
  }

  const handleEdit = (store: Store) => {
    setEditingStore(store)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (storeId: string) => {
    if (!confirm('정말 이 매장을 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const apiPath = basePath === '/franchise' ? '/api/franchise' : '/api/business'
      const response = await fetch(`${apiPath}/stores/${storeId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.')
      }

      setStores(stores.filter((s) => s.id !== storeId))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = (store: Store) => {
    if (editingStore) {
      setStores(stores.map((s) => (s.id === store.id ? store : s)))
    } else {
      setStores([store, ...stores])
    }
    setShowForm(false)
    setEditingStore(null)
    setError(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingStore(null)
    setError(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + 새 매장 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <StoreForm
            store={editingStore}
            franchises={franchises}
            categoryTemplates={categoryTemplates}
            companyId={companyId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            basePath={basePath}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                프렌차이즈
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상위매장
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매장명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                서비스진행
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stores.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  등록된 매장이 없습니다.
                </td>
              </tr>
            ) : (
              stores.map((store) => {
                // 프렌차이즈 정보 찾기 (join된 데이터 또는 prop에서)
                const franchise = (store as any).franchises 
                  ? (store as any).franchises 
                  : (store.franchise_id ? franchises.find(f => f.id === store.franchise_id) : null)
                
                return (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {franchise ? (franchise.name || franchise) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {store.parent_store_name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {store.name}
                    </div>
                    {store.address && (
                      <div className="text-xs text-gray-500 mt-1">
                        {store.address}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {store.category || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        store.service_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {store.service_active ? '진행중' : '중지'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={`${basePath}/stores/${store.id}/detail`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      상세보기
                    </a>
                    {basePath === '/business' && (
                      <a
                        href={`${basePath}/stores/${store.id}/personnel`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        인원
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(store)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

