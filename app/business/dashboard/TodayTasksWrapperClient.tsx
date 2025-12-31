'use client'

import { useState, useEffect } from 'react'
import TodayTasksSection from './TodayTasksSection'
import { useFinancialData } from './FinancialDataContext'

export default function TodayTasksWrapperClient({ companyId }: { companyId: string }) {
  const { financialData, loadFinancialData } = useFinancialData()
  const [loading, setLoading] = useState(!financialData)

  useEffect(() => {
    // Context에 데이터가 없을 때만 로드 (FinancialSummarySection이 먼저 로드되므로 일반적으로는 필요 없음)
    if (!financialData) {
      setLoading(false) // FinancialSummarySection이 로드 중이므로 대기
    } else {
      setLoading(false)
    }
  }, [financialData])


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const handleMarkPayrollAsPaid = async (payrollId: string, userName: string) => {
    if (!confirm(`${userName}의 인건비를 지급 완료 처리하시겠습니까?`)) {
      return
    }

    try {
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
      loadFinancialData()
    } catch (err: any) {
      alert(err.message || '지급 완료 처리 중 오류가 발생했습니다.')
    }
  }

  const handlePartialPayment = async (storeId: string, storeName: string) => {
    // 부분 완납은 재무 페이지로 이동
    window.location.href = `/business/financial?section=unpaid&store_id=${storeId}`
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
          (r: any) => r.status === 'unpaid' || r.status === 'partial'
        )

        if (unpaidRevenues.length === 0) {
          alert('완납할 미수금이 없습니다.')
          return
        }

        // 각 매출에 대해 수금 등록
        for (const revenue of unpaidRevenues) {
          const remainingAmount = revenue.amount - (revenue.received_amount || 0)
          if (remainingAmount > 0) {
            const receiptResponse = await fetch('/api/business/receipts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                revenue_id: revenue.id,
                received_at: new Date().toISOString(),
                amount: remainingAmount,
                memo: '전체 완납',
              }),
            })

            if (!receiptResponse.ok) {
              throw new Error('수금 등록 중 오류가 발생했습니다.')
            }
          }
        }

        alert('전체 완납이 등록되었습니다.')
        loadFinancialData()
      }
    } catch (err: any) {
      alert(err.message || '전체 완납 처리 중 오류가 발생했습니다.')
    }
  }

  if (loading || !financialData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">오늘의 작업을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const handleMarkSubcontractAsPaid = async (paymentId: string, userName: string) => {
    if (!confirm(`${userName}의 도급을 지급 완료 처리하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/business/subcontracts/payments/${paymentId}`, {
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
      loadFinancialData()
    } catch (err: any) {
      alert(err.message || '지급 완료 처리 중 오류가 발생했습니다.')
    }
  }

  const handleMarkDailyPayrollAsPaid = async (payrollId: string, workerName: string) => {
    if (!confirm(`${workerName}의 일당을 지급 완료 처리하시겠습니까?`)) {
      return
    }

    try {
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
      loadFinancialData()
    } catch (err: any) {
      alert(err.message || '지급 완료 처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <TodayTasksSection
      todaySalaryUsers={financialData.today_salary_users || []}
      todayDailyPayrolls={financialData.today_daily_payrolls || []}
      todayPaymentStores={financialData.today_payment_stores || []}
      totalUnpaid={financialData.total_unpaid || 0}
      unpaidCount={financialData.unpaid_count || 0}
      formatCurrency={formatCurrency}
      onMarkPayrollAsPaid={handleMarkPayrollAsPaid}
      onMarkSubcontractAsPaid={handleMarkSubcontractAsPaid}
      onMarkDailyPayrollAsPaid={handleMarkDailyPayrollAsPaid}
      onPartialPayment={handlePartialPayment}
      onFullPayment={handleFullPayment}
    />
  )
}

