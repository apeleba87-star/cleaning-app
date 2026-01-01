'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import QuickExpenseForm from './QuickExpenseForm'
import { useFinancialData } from './FinancialDataContext'

interface FinancialSummary {
  period: string
  total_revenue: number
  revenue_count: number
  total_received: number
  receipt_count: number
  total_unpaid: number
  unpaid_count: number
  total_expenses: number
  expense_count: number
  total_recurring_expenses: number
  total_payroll: number
  paid_payroll: number
  paid_payroll_count: number
  scheduled_payroll: number
  scheduled_payroll_count: number
  top_unpaid_stores: Array<{
    store_id: string
    store_name: string
    unpaid_amount: number
    payment_day: number | null
  }>
  today_salary_users: Array<{
    id: string
    name: string
    salary_date: number | null
    salary_amount: number | null
    subcontract_amount: number | null
    payroll_status?: 'paid' | 'scheduled' // 지급완료 또는 예정
    payroll_id?: string | null // 인건비 ID
    payment_id?: string | null // 도급 지급 ID
    role?: string
  }>
  today_payment_stores: Array<{
    id: string
    name: string
    payment_day: number | null
    service_amount: number | null
    is_paid: boolean
    is_auto_payment: boolean
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
  const { financialData, setFinancialData, setLoading: setContextLoading } = useFinancialData()
  const [summary, setSummary] = useState<FinancialSummary | null>(financialData)
  const [loading, setLoading] = useState(!financialData)
  const [error, setError] = useState<string | null>(null)
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<{ store_id: string; store_name: string } | null>(null)
  const [storeRevenues, setStoreRevenues] = useState<Revenue[]>([])
  const [selectedRevenue, setSelectedRevenue] = useState<string>('')
  const [partialAmount, setPartialAmount] = useState('')
  const [partialDate, setPartialDate] = useState('')
  const [partialMemo, setPartialMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payrollSubmitting, setPayrollSubmitting] = useState<string | null>(null) // 특정 인건비 제출 중 상태

  const loadFinancialSummary = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/business/financial-summary')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '재무 데이터를 불러올 수 없습니다.')
      }

      const data = await response.json()
      if (data.success) {
        // 디버깅용 로그
        console.log('[Financial Summary] Loaded data:', {
          today_salary_users_count: data.data?.today_salary_users?.length || 0,
          today_salary_users: data.data?.today_salary_users,
          today_payment_stores_count: data.data?.today_payment_stores?.length || 0,
        })
        
        // 각 급여일 직원의 상세 정보 출력
        if (data.data?.today_salary_users && data.data.today_salary_users.length > 0) {
          console.log('[Financial Summary] Today salary users details:')
          data.data.today_salary_users.forEach((user: any) => {
            console.log('  -', user.name, {
              role: user.role,
              salary_date: user.salary_date,
              salary_amount: user.salary_amount,
              subcontract_amount: user.subcontract_amount,
              payroll_status: user.payroll_status
            })
          })
        } else {
          console.log('[Financial Summary] No salary users found for today!')
        }
        setSummary(data.data)
        setFinancialData(data.data) // Context에 데이터 저장
      } else {
        throw new Error('재무 데이터를 불러올 수 없습니다.')
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to load financial summary:', err)
    } finally {
      setLoading(false)
    }
  }, [setFinancialData])

  useEffect(() => {
    // Context에 데이터가 없을 때만 로드
    if (!financialData) {
      loadFinancialSummary()
    } else {
      setSummary(financialData)
      setLoading(false)
    }
  }, [companyId, financialData, loadFinancialSummary])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const handleFullPayment = async (storeId: string, storeName: string) => {
    if (!confirm(`${storeName}의 전체 미수금을 완납 처리하시겠습니까?`)) {
      return
    }

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

        if (unpaidRevenues.length === 0) {
          alert('완납할 미수금이 없습니다.')
          return
        }

        // 각 매출에 대해 전체 완납 처리
        const today = new Date().toISOString().split('T')[0]
        let successCount = 0
        let failCount = 0

        for (const revenue of unpaidRevenues) {
          // 매출의 남은 미수금액 계산
          const receiptsResponse = await fetch(`/api/business/receipts?revenue_id=${revenue.id}`)
          if (receiptsResponse.ok) {
            const receiptsResult = await receiptsResponse.json()
            if (receiptsResult.success) {
              const receipts = receiptsResult.data || []
              const totalReceived = receipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
              const remainingAmount = revenue.amount - totalReceived

              if (remainingAmount > 0) {
                const receiptResponse = await fetch('/api/business/receipts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    revenue_id: revenue.id,
                    received_at: new Date(today).toISOString(),
                    amount: remainingAmount,
                    memo: '전체 완납',
                  }),
                })

                if (receiptResponse.ok) {
                  const receiptResult = await receiptResponse.json()
                  if (receiptResult.success) {
                    successCount++
                  } else {
                    console.error('[FinancialSummarySection] Receipt creation failed:', {
                      revenue_id: revenue.id,
                      error: receiptResult.error,
                    })
                    failCount++
                  }
                } else {
                  const errorData = await receiptResponse.json().catch(() => ({}))
                  console.error('[FinancialSummarySection] Receipt creation failed:', {
                    revenue_id: revenue.id,
                    status: receiptResponse.status,
                    error: errorData,
                  })
                  failCount++
                }
              }
            } else {
              failCount++
            }
          } else {
            failCount++
          }
        }

        if (successCount > 0) {
          alert(`${successCount}건의 매출이 완납 처리되었습니다.${failCount > 0 ? ` (${failCount}건 실패)` : ''}`)
          loadFinancialSummary()
        } else {
          alert('완납 처리에 실패했습니다.')
        }
      }
    } catch (err: any) {
      alert(err.message || '완납 처리 중 오류가 발생했습니다.')
    }
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

  const handleMarkPayrollAsPaid = async (payrollId: string, userName: string) => {
    if (!confirm(`${userName}의 인건비를 지급 완료 처리하시겠습니까?`)) {
      return
    }

    try {
      setPayrollSubmitting(payrollId)
      const response = await fetch(`/api/business/payrolls/${payrollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paid_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '지급 완료 처리 실패')
      }

      alert('지급 완료 처리되었습니다.')
      loadFinancialSummary()
    } catch (err: any) {
      alert(err.message || '지급 완료 처리 중 오류가 발생했습니다.')
    } finally {
      setPayrollSubmitting(null)
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

  // 오늘 날짜 포맷팅
  const today = new Date()
  const todayFormatted = `${today.getMonth() + 1}월 ${today.getDate()}일`

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      {/* 오늘 날짜 표시 */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">
          오늘 ({todayFormatted})
        </h3>
      </div>


      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">재무 현황</h2>
        <span className="text-sm text-gray-500">{summary.period}</span>
      </div>

      {/* 재무 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Link
          href="/business/financial?section=revenue"
          className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500 hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 매출</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
          <p className="text-xs text-gray-500 mt-1">{summary.revenue_count}건</p>
          <p className="text-xs text-blue-600 mt-2 font-medium">전체보기 →</p>
        </Link>

        <Link
          href="/business/financial?section=receipt"
          className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500 hover:bg-green-100 transition-colors cursor-pointer"
        >
          <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 수금</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_received)}</p>
          <p className="text-xs text-gray-500 mt-1">{summary.receipt_count}건</p>
          <p className="text-xs text-green-600 mt-2 font-medium">전체보기 →</p>
        </Link>

        <Link
          href="/business/financial?section=unpaid"
          className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500 hover:bg-red-100 transition-colors cursor-pointer"
        >
          <h3 className="text-sm font-medium text-gray-600 mb-1">현재 미수금</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_unpaid)}</p>
          <p className="text-xs text-gray-500 mt-1">{summary.unpaid_count}건</p>
          <p className="text-xs text-red-600 mt-2 font-medium">전체보기 →</p>
        </Link>

        <Link
          href="/business/financial?section=expense"
          className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500 hover:bg-orange-100 transition-colors cursor-pointer"
        >
          <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 지출</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_expenses)}</p>
          <p className="text-xs text-gray-500 mt-1">{summary.expense_count}건</p>
          {summary.total_recurring_expenses > 0 && (
            <p className="text-xs text-purple-700 mt-1">고정비: {formatCurrency(summary.total_recurring_expenses)}</p>
          )}
          <p className="text-xs text-orange-600 mt-2 font-medium">전체보기 →</p>
        </Link>

        <Link
          href="/business/financial?section=payroll"
          className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500 hover:bg-purple-100 transition-colors cursor-pointer"
        >
          <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 인건비</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_payroll)}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">지급완료:</span>
              <span className="font-semibold text-green-600">
                {summary.paid_payroll_count}건 {formatCurrency(summary.paid_payroll)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">예정:</span>
              <span className="font-semibold text-yellow-600">
                {summary.scheduled_payroll_count}건 {formatCurrency(summary.scheduled_payroll)}
              </span>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2 font-medium">전체보기 →</p>
        </Link>
      </div>

      {/* 빠른 지출 등록 */}
      <QuickExpenseForm onSuccess={loadFinancialSummary} />

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    최근 수금일
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {store.payment_day 
                        ? `매월 ${store.payment_day}일`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handlePartialPayment(store.store_id, store.store_name)}
                        className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600"
                      >
                        부분 완납
                      </button>
                      <button
                        onClick={() => handleFullPayment(store.store_id, store.store_name)}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600"
                      >
                        전체 완납
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

