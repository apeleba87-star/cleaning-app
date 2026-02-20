'use client'

import { useState, useEffect } from 'react'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { parseCurrencyNumber } from '@/lib/utils/currency'

interface UnpaidRevenue {
  revenue_id: string
  store_id: string
  store_name: string
  service_period: string
  amount: number
  received_amount: number
  unpaid_amount: number
  due_date: string
  days_overdue: number
}

interface UnpaidDetailSectionProps {
  onRefresh: () => void
}

export default function UnpaidDetailSection({ onRefresh }: UnpaidDetailSectionProps) {
  const [unpaidRevenues, setUnpaidRevenues] = useState<UnpaidRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false)
  const [selectedRevenue, setSelectedRevenue] = useState<UnpaidRevenue | null>(null)
  const [partialAmount, setPartialAmount] = useState('')
  const [partialDate, setPartialDate] = useState('')
  const [partialMemo, setPartialMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadUnpaidRevenues()
  }, [])

  const loadUnpaidRevenues = async () => {
    try {
      setLoading(true)
      // 최적화된 API: 한 번의 호출로 모든 미수금 데이터 조회
      const response = await fetch('/api/business/unpaid-revenues')
      if (!response.ok) {
        throw new Error('미수금 데이터를 불러올 수 없습니다.')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '미수금 데이터를 불러올 수 없습니다.')
      }
      
      // 서버에서 이미 계산된 미수금 데이터 사용
      setUnpaidRevenues(result.data || [])
    } catch (error: any) {
      console.error('Error loading unpaid revenues:', error)
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

  const filteredUnpaid = unpaidRevenues.filter((item) => {
    return item.store_name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const totalUnpaid = filteredUnpaid.reduce((sum, item) => sum + item.unpaid_amount, 0)

  const handlePartialPayment = (item: UnpaidRevenue) => {
    setSelectedRevenue(item)
    setPartialAmount('')
    setPartialDate(new Date().toISOString().split('T')[0])
    setPartialMemo('')
    setShowPartialPaymentModal(true)
  }

  const handleFullPayment = async (item: UnpaidRevenue) => {
    if (!confirm(`${item.store_name}의 미수금 ${formatCurrency(item.unpaid_amount)}을 전체 완납 처리하시겠습니까?`)) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/business/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenue_id: item.revenue_id,
          received_at: new Date().toISOString(),
          amount: item.unpaid_amount,
          memo: '전체 완납',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[UnpaidDetailSection] Receipt creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error(errorData.error || `수금 등록 실패 (${response.status})`)
      }

      const result = await response.json()
      if (!result.success) {
        console.error('[UnpaidDetailSection] Receipt creation failed:', result)
        throw new Error(result.error || '수금 등록 실패')
      }

      alert('전체 완납이 등록되었습니다.')
      loadUnpaidRevenues()
      onRefresh()
    } catch (err: any) {
      console.error('[UnpaidDetailSection] Full payment error:', err)
      alert(err.message || '완납 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePartialPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRevenue || !partialAmount || !partialDate) {
      alert('수금액과 수금일을 입력해주세요.')
      return
    }

    const amount = parseCurrencyNumber(partialAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('올바른 수금액을 입력해주세요.')
      return
    }

    if (amount > selectedRevenue.unpaid_amount) {
      alert(`수금액이 미수금액(${formatCurrency(selectedRevenue.unpaid_amount)})을 초과할 수 없습니다.`)
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/business/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenue_id: selectedRevenue.revenue_id,
          received_at: new Date(partialDate).toISOString(),
          amount: amount,
          memo: partialMemo.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '수금 등록 실패')
      }

      alert('부분 완납이 등록되었습니다.')
      setShowPartialPaymentModal(false)
      setSelectedRevenue(null)
      setPartialAmount('')
      setPartialDate('')
      setPartialMemo('')
      loadUnpaidRevenues()
      onRefresh()
    } catch (err: any) {
      alert(err.message || '수금 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">미수금 데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
          미수금 상세
        </h2>
        <input
          type="text"
          placeholder="매장명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      <div className="mb-4 p-4 bg-red-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">총 미수금:</span>
          <span className="text-lg font-bold text-red-600">{formatCurrency(totalUnpaid)}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-700">건수:</span>
          <span className="text-lg font-bold text-gray-900">{filteredUnpaid.length}건</span>
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
                청구일
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                청구금액
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                수금액
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                미수금액
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                연체일수
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUnpaid.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  미수금 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUnpaid.map((item) => (
                <tr key={item.revenue_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.store_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.due_date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 text-right">
                    {formatCurrency(item.received_amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-red-600 text-right">
                    {formatCurrency(item.unpaid_amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.days_overdue > 0 ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        {item.days_overdue}일
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                    <button
                      onClick={() => handlePartialPayment(item)}
                      className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600"
                    >
                      부분 완납
                    </button>
                    <button
                      onClick={() => handleFullPayment(item)}
                      disabled={submitting}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      전체 완납
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 부분 완납 모달 */}
      {showPartialPaymentModal && selectedRevenue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">부분 완납 등록</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>매장:</strong> {selectedRevenue.store_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>미수금액:</strong> {formatCurrency(selectedRevenue.unpaid_amount)}
              </p>
            </div>
            <form onSubmit={handlePartialPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수금액 *
                </label>
                <CurrencyInput
                  value={partialAmount}
                  onChange={setPartialAmount}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="수금액을 입력하세요"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  최대 {formatCurrency(selectedRevenue.unpaid_amount)}까지 입력 가능
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수금일 *
                </label>
                <input
                  type="date"
                  value={partialDate}
                  onChange={(e) => setPartialDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <textarea
                  value={partialMemo}
                  onChange={(e) => setPartialMemo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows={3}
                  placeholder="메모를 입력하세요 (선택사항)"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPartialPaymentModal(false)
                    setSelectedRevenue(null)
                    setPartialAmount('')
                    setPartialDate('')
                    setPartialMemo('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

