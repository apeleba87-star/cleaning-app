'use client'

import { useState, useEffect } from 'react'
import { Payroll } from '@/types/db'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { parseCurrencyNumber } from '@/lib/utils/currency'

interface DailyEmployee {
  id: string
  name: string
  pay_amount: number | null
  attendance_count: number
  calculated_amount: number
}

interface DailyPayroll {
  id: string
  worker_name: string | null
  pay_period: string
  work_days: number | null
  daily_wage: number | null
  amount: number
  paid_at: string | null
  status: 'scheduled' | 'paid'
}

interface DailyPayrollSectionProps {
  selectedPeriod: string
  onRefresh: () => void
  existingDailyPayrolls?: DailyPayroll[]
  onDelete?: (id: string) => void
  onMarkAsPaid?: (id: string, workerName: string) => void
  onUpdate?: (id: string, data: { amount?: number; paid_at?: string | null; status?: 'scheduled' | 'paid'; memo?: string | null }) => Promise<void>
  searchTerm?: string
}

export default function DailyPayrollSection({
  selectedPeriod,
  onRefresh,
  existingDailyPayrolls = [],
  onDelete,
  onMarkAsPaid,
  onUpdate,
  searchTerm = '',
}: DailyPayrollSectionProps) {
  const [dailyEmployees, setDailyEmployees] = useState<DailyEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [editingPayroll, setEditingPayroll] = useState<DailyPayroll | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editPaidAt, setEditPaidAt] = useState('')
  const [editStatus, setEditStatus] = useState<'scheduled' | 'paid'>('scheduled')
  const [editMemo, setEditMemo] = useState('')

  useEffect(() => {
    if (selectedPeriod) {
      loadDailySummary()
    }
  }, [selectedPeriod])

  const loadDailySummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/business/payrolls/daily-summary?period=${selectedPeriod}`)
      if (!response.ok) {
        throw new Error('일당 직원 출근 기록을 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success) {
        setDailyEmployees(data.data || [])
      }
    } catch (err: any) {
      setError(err.message || '일당 직원 정보를 불러오는 중 오류가 발생했습니다.')
      console.error('Error loading daily summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDailyPayrolls = async () => {
    if (!selectedPeriod) {
      alert('기간을 선택해주세요.')
      return
    }

    if (dailyEmployees.length === 0) {
      alert('생성할 일당 인건비가 없습니다.')
      return
    }

    if (!confirm(`${selectedPeriod} 기간의 일당 인건비를 자동 생성하시겠습니까?`)) {
      return
    }

    try {
      setGenerating(true)
      setError(null)
      const response = await fetch('/api/business/payrolls/generate-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pay_period: selectedPeriod }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '일당 인건비 생성 실패')
      }

      alert('일당 인건비가 자동 생성되었습니다.')
      onRefresh()
      loadDailySummary()
    } catch (err: any) {
      setError(err.message || '일당 인건비 생성 중 오류가 발생했습니다.')
      console.error('Error generating daily payrolls:', err)
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const handleMarkAsPaidInternal = async (id: string, workerName: string) => {
    if (onMarkAsPaid) {
      setSubmitting(id)
      try {
        await onMarkAsPaid(id, workerName)
      } finally {
        setSubmitting(null)
      }
    }
  }

  const handleEdit = (payroll: DailyPayroll) => {
    setEditingPayroll(payroll)
    setEditAmount(payroll.amount.toString())
    setEditPaidAt(payroll.paid_at ? (typeof payroll.paid_at === 'string' ? payroll.paid_at.split('T')[0] : new Date(payroll.paid_at).toISOString().split('T')[0]) : '')
    setEditStatus(payroll.status)
    setEditMemo('') // 메모는 일당 관리에서 사용하지 않을 수도 있음
  }

  const handleCancelEdit = () => {
    setEditingPayroll(null)
    setEditAmount('')
    setEditPaidAt('')
    setEditStatus('scheduled')
    setEditMemo('')
  }

  const handleUpdatePayroll = async () => {
    if (!editingPayroll || !onUpdate) return

    try {
      setSubmitting(editingPayroll.id)
      await onUpdate(editingPayroll.id, {
        amount: parseCurrencyNumber(editAmount),
        paid_at: editPaidAt || null,
        status: editStatus,
        memo: editMemo || null,
      })
      handleCancelEdit()
    } catch (err: any) {
      setError(err.message || '수정 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">일당 직원 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const totalAmount = dailyEmployees.reduce((sum, emp) => sum + emp.calculated_amount, 0)
  const totalDays = dailyEmployees.reduce((sum, emp) => sum + emp.attendance_count, 0)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">일당 관리</h2>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>안내:</strong> 일당 인건비는 수동 등록만 가능합니다. 대량 등록 기능을 이용하여 여러 일당 근로자를 한 번에 등록할 수 있습니다.
        </p>
      </div>

      {/* 등록된 일당 인건비 목록 */}
      {(() => {
        const filteredPayrolls = searchTerm
          ? existingDailyPayrolls.filter(p => 
              p.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.pay_period?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : existingDailyPayrolls

        if (filteredPayrolls.length === 0) {
          return null
        }

        return (
          <div className="mt-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">등록된 일당 인건비</h3>
            {searchTerm && filteredPayrolls.length === 0 && (
              <p className="text-gray-500 text-sm mb-4">검색 결과가 없습니다.</p>
            )}
            
            {/* 모바일: 카드 형태 */}
            <div className="block sm:hidden space-y-4">
              {filteredPayrolls.map((payroll) => (
                <div key={payroll.id} className="bg-gradient-to-br from-white to-green-50/30 border-2 border-green-100 rounded-xl p-4 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-base mb-1">
                          {payroll.worker_name || '-'}
                        </h4>
                        <p className="text-xs text-gray-500">{payroll.pay_period}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                          payroll.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {payroll.status === 'paid' ? '지급완료' : '예정'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">일당</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {payroll.daily_wage ? formatCurrency(payroll.daily_wage) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">일수</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {payroll.work_days ? `${payroll.work_days}일` : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">총액</p>
                        {editingPayroll?.id === payroll.id ? (
                          <CurrencyInput
                            value={editAmount}
                            onChange={setEditAmount}
                            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(payroll.amount)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">지급일</p>
                        {editingPayroll?.id === payroll.id ? (
                          <input
                            type="date"
                            value={editPaidAt}
                            onChange={(e) => setEditPaidAt(e.target.value)}
                            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-xs"
                          />
                        ) : (
                          <p className="text-sm text-gray-700">
                            {payroll.paid_at
                              ? typeof payroll.paid_at === 'string'
                                ? payroll.paid_at.split('T')[0]
                                : new Date(payroll.paid_at).toISOString().split('T')[0]
                              : '-'}
                          </p>
                        )}
                      </div>
                    </div>
                    {editingPayroll?.id === payroll.id && (
                      <div className="pt-2 border-t border-gray-200">
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as 'scheduled' | 'paid')}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm mb-2"
                        >
                          <option value="scheduled">예정</option>
                          <option value="paid">지급완료</option>
                        </select>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex flex-col gap-2">
                        {editingPayroll?.id === payroll.id ? (
                          <>
                            <button
                              onClick={handleUpdatePayroll}
                              disabled={submitting === payroll.id}
                              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(payroll)}
                              className="w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors"
                            >
                              수정
                            </button>
                            {payroll.status === 'scheduled' && onMarkAsPaid && (
                              <button
                                onClick={() => handleMarkAsPaidInternal(payroll.id, payroll.worker_name || '')}
                                disabled={submitting === payroll.id}
                                className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                              >
                                지급완료 처리
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => onDelete(payroll.id)}
                                className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors"
                              >
                                삭제
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크톱: 테이블 형태 */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">기간</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">일당</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">일수</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">총액</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">지급일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayrolls.map((payroll) => (
                    <tr key={payroll.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {payroll.worker_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{payroll.pay_period}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {payroll.daily_wage ? formatCurrency(payroll.daily_wage) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {payroll.work_days ? `${payroll.work_days}일` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {editingPayroll?.id === payroll.id ? (
                          <CurrencyInput
                            value={editAmount}
                            onChange={setEditAmount}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          formatCurrency(payroll.amount)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {editingPayroll?.id === payroll.id ? (
                          <input
                            type="date"
                            value={editPaidAt}
                            onChange={(e) => setEditPaidAt(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          payroll.paid_at
                            ? typeof payroll.paid_at === 'string'
                              ? payroll.paid_at.split('T')[0]
                              : new Date(payroll.paid_at).toISOString().split('T')[0]
                            : '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingPayroll?.id === payroll.id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as 'scheduled' | 'paid')}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="scheduled">예정</option>
                            <option value="paid">지급완료</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              payroll.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {payroll.status === 'paid' ? '지급완료' : '예정'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex space-x-2">
                          {editingPayroll?.id === payroll.id ? (
                            <>
                              <button
                                onClick={handleUpdatePayroll}
                                disabled={submitting === payroll.id}
                                className="text-blue-600 hover:text-blue-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                저장
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 hover:text-gray-800 text-xs"
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(payroll)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                수정
                              </button>
                              {payroll.status === 'scheduled' && onMarkAsPaid && (
                                <button
                                  onClick={() => handleMarkAsPaidInternal(payroll.id, payroll.worker_name || '')}
                                  disabled={submitting === payroll.id}
                                  className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  지급완료
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(payroll.id)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  삭제
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

