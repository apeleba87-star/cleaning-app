'use client'

import { useState, useMemo } from 'react'
import { Store, Franchise, CategoryTemplate } from '@/types/db'

const PAGE_SIZE = 30
type SortKey = 'franchise' | 'parent_store' | 'name' | 'category' | 'service_active'
import StoreForm from './StoreForm'

// StoreList에서 사용하는 최소 필드 타입
type StoreListFranchise = Pick<Franchise, 'id' | 'name'>
type StoreListCategoryTemplate = Pick<CategoryTemplate, 'id' | 'name' | 'category'>

interface StoreListProps {
  initialStores: Store[]
  franchises: StoreListFranchise[]
  categoryTemplates: StoreListCategoryTemplate[]
  companyId: string
  premiumUnits?: number
  basePath?: string // 기본 경로 (예: '/business' 또는 '/franchise')
  /** 매장별 배정된 인원 이름 목록 (store_id -> names) */
  storeAssignees?: Record<string, string[]>
  /** 매장별 체크리스트 템플릿 존재 여부 (store_id -> boolean) */
  storeHasChecklist?: Record<string, boolean>
}

export default function StoreList({ initialStores, franchises, categoryTemplates, companyId, premiumUnits = 0, basePath = '/business', storeAssignees = {}, storeHasChecklist = {} }: StoreListProps) {
  const [stores, setStores] = useState<Store[]>(initialStores)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortBy !== column) {
      return <span className="ml-1 text-gray-400">↕</span>
    }
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

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
    const confirmMessage =
      basePath === '/business'
        ? '이 매장과 연결된 모든 데이터(사진, 기록 등)가 함께 삭제되며 복구할 수 없습니다. 정말 삭제하시겠습니까?'
        : '정말 이 매장을 삭제하시겠습니까?'
    if (!confirm(confirmMessage)) {
      return
    }

    setLoading(true)
    setDeletingStoreId(storeId)
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
      setDeletingStoreId(null)
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

  // 검색 시 첫 페이지로
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  // 검색 필터링
  const filteredStores = useMemo(() => {
    return stores.filter(store => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        store.name.toLowerCase().includes(searchLower) ||
        store.address?.toLowerCase().includes(searchLower) ||
        store.category?.toLowerCase().includes(searchLower)
      )
    })
  }, [stores, searchTerm])

  // 정렬
  const sortedStores = useMemo(() => {
    if (!sortBy) return filteredStores
    const sorted = [...filteredStores].sort((a, b) => {
      const franchiseA = (a as any).franchises ? (a as any).franchises?.name : (franchises.find(f => f.id === a.franchise_id)?.name ?? '')
      const franchiseB = (b as any).franchises ? (b as any).franchises?.name : (franchises.find(f => f.id === b.franchise_id)?.name ?? '')
      let cmp = 0
      if (sortBy === 'franchise') {
        cmp = String(franchiseA).localeCompare(String(franchiseB))
      } else if (sortBy === 'parent_store') {
        cmp = (a.parent_store_name ?? '').localeCompare(b.parent_store_name ?? '')
      } else if (sortBy === 'name') {
        cmp = (a.name ?? '').localeCompare(b.name ?? '')
      } else if (sortBy === 'category') {
        cmp = (a.category ?? '').localeCompare(b.category ?? '')
      } else if (sortBy === 'service_active') {
        cmp = (a.service_active === b.service_active) ? 0 : (a.service_active ? -1 : 1)
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredStores, sortBy, sortOrder, franchises])

  // 페이지네이션 (30개씩)
  const totalPages = Math.max(1, Math.ceil(sortedStores.length / PAGE_SIZE))
  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedStores.slice(start, start + PAGE_SIZE)
  }, [sortedStores, currentPage])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-4">
        <button
          onClick={handleCreate}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700"
        >
          + 새 매장 추가
        </button>
        <div className="flex-1 sm:max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="매장명, 주소, 카테고리로 검색..."
            className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent flex-shrink-0" />
          <p className="text-blue-800 text-sm">매장을 삭제하는 중입니다. 데이터 양에 따라 최대 1분까지 걸릴 수 있습니다. 잠시만 기다려 주세요.</p>
        </div>
      )}

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
            premiumUnits={premiumUnits}
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
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('franchise')}
                >
                  프렌차이즈
                  <SortIcon column="franchise" />
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('parent_store')}
                >
                  상위매장
                  <SortIcon column="parent_store" />
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  매장명
                  <SortIcon column="name" />
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('category')}
                >
                  카테고리
                  <SortIcon column="category" />
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('service_active')}
                >
                  서비스진행
                  <SortIcon column="service_active" />
                </th>
                {basePath === '/business' && (
                  <>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      인원 배정
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      체크리스트
                    </th>
                  </>
                )}
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedStores.length === 0 ? (
                <tr>
                  <td colSpan={basePath === '/business' ? 8 : 6} className="px-4 lg:px-6 py-4 text-center text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '등록된 매장이 없습니다.'}
                  </td>
                </tr>
              ) : (
                paginatedStores.map((store) => {
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
                    {basePath === '/business' && (
                      <>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-700">
                          {(storeAssignees[store.id]?.length ?? 0) > 0
                            ? storeAssignees[store.id].join(', ')
                            : '없음'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              storeHasChecklist[store.id]
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {storeHasChecklist[store.id] ? '있음' : '없음'}
                          </span>
                        </td>
                      </>
                    )}
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
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                      >
                        {loading && deletingStoreId === store.id ? (
                          <>
                            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
                            삭제 중...
                          </>
                        ) : (
                          '삭제'
                        )}
                      </button>
                    </td>
                  </tr>
                )
                })
              )}
            </tbody>
          </table>
        </div>
        {/* 페이지네이션 (30개씩) */}
        {sortedStores.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              총 {sortedStores.length}개 중 {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedStores.length)}개 표시
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 모바일: 정렬 선택 + 카드 뷰 */}
      <div className="sm:hidden bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 pb-0 flex items-center gap-2">
          <label className="text-sm text-gray-600">정렬:</label>
          <select
            value={sortBy ?? ''}
            onChange={(e) => {
              const v = e.target.value as SortKey | ''
              setSortBy(v || null)
              setCurrentPage(1)
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="">기본</option>
            <option value="franchise">프렌차이즈</option>
            <option value="parent_store">상위매장</option>
            <option value="name">매장명</option>
            <option value="category">카테고리</option>
            <option value="service_active">서비스진행</option>
          </select>
          {sortBy && (
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="text-sm text-blue-600"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          )}
        </div>
        <div className="space-y-4 p-4">
        {paginatedStores.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 매장이 없습니다.'}
          </div>
        ) : (
          paginatedStores.map((store) => {
            const franchise = (store as any).franchises 
              ? (store as any).franchises 
              : (store.franchise_id ? franchises.find(f => f.id === store.franchise_id) : null)
            
            return (
              <div key={store.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
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
                  {basePath === '/business' && (
                    <>
                      <div className="flex items-center">
                        <span className="text-gray-500 w-20 flex-shrink-0">인원 배정:</span>
                        <span className="text-gray-900">
                          {(storeAssignees[store.id]?.length ?? 0) > 0
                            ? storeAssignees[store.id].join(', ')
                            : '없음'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-500 w-20 flex-shrink-0">체크리스트:</span>
                        <span className={storeHasChecklist[store.id] ? 'text-green-700 font-medium' : 'text-gray-600'}>
                          {storeHasChecklist[store.id] ? '있음' : '없음'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
                  {basePath === '/business' && (
                    <a
                      href={`${basePath}/stores/${store.id}/personnel`}
                      className="w-full text-center px-3 py-2 text-sm rounded-md transition-colors bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      인원배정
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(store)}
                      className="flex-1 px-3 py-2 text-sm rounded-md transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 text-sm rounded-md transition-colors bg-red-50 text-red-600 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {loading && deletingStoreId === store.id ? (
                        <>
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
                          삭제 중...
                        </>
                      ) : (
                        '삭제'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
        </div>
        {/* 모바일 페이지네이션 */}
        {sortedStores.length > PAGE_SIZE && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                currentPage <= 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              이전
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <span className="text-xs text-gray-500">
                (총 {sortedStores.length}개)
              </span>
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                currentPage >= totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

