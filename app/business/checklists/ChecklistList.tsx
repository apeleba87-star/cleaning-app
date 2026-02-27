'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Store, Checklist as ChecklistType, ReviewStatus } from '@/types/db'
import ChecklistForm from './ChecklistForm'

interface User {
  id: string
  name: string
  role: string
}

interface Checklist extends Partial<ChecklistType> {
  id: string
  store_id: string
  assigned_user_id: string | null
  items: any[]
  note: string | null
  review_status: ReviewStatus
  work_date: string
  requires_photos?: boolean
  created_at: string
  stores?: { name: string }
  users?: { name: string }
}

type ChecklistFilter = 'all' | 'has' | 'none'
type StoreSortKey = 'name' | 'checklist'

const PAGE_SIZE = 30

interface ChecklistListProps {
  stores: Store[]
  staffUsers: User[]
  companyId: string
  /** 매장별 체크리스트 템플릿 존재 여부 */
  storeHasChecklist?: Record<string, boolean>
}

export default function ChecklistList({ stores, staffUsers, companyId, storeHasChecklist = {} }: ChecklistListProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyingChecklist, setCopyingChecklist] = useState<Checklist | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copying, setCopying] = useState(false)
  const [targetStoreId, setTargetStoreId] = useState<string>('')
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<StoreSortKey | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  /** 이번 세션에서 새로 등록한 매장(상단 목록 '있음' 반영용) */
  const [createdStoreIds, setCreatedStoreIds] = useState<Set<string>>(new Set())
  const detailSectionRef = useRef<HTMLDivElement>(null)
  const formSectionRef = useRef<HTMLDivElement>(null)

  const handleSort = (key: StoreSortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ column }: { column: StoreSortKey }) => {
    if (sortBy !== column) return <span className="ml-1 text-gray-400">↕</span>
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const handleStoreChange = async (storeId: string) => {
    setSelectedStoreId(storeId)
    if (!storeId) {
      setChecklists([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/checklists?store_id=${storeId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '체크리스트 조회에 실패했습니다.')
      }

      setChecklists(data.checklists || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setShowForm(false)
    setEditingChecklist(null)
    if (selectedStoreId) {
      setCreatedStoreIds((prev) => new Set(prev).add(selectedStoreId))
      handleStoreChange(selectedStoreId)
    }
  }

  const handleEdit = (checklist: Checklist) => {
    setEditingChecklist(checklist)
    setShowForm(true)
  }

  const handleDelete = async (checklistId: string) => {
    if (!confirm('정말 이 체크리스트를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/business/checklists/${checklistId}`, {
        method: 'DELETE',
      })

      // Content-Type 확인
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`서버 오류가 발생했습니다. (${response.status} ${response.statusText})`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '체크리스트 삭제에 실패했습니다.')
      }

      // 목록 새로고침
      if (selectedStoreId) {
        handleStoreChange(selectedStoreId)
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCopy = (checklist: Checklist) => {
    setCopyingChecklist(checklist)
    setTargetStoreId('')
    setShowCopyModal(true)
    setError(null)
  }

  const handleCopyConfirm = async () => {
    if (!copyingChecklist || !targetStoreId) {
      setError('대상 매장을 선택해주세요.')
      return
    }

    setCopying(true)
    setError(null)

    try {
      const response = await fetch('/api/business/checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: targetStoreId,
          items: copyingChecklist.items || [],
          note: copyingChecklist.note || null,
          requires_photos: copyingChecklist.requires_photos || false,
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`서버 오류가 발생했습니다. (${response.status} ${response.statusText})`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '체크리스트 복사에 실패했습니다.')
      }

      const targetStoreName = stores.find(s => s.id === targetStoreId)?.name || targetStoreId

      // 모달 닫기
      setShowCopyModal(false)
      setCopyingChecklist(null)
      setTargetStoreId('')

      // 복사된 매장이 현재 선택된 매장이면 목록 새로고침
      if (targetStoreId === selectedStoreId) {
        handleStoreChange(selectedStoreId)
        alert(`체크리스트가 "${targetStoreName}" 매장에 복사되었습니다.`)
      } else {
        // 다른 매장에 복사된 경우, 성공 메시지만 표시
        alert(`체크리스트가 "${targetStoreName}" 매장에 복사되었습니다.`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCopying(false)
    }
  }

  const handleCopyCancel = () => {
    setShowCopyModal(false)
    setCopyingChecklist(null)
    setTargetStoreId('')
    setError(null)
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중'
      case 'approved':
        return '승인됨'
      case 'reshoot_requested':
        return '재촬영 요청'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'reshoot_requested':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 필터 적용 매장 목록
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const hasChecklist = createdStoreIds.has(store.id) || storeHasChecklist[store.id]
      if (checklistFilter === 'has') return hasChecklist
      if (checklistFilter === 'none') return !hasChecklist
      return true
    })
  }, [stores, storeHasChecklist, checklistFilter, createdStoreIds])

  const searchedStores = useMemo(() => {
    if (!searchTerm.trim()) return filteredStores
    const q = searchTerm.toLowerCase().trim()
    return filteredStores.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q))
    )
  }, [filteredStores, searchTerm])

  const sortedStores = useMemo(() => {
    if (!sortBy) return searchedStores
    return [...searchedStores].sort((a, b) => {
      const hasA = createdStoreIds.has(a.id) || storeHasChecklist[a.id]
      const hasB = createdStoreIds.has(b.id) || storeHasChecklist[b.id]
      let cmp = 0
      if (sortBy === 'name') {
        cmp = (a.name ?? '').localeCompare(b.name ?? '')
      } else if (sortBy === 'checklist') {
        cmp = (hasA === hasB) ? 0 : hasA ? 1 : -1
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [searchedStores, sortBy, sortOrder, storeHasChecklist, createdStoreIds])

  const totalPages = Math.max(1, Math.ceil(sortedStores.length / PAGE_SIZE))
  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedStores.slice(start, start + PAGE_SIZE)
  }, [sortedStores, currentPage])

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(1)
  }, [currentPage, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, checklistFilter])

  // 매장 선택 시 상세 영역으로 스크롤 (등록/수정·보기 열었을 때 보이도록)
  useEffect(() => {
    if (!selectedStoreId) return
    const timer = setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedStoreId])

  // 폼이 열릴 때(등록 또는 수정 클릭) 폼 영역으로 스크롤
  useEffect(() => {
    if (!showForm) return
    const timer = setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => clearTimeout(timer)
  }, [showForm])

  const handleOpenStore = (storeId: string, openForm: boolean) => {
    setSelectedStoreId(storeId)
    setShowForm(openForm)
    setEditingChecklist(null)
    handleStoreChange(storeId)
  }

  const handleBackToList = () => {
    setSelectedStoreId('')
    setChecklists([])
    setShowForm(false)
    setEditingChecklist(null)
  }

  return (
    <div>
      {/* 상단: 필터 + 검색 (사용자 관리와 동일 레이아웃) */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-sm font-medium text-gray-700">체크리스트 현황:</span>
          <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
            <button
              type="button"
              onClick={() => setChecklistFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${checklistFilter === 'all' ? 'bg-white shadow text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setChecklistFilter('has')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${checklistFilter === 'has' ? 'bg-white shadow text-green-700 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              있음
            </button>
            <button
              type="button"
              onClick={() => setChecklistFilter('none')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${checklistFilter === 'none' ? 'bg-white shadow text-amber-700 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              없음
            </button>
          </div>
        </div>
        <div className="flex-1 sm:max-w-md w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="매장명, 주소로 검색..."
            className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && !selectedStoreId && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* 매장 목록 테이블 (데스크톱) - 사용자 관리와 동일 스타일 */}
      <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  매장명
                  <SortIcon column="name" />
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('checklist')}
                >
                  체크리스트
                  <SortIcon column="checklist" />
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedStores.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 lg:px-6 py-8 text-center text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : checklistFilter === 'all' ? '등록된 매장이 없습니다.' : '조건에 맞는 매장이 없습니다.'}
                  </td>
                </tr>
              ) : (
                paginatedStores.map((store) => {
                  const hasChecklist = createdStoreIds.has(store.id) || storeHasChecklist[store.id]
                  return (
                    <tr key={store.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{store.name}</div>
                        {store.address && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{store.address}</div>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            hasChecklist ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {hasChecklist ? '있음' : '없음'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {hasChecklist ? (
                          <button
                            type="button"
                            onClick={() => handleOpenStore(store.id, false)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            수정·보기
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenStore(store.id, true)}
                            className="text-green-600 hover:text-green-900"
                          >
                            등록
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {sortedStores.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              총 {sortedStores.length}개 중 {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedStores.length)}개 표시
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
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
                type="button"
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

      {/* 매장 목록 카드 (모바일) - 사용자 관리와 동일 카드 스타일 + 페이지네이션 */}
      <div className="sm:hidden space-y-4">
        {paginatedStores.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500 text-sm">
            {searchTerm ? '검색 결과가 없습니다.' : checklistFilter === 'all' ? '등록된 매장이 없습니다.' : '조건에 맞는 매장이 없습니다.'}
          </div>
        ) : (
          paginatedStores.map((store) => {
            const hasChecklist = createdStoreIds.has(store.id) || storeHasChecklist[store.id]
            return (
              <div key={store.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-gray-900">{store.name}</div>
                    {store.address && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{store.address}</div>
                    )}
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                      hasChecklist ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {hasChecklist ? '있음' : '없음'}
                  </span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  {hasChecklist ? (
                    <button
                      type="button"
                      onClick={() => handleOpenStore(store.id, false)}
                      className="flex-1 px-3 py-2 text-sm rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
                    >
                      수정·보기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenStore(store.id, true)}
                      className="flex-1 px-3 py-2 text-sm rounded-md bg-green-50 text-green-600 hover:bg-green-100 font-medium"
                    >
                      등록
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
        {sortedStores.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-2 py-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages} ({sortedStores.length}개)
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 선택된 매장 상세: 사용자 관리와 동일한 정보 박스 + 폼/테이블 */}
      {selectedStoreId && (
        <div ref={detailSectionRef} className="mt-6 scroll-mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-medium text-blue-800 break-words">
                    체크리스트 관리 중: {stores.find((s) => s.id === selectedStoreId)?.name ?? ''}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-4">
                    <span>해당 매장의 체크리스트를 등록·수정합니다.</span>
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="text-blue-600 hover:text-blue-800 font-medium underline text-left sm:inline touch-manipulation"
                    >
                      ← 매장 목록으로
                    </button>
                  </div>
                </div>
              </div>
              <div className="sm:flex-shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditingChecklist(null)
                    setShowForm(true)
                  }}
                  className="w-full sm:w-auto text-sm bg-blue-600 text-white px-4 py-3 sm:px-3 sm:py-1.5 rounded-md hover:bg-blue-700 transition-colors touch-manipulation font-medium"
                >
                  + 새 체크리스트 생성
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {showForm && (
            <div ref={formSectionRef} className="mb-6 scroll-mt-4">
              <ChecklistForm
                storeId={selectedStoreId}
                stores={stores}
                staffUsers={staffUsers}
                onSuccess={handleCreateSuccess}
                onCancel={() => {
                  setShowForm(false)
                  setEditingChecklist(null)
                }}
                initialChecklist={editingChecklist}
              />
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* 데스크톱: 테이블 */}
              <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          항목 수
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          필수 사진
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          비고
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          생성일
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {checklists.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 lg:px-6 py-6 text-center text-gray-500">
                            이 매장에 체크리스트가 없습니다. 위에서 &quot;새 체크리스트 생성&quot;으로 등록하세요.
                          </td>
                        </tr>
                      ) : (
                        checklists.map((checklist) => (
                          <tr key={checklist.id} className="hover:bg-gray-50">
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {Array.isArray(checklist.items) ? checklist.items.length : 0}개
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                {checklist.requires_photos ? (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    필수
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                  checklist.review_status
                                )}`}
                              >
                                {getStatusLabel(checklist.review_status)}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {checklist.note || '-'}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {new Date(checklist.created_at).toLocaleDateString('ko-KR')}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleCopy(checklist)}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                복사
                              </button>
                              <button
                                onClick={() => handleEdit(checklist)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(checklist.id)}
                                className="text-red-600 hover:text-red-900"
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

              {/* 모바일: 카드 목록 */}
              <div className="sm:hidden space-y-3">
                {checklists.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500 text-sm">
                    이 매장에 체크리스트가 없습니다. 위에서 &quot;새 체크리스트 생성&quot;으로 등록하세요.
                  </div>
                ) : (
                  checklists.map((checklist) => (
                    <div
                      key={checklist.id}
                      className="bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-600">
                          항목 {Array.isArray(checklist.items) ? checklist.items.length : 0}개
                        </span>
                        {checklist.requires_photos && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            필수사진
                          </span>
                        )}
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(
                            checklist.review_status
                          )}`}
                        >
                          {getStatusLabel(checklist.review_status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(checklist.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      {checklist.note && (
                        <p className="text-sm text-gray-500 line-clamp-2">{checklist.note}</p>
                      )}
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => handleCopy(checklist)}
                          className="flex-1 py-2.5 text-sm font-medium rounded-md border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 touch-manipulation"
                        >
                          복사
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(checklist)}
                          className="flex-1 py-2.5 text-sm font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 touch-manipulation"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(checklist.id)}
                          className="flex-1 py-2.5 text-sm font-medium rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 touch-manipulation"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 복사 모달 - 모바일 터치 영역·패딩 최적화 */}
      {showCopyModal && copyingChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 mx-0 sm:mx-4">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">체크리스트 복사</h3>
            <p className="text-sm text-gray-600 mb-4">
              이 체크리스트를 어느 매장에 복사하시겠습니까?
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-5">
              <label htmlFor="targetStore" className="block text-sm font-medium text-gray-700 mb-2">
                대상 매장 선택
              </label>
              <select
                id="targetStore"
                value={targetStoreId}
                onChange={(e) => setTargetStoreId(e.target.value)}
                className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                disabled={copying}
              >
                <option value="">매장을 선택하세요</option>
                {stores
                  .filter((store) => store.id !== copyingChecklist.store_id) // 현재 매장 제외
                  .map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sm:space-x-3">
              <button
                onClick={handleCopyCancel}
                disabled={copying}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-medium"
              >
                취소
              </button>
              <button
                onClick={handleCopyConfirm}
                disabled={copying || !targetStoreId}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-medium"
              >
                {copying ? '복사 중...' : '복사'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

