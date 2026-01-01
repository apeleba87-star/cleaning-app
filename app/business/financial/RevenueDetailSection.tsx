'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Revenue {
  id: string
  store_id: string
  service_period: string
  amount: number
  due_date: string
  status: 'unpaid' | 'partial' | 'paid'
  billing_memo: string | null
  stores: {
    id: string
    name: string
  } | null
}

interface RevenueDetailSectionProps {
  period: string
  onRefresh: () => void
}

export default function RevenueDetailSection({ period, onRefresh }: RevenueDetailSectionProps) {
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  useEffect(() => {
    loadRevenues()
  }, [period])

  // 검색어나 필터 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const loadRevenues = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/revenues?period=${period}`)
      if (!response.ok) {
        throw new Error('매출 데이터를 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success) {
        setRevenues(data.data || [])
      }
    } catch (error: any) {
      console.error('Error loading revenues:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">완납</span>
      case 'partial':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">부분수금</span>
      case 'unpaid':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">미수금</span>
      default:
        return null
    }
  }

  const filteredRevenues = revenues.filter((revenue) => {
    const matchesSearch = revenue.stores?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false
    const matchesStatus = statusFilter === 'all' || revenue.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // 정렬 함수
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1) // 정렬 변경 시 첫 페이지로
  }

  // 정렬 아이콘
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400">↕</span>
    }
    return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
  }

  // 정렬된 데이터
  const sortedRevenues = [...filteredRevenues].sort((a, b) => {
    if (!sortColumn) return 0

    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case 'store_name':
        aValue = a.stores?.name || ''
        bValue = b.stores?.name || ''
        break
      case 'due_date':
        aValue = new Date(a.due_date).getTime()
        bValue = new Date(b.due_date).getTime()
        break
      case 'amount':
        aValue = a.amount
        bValue = b.amount
        break
      case 'status':
        const statusOrder: Record<string, number> = {
          'paid': 1,
          'partial': 2,
          'unpaid': 3,
        }
        aValue = statusOrder[a.status] || 4
        bValue = statusOrder[b.status] || 4
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedRevenues.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRevenues = sortedRevenues.slice(startIndex, endIndex)

  const totalAmount = filteredRevenues.reduce((sum, r) => sum + (r.amount || 0), 0)

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">매출 데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">매출 상세</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="매장명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="unpaid">미수금</option>
            <option value="partial">부분수금</option>
            <option value="paid">완납</option>
          </select>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">총 매출:</span>
          <span className="text-lg font-bold text-blue-600">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-700">건수:</span>
          <span className="text-lg font-bold text-gray-900">{filteredRevenues.length}건</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('store_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>매장명</span>
                  {getSortIcon('store_name')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('due_date')}
              >
                <div className="flex items-center space-x-1">
                  <span>청구일</span>
                  {getSortIcon('due_date')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>금액</span>
                  {getSortIcon('amount')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>상태</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                메모
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRevenues.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  매출 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              paginatedRevenues.map((revenue) => (
                <tr key={revenue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {revenue.stores?.name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(revenue.due_date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(revenue.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(revenue.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {revenue.billing_memo || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {startIndex + 1} - {Math.min(endIndex, sortedRevenues.length)} / {sortedRevenues.length}건
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // 페이지 번호 표시 로직: 현재 페이지 주변만 표시
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return <span key={page} className="px-2 text-gray-500">...</span>
                }
                return null
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



