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
  const [searchTerm, setSearchTerm] = useState('')

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

      if (!response.ok) {
        // 응답이 비어있을 수 있으므로 안전하게 처리
        let errorMessage = '삭제에 실패했습니다.'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json()
            errorMessage = data.error || errorMessage
          } else {
            errorMessage = `삭제 실패: ${response.status} ${response.statusText}`
          }
        } catch (parseError) {
          errorMessage = `삭제 실패: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // 성공 응답 파싱 (응답이 비어있을 수 있으므로 안전하게 처리)
      let data: any = { success: true }
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const text = await response.text()
          if (text.trim()) {
            data = JSON.parse(text)
          }
        }
      } catch (parseError) {
        // JSON 파싱 실패해도 성공으로 간주 (200 OK이므로)
        console.warn('Failed to parse delete response, but status is OK:', parseError)
      }

      if (data.success !== false) {
        setStores(stores.filter((s) => s.id !== storeId))
      } else {
        throw new Error(data.error || '삭제에 실패했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '삭제 중 오류가 발생했습니다.')
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

  // 검색 필터링
  const filteredStores = stores.filter(store => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      store.name.toLowerCase().includes(searchLower) ||
      store.address?.toLowerCase().includes(searchLower) ||
      store.category?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-4 gap-4">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base whitespace-nowrap order-2 sm:order-1"
        >
          + 새 매장 추가
        </button>
        <div className="flex-1 max-w-full sm:max-w-md order-1 sm:order-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="매장명, 주소, 카테고리로 검색..."
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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

      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  프렌차이즈
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상위매장
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  매장명
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스진행
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 lg:px-6 py-4 text-center text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '등록된 매장이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => {
                  // 프렌차이즈 정보 찾기 (join된 데이터 또는 prop에서)
                  const franchise = (store as any).franchises 
                    ? (store as any).franchises 
                    : (store.franchise_id ? franchises.find(f => f.id === store.franchise_id) : null)
                  
                  return (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {franchise ? (franchise.name || franchise) : '-'}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {store.parent_store_name || '-'}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">
                          {store.name}
                        </div>
                        {store.is_night_shift && (
                          <span 
                            className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1"
                            title="야간 매장"
                          >
                            <span>🌙</span>
                            <span>야간</span>
                          </span>
                        )}
                      </div>
                      {store.address && (
                        <div className="text-xs text-gray-500 mt-1">
                          {store.address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {store.category || '-'}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
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
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {basePath === '/business' && (
                        <a
                          href={`${basePath}/stores/${store.id}/personnel`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          인원배정
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

      {/* 모바일: 카드 뷰 */}
      <div className="sm:hidden space-y-4">
        {filteredStores.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 매장이 없습니다.'}
          </div>
        ) : (
          filteredStores.map((store) => {
            const franchise = (store as any).franchises 
              ? (store as any).franchises 
              : (store.franchise_id ? franchises.find(f => f.id === store.franchise_id) : null)
            
            return (
              <div key={store.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {store.name}
                      </h3>
                      {store.is_night_shift && (
                        <span 
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                          title="야간 매장"
                        >
                          <span>🌙</span>
                          <span>야간</span>
                        </span>
                      )}
                    </div>
                    {store.address && (
                      <p className="text-xs text-gray-500 truncate mb-2">
                        {store.address}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                      store.service_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {store.service_active ? '진행중' : '중지'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-500 w-20 flex-shrink-0">프렌차이즈:</span>
                    <span className="text-gray-900 font-medium">
                      {franchise ? (franchise.name || franchise) : '-'}
                    </span>
                  </div>
                  {store.parent_store_name && (
                    <div className="flex items-center">
                      <span className="text-gray-500 w-20 flex-shrink-0">상위매장:</span>
                      <span className="text-gray-900">{store.parent_store_name}</span>
                    </div>
                  )}
                  {store.category && (
                    <div className="flex items-center">
                      <span className="text-gray-500 w-20 flex-shrink-0">카테고리:</span>
                      <span className="text-gray-900">{store.category}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
                  {basePath === '/business' && (
                    <a
                      href={`${basePath}/stores/${store.id}/personnel`}
                      className="w-full text-center px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      인원배정
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(store)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

