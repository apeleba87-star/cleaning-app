'use client'

import { useState } from 'react'
import Link from 'next/link'

interface TodayTasksSectionProps {
  todaySalaryUsers: Array<{
    id: string
    name: string
    salary_date: number | null
    salary_amount: number | null
    subcontract_amount: number | null
    payroll_status?: 'paid' | 'scheduled'
    payroll_id?: string | null
    payment_id?: string | null
    role?: string
  }>
  todayDailyPayrolls?: Array<{
    id: string
    worker_name: string
    pay_period: string
    work_days: number | null
    daily_wage: number | null
    amount: number
    paid_at: string | null
    status: 'scheduled' | 'paid'
  }>
  todayPaymentStores: Array<{
    id: string
    name: string
    payment_day: number | null
    service_amount: number | null
    is_paid: boolean
    is_auto_payment: boolean
  }>
  totalUnpaid: number
  unpaidCount: number
  formatCurrency: (amount: number) => string
  onMarkPayrollAsPaid?: (payrollId: string, userName: string) => void
  onMarkSubcontractAsPaid?: (paymentId: string, userName: string) => void
  onMarkDailyPayrollAsPaid?: (payrollId: string, workerName: string) => void
  onPartialPayment?: (storeId: string, storeName: string) => void
  onFullPayment?: (storeId: string, storeName: string) => void
  errorStates?: Record<string, string>
}

export default function TodayTasksSection({
  todaySalaryUsers,
  todayDailyPayrolls = [],
  todayPaymentStores,
  totalUnpaid,
  unpaidCount,
  formatCurrency,
  onMarkPayrollAsPaid,
  onMarkSubcontractAsPaid,
  onMarkDailyPayrollAsPaid,
  onPartialPayment,
  onFullPayment,
  errorStates = {},
}: TodayTasksSectionProps) {
  const [payrollSubmitting, setPayrollSubmitting] = useState<string | null>(null)
  const [subcontractSubmitting, setSubcontractSubmitting] = useState<string | null>(null)
  const [dailyPayrollSubmitting, setDailyPayrollSubmitting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const getRoleLabel = (role?: string) => {
    if (role === 'subcontract_individual') return '도급(개인)'
    if (role === 'subcontract_company') return '도급(업체)'
    return null
  }

  const isSubcontract = (role?: string) => {
    return role === 'subcontract_individual' || role === 'subcontract_company'
  }

  const hasTasks =
    todaySalaryUsers.length > 0 || 
    todayDailyPayrolls.length > 0 || 
    todayPaymentStores.length > 0 || 
    unpaidCount > 0

  if (!hasTasks) {
    return null
  }

  const handleMarkPayrollAsPaid = async (payrollId: string, userName: string) => {
    if (!onMarkPayrollAsPaid) return
    setPayrollSubmitting(payrollId)
    try {
      await onMarkPayrollAsPaid(payrollId, userName)
    } finally {
      setPayrollSubmitting(null)
    }
  }

  const handleMarkSubcontractAsPaid = async (paymentId: string, userName: string) => {
    if (!onMarkSubcontractAsPaid) return
    setSubcontractSubmitting(paymentId)
    try {
      await onMarkSubcontractAsPaid(paymentId, userName)
    } finally {
      setSubcontractSubmitting(null)
    }
  }

  const handlePartialPayment = async (storeId: string, storeName: string) => {
    if (!onPartialPayment) return
    setSubmitting(true)
    try {
      await onPartialPayment(storeId, storeName)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFullPayment = async (storeId: string, storeName: string) => {
    if (!onFullPayment) return
    setSubmitting(true)
    try {
      await onFullPayment(storeId, storeName)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">오늘의 작업</h2>
        <span className="text-xs text-gray-500">
          {todaySalaryUsers.length + todayDailyPayrolls.length + todayPaymentStores.length + (unpaidCount > 0 ? 1 : 0)}개 작업
        </span>
      </div>

      <div className="space-y-4">
        {/* 급여일 직원 */}
        {todaySalaryUsers.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">급여일 직원</h3>
                <p className="text-xs text-gray-500">{todaySalaryUsers.length}명</p>
              </div>
              <Link
                href="/business/payrolls"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                전체보기 →
              </Link>
            </div>
            <div className="space-y-2">
              {todaySalaryUsers.slice(0, 3).map((user) => {
                const roleLabel = getRoleLabel(user.role)
                const isSubcontractUser = isSubcontract(user.role)
                // 도급 직원/업체는 도급금액, 일반 직원은 급여 표시
                const displayAmount = isSubcontractUser ? user.subcontract_amount : user.salary_amount
                const isPaid = user.payroll_status === 'paid'
                
                return (
                <div
                  key={user.id}
                  className={`bg-white rounded p-3 flex items-center justify-between ${isPaid ? 'opacity-60' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isPaid ? 'text-gray-500' : 'text-gray-900'}`}>{user.name}</p>
                      {roleLabel && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                          {roleLabel}
                        </span>
                      )}
                    </div>
                    {displayAmount !== null && displayAmount !== undefined && (
                      <p className={`text-xs ${isPaid ? 'text-gray-400' : 'text-gray-500'}`}>{formatCurrency(displayAmount)}</p>
                    )}
                    {/* 에러 메시지 표시 */}
                    {(errorStates[user.payroll_id || ''] || errorStates[user.payment_id || '']) && (
                      <p className="text-xs text-red-600 mt-1">
                        {(errorStates[user.payroll_id || ''] || errorStates[user.payment_id || ''])}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <button
                        disabled
                        className="px-3 py-1.5 text-xs bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                      >
                        지급 완료
                      </button>
                    ) : (
                      <>
                        {isSubcontractUser && user.payment_id && onMarkSubcontractAsPaid ? (
                          <button
                            onClick={() => {
                              setSubcontractSubmitting(user.payment_id!)
                              onMarkSubcontractAsPaid(user.payment_id!, user.name)
                            }}
                            disabled={subcontractSubmitting === user.payment_id}
                            className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {subcontractSubmitting === user.payment_id ? '처리 중...' : '지급 완료'}
                          </button>
                        ) : user.payroll_id && onMarkPayrollAsPaid ? (
                          <button
                            onClick={() => handleMarkPayrollAsPaid(user.payroll_id!, user.name)}
                            disabled={payrollSubmitting === user.payroll_id}
                            className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {payrollSubmitting === user.payroll_id ? '처리 중...' : '지급 완료'}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              )})}
              {todaySalaryUsers.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  외 {todaySalaryUsers.length - 3}명
                </p>
              )}
            </div>
          </div>
        )}

        {/* 일당 직원 */}
        {todayDailyPayrolls.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">일당 직원</h3>
                <p className="text-xs text-gray-500">{todayDailyPayrolls.length}명</p>
              </div>
              <Link
                href="/business/payrolls?tab=daily"
                className="text-xs text-orange-600 hover:text-orange-800 font-medium"
              >
                전체보기 →
              </Link>
            </div>
            <div className="space-y-2">
              {todayDailyPayrolls.slice(0, 3).map((payroll) => {
                const isPaid = payroll.status === 'paid'
                return (
                <div
                  key={payroll.id}
                  className={`bg-white rounded p-3 flex items-center justify-between ${isPaid ? 'opacity-60' : ''}`}
                >
                  <div className="flex-1">
                    <p className={`font-medium ${isPaid ? 'text-gray-500' : 'text-gray-900'}`}>{payroll.worker_name}</p>
                    <p className={`text-xs ${isPaid ? 'text-gray-400' : 'text-gray-500'}`}>{formatCurrency(payroll.amount)}</p>
                    {/* 에러 메시지 표시 */}
                    {errorStates[payroll.id] && (
                      <p className="text-xs text-red-600 mt-1">
                        {errorStates[payroll.id]}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <button
                        disabled
                        className="px-3 py-1.5 text-xs bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                      >
                        지급 완료
                      </button>
                    ) : (
                      onMarkDailyPayrollAsPaid && (
                        <button
                          onClick={() => {
                            setDailyPayrollSubmitting(payroll.id)
                            onMarkDailyPayrollAsPaid(payroll.id, payroll.worker_name)
                          }}
                          disabled={dailyPayrollSubmitting === payroll.id}
                          className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {dailyPayrollSubmitting === payroll.id ? '처리 중...' : '지급 완료'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )})}
              {todayDailyPayrolls.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  외 {todayDailyPayrolls.length - 3}명
                </p>
              )}
            </div>
          </div>
        )}

        {/* 수금일 매장 */}
        {todayPaymentStores.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">수금일 매장</h3>
                <p className="text-xs text-gray-500">{todayPaymentStores.length}곳</p>
              </div>
              <Link
                href="/business/receivables"
                className="text-xs text-green-600 hover:text-green-800 font-medium"
              >
                전체보기 →
              </Link>
            </div>
            <div className="space-y-2">
              {todayPaymentStores.slice(0, 3).map((store) => (
                <div
                  key={store.id}
                  className="bg-white rounded p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{store.name}</p>
                    {store.service_amount && (
                      <p className="text-xs text-gray-500">{formatCurrency(store.service_amount)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {store.is_paid ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        {store.is_auto_payment ? '자동결제완료' : '결제완료'}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePartialPayment(store.id, store.name)}
                          disabled={submitting}
                          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          부분완납
                        </button>
                        <button
                          onClick={() => handleFullPayment(store.id, store.name)}
                          disabled={submitting}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          전체완납
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {todayPaymentStores.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  외 {todayPaymentStores.length - 3}곳
                </p>
              )}
            </div>
          </div>
        )}

        {/* 미수금 알림 */}
        {unpaidCount > 0 && (
          <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">미수금 확인 필요</h3>
                <p className="text-xs text-gray-500">{unpaidCount}건</p>
                <p className="text-lg font-bold text-red-600 mt-1">
                  {formatCurrency(totalUnpaid)}
                </p>
              </div>
              <Link
                href="/business/financial?section=unpaid"
                className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 font-medium"
              >
                확인하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

