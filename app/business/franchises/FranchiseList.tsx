'use client'

import { useState, useMemo, useEffect } from 'react'
import { Franchise } from '@/types/db'
import FranchiseForm from './FranchiseForm'

const PAGE_SIZE = 30
type SortKey = 'name' | 'manager_name' | 'status' | 'contract'

interface FranchiseListProps {
  initialFranchises: Franchise[]
  companyId: string
}

export default function FranchiseList({ initialFranchises, companyId }: FranchiseListProps) {
  const [franchises, setFranchises] = useState<Franchise[]>(initialFranchises)
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const handleCreate = () => {
    setEditingFranchise(null)
    setShowForm(true)
    setError(null)
  }

  const handleEdit = (franchise: Franchise) => {
    setEditingFranchise(franchise)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (franchiseId: string) => {
    if (!confirm('정말 이 프렌차이즈를 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/franchises/${franchiseId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.')
      }

      setFranchises(franchises.filter((f) => f.id !== franchiseId))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = (franchise: Franchise) => {
    if (editingFranchise) {
      setFranchises(franchises.map((f) => (f.id === franchise.id ? franchise : f)))
    } else {
      setFranchises([franchise, ...franchises])
    }
    setShowForm(false)
    setEditingFranchise(null)
    setError(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingFranchise(null)
    setError(null)
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '활성'
      case 'inactive':
        return '비활성'
      case 'suspended':
        return '정지'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

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

  const filteredFranchises = useMemo(() => {
    if (!searchTerm) return franchises
    const lower = searchTerm.toLowerCase()
    return franchises.filter(
      (f) =>
        f.name?.toLowerCase().includes(lower) ||
        f.manager_name?.toLowerCase().includes(lower) ||
        f.phone?.toLowerCase().includes(lower) ||
        (f.email && f.email.toLowerCase().includes(lower)) ||
        getStatusLabel(f.status).toLowerCase().includes(lower)
    )
  }, [franchises, searchTerm])

  const sortedFranchises = useMemo(() => {
    if (!sortBy) return filteredFranchises
    const sorted = [...filteredFranchises].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') {
        cmp = (a.name ?? '').localeCompare(b.name ?? '')
      } else if (sortBy === 'manager_name') {
        cmp = (a.manager_name ?? '').localeCompare(b.manager_name ?? '')
      } else if (sortBy === 'status') {
        cmp = getStatusLabel(a.status).localeCompare(getStatusLabel(b.status))
      } else if (sortBy === 'contract') {
        const startA = a.contract_start_date ?? ''
        const startB = b.contract_start_date ?? ''
        cmp = startA.localeCompare(startB)
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredFranchises, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedFranchises.length / PAGE_SIZE))
  const paginatedFranchises = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedFranchises.slice(start, start + PAGE_SIZE)
  }, [sortedFranchises, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-4">
        <button
          onClick={handleCreate}
          disabled={showForm}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md transition-colors ${
            showForm ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          + 새 프렌차이즈 등록
        </button>
        <div className="flex-1 sm:max-w-md w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="프렌차이즈명, 담당자, 연락처로 검색..."
            className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  {editingFranchise ? `프렌차이즈 수정: ${editingFranchise.name}` : '새 프렌차이즈 등록'}
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  {editingFranchise ? '정보를 수정한 뒤 저장하세요.' : '필수 항목을 입력한 뒤 등록하세요.'}
                </p>
              </div>
            </div>
          </div>
          <FranchiseForm
            franchise={editingFranchise}
            companyId={companyId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {/* 데스크톱: 테이블 (사용자 등록 관리와 동일 스타일) */}
      <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  프렌차이즈명
                  <SortIcon column="name" />
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('manager_name')}
                >
                  담당자
                  <SortIcon column="manager_name" />
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  상태
                  <SortIcon column="status" />
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('contract')}
                >
                  계약기간
                  <SortIcon column="contract" />
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedFranchises.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 lg:px-6 py-6 text-center text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '등록된 프렌차이즈가 없습니다.'}
                  </td>
                </tr>
              ) : (
                paginatedFranchises.map((franchise) => (
                  <tr key={franchise.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{franchise.name}</div>
                      {franchise.business_registration_number && (
                        <div className="text-xs text-gray-500">사업자: {franchise.business_registration_number}</div>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {franchise.manager_name || '-'}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{franchise.phone || '-'}</div>
                      {franchise.email && <div className="text-xs text-gray-400">{franchise.email}</div>}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(franchise.status)}`}>
                        {getStatusLabel(franchise.status)}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {franchise.contract_start_date && franchise.contract_end_date
                        ? `${new Date(franchise.contract_start_date).toLocaleDateString('ko-KR')} ~ ${new Date(franchise.contract_end_date).toLocaleDateString('ko-KR')}`
                        : '-'}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(franchise)} className="text-blue-600 hover:text-blue-900 mr-3">
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(franchise.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
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
        {sortedFranchises.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              총 {sortedFranchises.length}개 중 {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedFranchises.length)}개 표시
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

      {/* 모바일: 카드 (사용자 등록 관리와 동일 스타일) */}
      <div className="sm:hidden space-y-4">
        <div className="flex items-center gap-2">
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
            <option value="name">프렌차이즈명</option>
            <option value="manager_name">담당자</option>
            <option value="status">상태</option>
            <option value="contract">계약기간</option>
          </select>
          {sortBy && (
            <button type="button" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))} className="text-sm text-blue-600">
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          )}
        </div>
        {paginatedFranchises.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500 text-sm">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 프렌차이즈가 없습니다.'}
          </div>
        ) : (
          paginatedFranchises.map((franchise) => (
            <div key={franchise.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-gray-900">{franchise.name}</div>
                  {franchise.business_registration_number && (
                    <div className="text-xs text-gray-500">사업자: {franchise.business_registration_number}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">{franchise.manager_name || '-'}</div>
                  <div className="text-xs text-gray-500">{franchise.phone || '-'}</div>
                </div>
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${getStatusColor(franchise.status)}`}>
                  {getStatusLabel(franchise.status)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                계약: {franchise.contract_start_date && franchise.contract_end_date
                  ? `${new Date(franchise.contract_start_date).toLocaleDateString('ko-KR')} ~ ${new Date(franchise.contract_end_date).toLocaleDateString('ko-KR')}`
                  : '-'}
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(franchise)}
                  disabled={showForm}
                  className="flex-1 px-3 py-2 text-sm rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(franchise.id)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 text-sm rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
        {sortedFranchises.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-2 py-3 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages} ({sortedFranchises.length}개)
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}











