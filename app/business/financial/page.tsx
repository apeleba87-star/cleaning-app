'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import RevenueDetailSection from './RevenueDetailSection'
import ReceiptDetailSection from './ReceiptDetailSection'
import UnpaidDetailSection from './UnpaidDetailSection'
import PayrollDetailSection from './PayrollDetailSection'
import ExpenseDetailSection from './ExpenseDetailSection'

type ActiveSection = 'summary' | 'revenue' | 'receipt' | 'unpaid' | 'payroll' | 'expense'

// 이번 달 수익 카드 컴포넌트
function ProfitCard({ summary, formatCurrency }: { summary: any; formatCurrency: (amount: number) => string }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 순수익 계산: 매출 - 인건비 - 지출
  const netProfit = (summary.total_revenue || 0) - (summary.total_payroll || 0) - (summary.total_expenses || 0)
  
  // 실제 수익 계산: 수금액 - 지급완료 인건비 - 지출
  const actualProfit = (summary.total_received || 0) - (summary.paid_payroll || 0) - (summary.total_expenses || 0)

  // 수익 색상 결정
  const profitColor = netProfit >= 0 ? 'text-green-600' : 'text-red-600'
  const profitBgColor = netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'
  const profitBorderColor = netProfit >= 0 ? 'border-green-500' : 'border-red-500'

  return (
    <div className={`${profitBgColor} rounded-lg p-4 border-l-4 ${profitBorderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">이번 달 수익</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '접기 ▲' : '펼치기 ▼'}
        </button>
      </div>
      
      <div className="mb-2">
        <p className={`text-2xl font-bold ${profitColor}`}>
          {formatCurrency(netProfit)} <span className="text-sm text-gray-500">(예상)</span>
        </p>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
          {/* 계산 내역 */}
          <div className="bg-white rounded p-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">계산 내역</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">매출:</span>
                <span className="font-medium">{formatCurrency(summary.total_revenue || 0)}</span>
              </div>
              <div className="flex justify-between pl-4">
                <span className="text-gray-600">- 인건비:</span>
                <span className="font-medium">{formatCurrency(summary.total_payroll || 0)}</span>
              </div>
              <div className="flex justify-between pl-8 text-xs text-gray-500">
                <span>• 지급완료:</span>
                <span>{formatCurrency(summary.paid_payroll || 0)}</span>
              </div>
              <div className="flex justify-between pl-8 text-xs text-gray-500">
                <span>• 예정:</span>
                <span>{formatCurrency(summary.scheduled_payroll || 0)}</span>
              </div>
              <div className="flex justify-between pl-4">
                <span className="text-gray-600">- 지출:</span>
                <span className="font-medium">{formatCurrency(summary.total_expenses || 0)}</span>
              </div>
              <div className="border-t border-gray-200 pt-1 mt-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">= 순수익:</span>
                  <span className={`font-bold ${profitColor}`}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 참고 정보 */}
          <div className="bg-white rounded p-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">참고 정보</h4>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-gray-600">실제 수익:</span>
                  <span className={`font-semibold ${actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(actualProfit)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs pl-0.5">(수금액 - 지급완료 인건비 - 지출)</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-gray-600">미수금:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(summary.total_unpaid || 0)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs pl-0.5">(아직 미수입)</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-gray-600">예정 인건비:</span>
                  <span className="font-semibold text-yellow-600">
                    {formatCurrency(summary.scheduled_payroll || 0)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs pl-0.5">(아직 미지급)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinancialPage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('summary')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // URL 파라미터에서 section 확인
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const section = params.get('section')
      if (section && ['revenue', 'receipt', 'unpaid', 'payroll', 'expense'].includes(section)) {
        setActiveSection(section as ActiveSection)
      }
    }
    loadSummary()
  }, [period])

  const loadSummary = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/financial-summary?period=${period}`)
      if (!response.ok) {
        throw new Error('재무 데이터를 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error: any) {
      console.error('Error loading summary:', error)
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">재무 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">재무 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">재무 현황</h1>
          <p className="text-sm text-gray-500 mt-1">전체 재무 정보를 확인하고 관리하세요</p>
        </div>
        <Link
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← 대시보드로
        </Link>
      </div>

      {/* 기간 선택 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">기간:</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveSection('summary')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeSection === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            요약
          </button>
          <button
            onClick={() => setActiveSection('revenue')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeSection === 'revenue'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            매출 상세
          </button>
          <button
            onClick={() => setActiveSection('receipt')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeSection === 'receipt'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            수금 상세
          </button>
          <button
            onClick={() => setActiveSection('unpaid')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeSection === 'unpaid'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            미수금 상세
          </button>
          <button
            onClick={() => setActiveSection('payroll')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeSection === 'payroll'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            인건비 상세
          </button>
          <button
            onClick={() => setActiveSection('expense')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeSection === 'expense'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            지출 상세
          </button>
        </nav>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeSection === 'summary' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">재무 요약</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 매출</h3>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.revenue_count}건</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 수금</h3>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_received)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.receipt_count}건</p>
              </div>

              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <h3 className="text-sm font-medium text-gray-600 mb-1">현재 미수금</h3>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_unpaid)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.unpaid_count}건</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
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
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                <h3 className="text-sm font-medium text-gray-600 mb-1">이번 달 지출</h3>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_expenses || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.expense_count || 0}건</p>
              </div>
            </div>

            {/* 이번 달 수익 카드 */}
            <ProfitCard summary={summary} formatCurrency={formatCurrency} />
          </div>
        )}

        {activeSection === 'revenue' && (
          <RevenueDetailSection period={period} onRefresh={loadSummary} />
        )}

        {activeSection === 'receipt' && (
          <ReceiptDetailSection period={period} onRefresh={loadSummary} />
        )}

        {activeSection === 'unpaid' && (
          <UnpaidDetailSection onRefresh={loadSummary} />
        )}

        {activeSection === 'payroll' && (
          <PayrollDetailSection period={period} onRefresh={loadSummary} />
        )}

        {activeSection === 'expense' && (
          <ExpenseDetailSection period={period} onRefresh={loadSummary} />
        )}
      </div>
    </div>
  )
}

