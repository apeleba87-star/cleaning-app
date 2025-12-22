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

  useEffect(() => {
    loadReceipts()
  }, [period])

  const loadReceipts = async () => {
    try {
      setLoading(true)
      // 먼저 해당 기간의 revenue_id 목록 가져오기
      const revenueResponse = await fetch(`/api/business/revenues?period=${period}`)
      if (!revenueResponse.ok) {
        throw new Error('매출 데이터를 불러올 수 없습니다.')
      }
      const revenueData = await revenueResponse.json()
      const revenueIds = revenueData.data?.map((r: any) => r.id) || []

      if (revenueIds.length === 0) {
        setReceipts([])
        setLoading(false)
        return
      }

      // 각 revenue_id에 대한 수금 조회
      const allReceipts: Receipt[] = []
      for (const revenueId of revenueIds) {
        const receiptResponse = await fetch(`/api/business/receipts?revenue_id=${revenueId}`)
        if (receiptResponse.ok) {
          const receiptData = await receiptResponse.json()
          if (receiptData.success && receiptData.data) {
            allReceipts.push(...receiptData.data)
          }
        }
      }

      // received_at 기준으로 정렬
      allReceipts.sort((a, b) => 
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      )

      setReceipts(allReceipts)
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
          onChange={(e) => setSearchTerm(e.target.value)}
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
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  수금 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredReceipts.map((receipt) => (
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
      </div>
    </div>
  )
}

