'use client'

import { useState, useEffect } from 'react'
import TodayTasksWrapperClient from './TodayTasksWrapperClient'
import FinancialSummarySection from './FinancialSummarySection'
import { useFinancialData } from './FinancialDataContext'

interface DashboardExpandableSectionsProps {
  companyId: string
}

export default function DashboardExpandableSections({ companyId }: DashboardExpandableSectionsProps) {
  const { financialData, loadFinancialData } = useFinancialData()
  const [expandedTodayTasks, setExpandedTodayTasks] = useState(false)
  const [expandedFinancial, setExpandedFinancial] = useState(false)

  // 오늘의 작업을 열었을 때만 재무 데이터 로드 (Context 공유)
  useEffect(() => {
    if (expandedTodayTasks && !financialData) {
      loadFinancialData().catch((err) => console.error('Failed to load financial data:', err))
    }
  }, [expandedTodayTasks, financialData, loadFinancialData])

  return (
    <div className="space-y-4 mb-6">
      {/* 오늘의 작업 - 닫은 상태로 시작, 클릭 시 열리면서 데이터 로드 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedTodayTasks((prev) => !prev)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">오늘의 작업</h2>
          <span className="text-sm text-gray-500">
            {expandedTodayTasks ? '접기' : '클릭하여 열기'}
          </span>
          <span className="text-gray-400 ml-2">
            {expandedTodayTasks ? '▲' : '▼'}
          </span>
        </button>
        {expandedTodayTasks && (
          <div className="border-t border-gray-100 px-6 py-4">
            <TodayTasksWrapperClient companyId={companyId} />
          </div>
        )}
      </div>

      {/* 재무 현황 - 닫은 상태로 시작, 클릭 시 열리면서 데이터 로드 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedFinancial((prev) => !prev)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">재무 현황</h2>
          <span className="text-sm text-gray-500">
            {expandedFinancial ? '접기' : '클릭하여 열기'}
          </span>
          <span className="text-gray-400 ml-2">
            {expandedFinancial ? '▲' : '▼'}
          </span>
        </button>
        {expandedFinancial && (
          <div className="border-t border-gray-100 px-6 py-4">
            <FinancialSummarySection companyId={companyId} />
          </div>
        )}
      </div>
    </div>
  )
}
