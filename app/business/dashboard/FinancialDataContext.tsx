'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface FinancialData {
  period: string
  total_revenue: number
  revenue_count: number
  total_received: number
  receipt_count: number
  total_unpaid: number
  unpaid_count: number
  total_expenses: number
  expense_count: number
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
    payroll_status?: 'paid' | 'scheduled'
    payroll_id?: string | null
  }>
  today_payment_stores: Array<{
    id: string
    name: string
    payment_day: number | null
    service_amount: number | null
    is_paid: boolean
    is_auto_payment: boolean
  }>
  today_daily_payrolls?: Array<any>
}

interface FinancialDataContextType {
  financialData: FinancialData | null
  setFinancialData: (data: FinancialData | null) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  loadFinancialData: () => Promise<void>
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined)

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/business/financial-summary')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '재무 데이터를 불러올 수 없습니다.')
      }

      const data = await response.json()
      if (data.success) {
        setFinancialData(data.data)
      } else {
        throw new Error('재무 데이터를 불러올 수 없습니다.')
      }
    } catch (err: any) {
      console.error('Failed to load financial data:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <FinancialDataContext.Provider value={{ financialData, setFinancialData, loading, setLoading, loadFinancialData }}>
      {children}
    </FinancialDataContext.Provider>
  )
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext)
  if (context === undefined) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider')
  }
  return context
}
