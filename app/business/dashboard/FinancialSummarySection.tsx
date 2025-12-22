'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FinancialSummary {
  period: string
  total_revenue: number
  total_received: number
  total_unpaid: number
  total_expenses: number
  total_payroll: number
  paid_payroll: number
  scheduled_payroll: number
  top_unpaid_stores: Array<{
    store_id: string
    store_name: string
    unpaid_amount: number
  }>
}

interface Revenue {
  id: string
  store_id: string
  service_period: string
  amount: number
  status: 'unpaid' | 'partial' | 'paid'
}

interface FinancialSummarySectionProps {
  companyId: string
}

export default function FinancialSummarySection({ companyId }: FinancialSummarySectionProps) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<{ store_id: string; store_name: string } | null>(null)
  const [storeRevenues, setStoreRevenues] = useState<Revenue[]>([])
  const [selectedRevenue, setSelectedRevenue] = useState<string>('')
  const [partialAmount, setPartialAmount] = useState('')
  const [partialDate, setPartialDate] = useState('')
  const [partialMemo, setPartialMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadFinancialSummary()
  }, [companyId])

  const loadFinancialSummary = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/business/financial-summary')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '재무 데이터를 불러올 수 없습니다.')
      }

      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      } else {
        throw new Error('재무 데이터를 불러올 수 없습니다.')
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to load financial summary:', err)
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

  const handlePartialPayment = async (storeId: string, storeName: string) => {
    try {
      // 해당 매장의 미수금 매출 조회
      const response = await fetch(`/api/business/revenues?store_id=${storeId}`)
      if (!response.ok) {
        throw new Error('매출 정보를 불러올 수 없습니다.')
      }

      const result = await response.json()
      if (result.success) {
        // 미수금이 있는 매출만 필터링
        const unpaidRevenues = (result.data || []).filter(
          (r: Revenue) => r.status === 'unpaid' || r.status === 'partial'
        )
        setStoreRevenues(unpaidRevenues)
        setSelectedStore({ store_id: storeId, store_name: storeName })
        setShowPartialPaymentModal(true)
        if (unpaidRevenues.length > 0) {
          setSelectedRevenue(unpaidRevenues[0].id)
        }
      }
    } catch (err: any) {
      alert(err.message || '매출 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }

  const handlePartialPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRevenue || !partialAmount || !partialDate) {
      alert('매출, 수금액, 수금일을 모두 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/business/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenue_id: selectedRevenue,
          received_at: new Date(partialDate).toISOString(),
          amount: parseFloat(partialAmount),
          memo: partialMemo.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '수금 등록 실패')
      }

      // 성공 시 모달 닫기 및 데이터 새로고침
      setShowPartialPaymentModal(false)
      setSelectedStore(null)
      setStoreRevenues([])
      setSelectedRevenue('')
      setPartialAmount('')
      setPartialDate('')
      setPartialMemo('')
      loadFinancialSummary()
      alert('부분 완납이 등록되었습니다.')
    } catch (err: any) {
      alert(err.message || '수금 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">재무 현황</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">재무 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">재무 현황</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">재무 현황</h2>
        <span className="text-sm text-gray-500">{summary.period}</span>
      </div>

      {/* 재무 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 매출</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 수금</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_received)}</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-600 mb-1">현재 미수금</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_unpaid)}</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 지출</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_expenses)}</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 인건비</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_payroll)}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">지급완료:</span>
              <span className="font-semibold text-green-600">{formatCurrency(summary.paid_payroll)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">예정:</span>
              <span className="font-semibold text-yellow-600">{formatCurrency(summary.scheduled_payroll)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 미수금 상위 매장 리스트 */}
      {summary.top_unpaid_stores.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">미수금 상위 매장</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    매장명
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    미수금액
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.top_unpaid_stores.map((store) => (
                  <tr key={store.store_id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {store.store_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-red-600 text-right">
                      {formatCurrency(store.unpaid_amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => handlePartialPayment(store.store_id, store.store_name)}
                        className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600"
                      >
                        부분 완납
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 부분 완납 모달 */}
      {showPartialPaymentModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">부분 완납 등록</h3>
              <button
                onClick={() => {
                  setShowPartialPaymentModal(false)
                  setSelectedStore(null)
                  setStoreRevenues([])
                  setSelectedRevenue('')
                  setPartialAmount('')
                  setPartialDate('')
                  setPartialMemo('')
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePartialPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  매장
                </label>
                <input
                  type="text"
                  value={selectedStore.store_name}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  매출(청구) 선택 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRevenue}
                  onChange={(e) => {
                    setSelectedRevenue(e.target.value)
                    const revenue = storeRevenues.find(r => r.id === e.target.value)
                    if (revenue) {
                      // 미수금액 자동 계산 (간단하게 전체 금액으로 설정, 실제로는 수금액을 빼야 함)
                      setPartialAmount('')
                    }
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">매출 선택</option>
                  {storeRevenues.map((revenue) => (
                    <option key={revenue.id} value={revenue.id}>
                      {revenue.service_period} - {formatCurrency(revenue.amount)} ({revenue.status === 'partial' ? '부분수금' : '미수금'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수금액 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수금일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={partialDate}
                  onChange={(e) => setPartialDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <textarea
                  value={partialMemo}
                  onChange={(e) => setPartialMemo(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="수금 관련 메모 (선택사항)"
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? '등록 중...' : '등록'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPartialPaymentModal(false)
                    setSelectedStore(null)
                    setStoreRevenues([])
                    setSelectedRevenue('')
                    setPartialAmount('')
                    setPartialDate('')
                    setPartialMemo('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

