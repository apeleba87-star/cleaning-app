'use client'

import { useState, useEffect } from 'react'

interface Receipt {
  id: string
  revenue_id: string
  received_at: string
  amount: number
  memo: string | null
  revenues: {
    id: string
    store_id: string
    service_period: string
    amount: number
    stores: {
      id: string
      name: string
    } | null
  } | null
}

interface ReceiptDetailSectionProps {
  period: string
  onRefresh: () => void
}

export default function ReceiptDetailSection({ period, onRefresh }: ReceiptDetailSectionProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    // 검색어는 클라이언트 사이드 필터링만 하므로, period나 currentPage 변경 시에만 API 호출
    // 검색어가 없으면 페이지네이션 적용
    loadReceipts(true)
  }, [period, currentPage])

  const loadReceipts = async (usePagination: boolean) => {
    try {
      setLoading(true)
      const url = usePagination 
        ? `/api/business/receipts?period=${period}&page=${currentPage}&limit=${itemsPerPage}`
        : `/api/business/receipts?period=${period}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('수금 데이터를 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success) {
        setReceipts(data.data || [])
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
        } else {
          setTotalPages(1)
        }
      }
    } catch (error: any) {
      console.error('Error loading receipts:', error)
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

  const filteredReceipts = receipts.filter((receipt) => {
    return receipt.revenues?.stores?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false
  })

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)

  // 페이지네이션 계산 (검색어가 없을 때만)
  const displayReceipts = searchTerm ? filteredReceipts : filteredReceipts
  const displayTotalPages = searchTerm ? 1 : totalPages

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">수금 데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">수금 상세</h2>
        <input
          type="text"
          placeholder="매장명 검색..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1) // 검색 시 첫 페이지로
          }}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="mb-4 p-4 bg-green-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">총 수금:</span>
          <span className="text-lg font-bold text-green-600">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-700">건수:</span>
          <span className="text-lg font-bold text-gray-900">{filteredReceipts.length}건</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매장명
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수금일
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                메모
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayReceipts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  수금 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              displayReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {receipt.revenues?.stores?.name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(receipt.received_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                    {formatCurrency(receipt.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {receipt.memo || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* 페이지네이션 */}
        {!searchTerm && displayTotalPages > 1 && (
          <div className="bg-gray-50 px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              페이지 {currentPage} / {displayTotalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                이전
              </button>
              {Array.from({ length: Math.min(displayTotalPages, 10) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                    currentPage === page
                      ? 'bg-green-600 text-white border-green-600'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(displayTotalPages, prev + 1))}
                disabled={currentPage === displayTotalPages}
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



