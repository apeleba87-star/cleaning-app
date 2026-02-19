'use client'

import { useState, useEffect } from 'react'
import { Payroll } from '@/types/db'
import DailyPayrollSection from './DailyPayrollSection'
import SubcontractManagementSection from './SubcontractManagementSection'

// ESC 키로 모달 닫기 훅
const useEscapeKey = (callback: () => void) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [callback])
}

type TabType = 'regular' | 'daily' | 'subcontract'

export default function PayrollsPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [generatingRegular, setGeneratingRegular] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('regular')
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [regularSearchTerm, setRegularSearchTerm] = useState('')
  const [dailySearchTerm, setDailySearchTerm] = useState('')
  const [subcontractSearchTerm, setSubcontractSearchTerm] = useState('')
  
  // 대량 등록용 상태
  const [bulkEntries, setBulkEntries] = useState<Array<{
    workerName: string
    residentRegistrationNumber: string
    workDays: string
    dailyWage: string
    paidAt: string
    status: 'scheduled' | 'paid'
    memo: string
    applyDeduction: boolean
    bankName: string
    accountNumber: string
  }>>([{ workerName: '', residentRegistrationNumber: '', workDays: '', dailyWage: '', paidAt: '', status: 'scheduled', memo: '', applyDeduction: false, bankName: '', accountNumber: '' }])

  // 폼 상태 - 일당 근로자
  const [workerName, setWorkerName] = useState('')
  const [residentRegistrationNumber, setResidentRegistrationNumber] = useState('')
  const [workDays, setWorkDays] = useState('')
  const [dailyWage, setDailyWage] = useState('')
  const [dailyPaidAt, setDailyPaidAt] = useState('')
  const [dailyStatus, setDailyStatus] = useState<'scheduled' | 'paid'>('scheduled')
  const [dailyMemo, setDailyMemo] = useState('')
  const [applyDeduction, setApplyDeduction] = useState(false) // 3.3% 공제 적용 여부
  const [bankName, setBankName] = useState('') // 은행명
  const [accountNumber, setAccountNumber] = useState('') // 계좌번호

  useEffect(() => {
    loadData()
  }, [selectedPeriod])

  // ESC 키로 모달 닫기
  useEscapeKey(() => {
    if (showForm) {
      setShowForm(false)
      resetForm()
    }
    if (showBulkForm) {
      setShowBulkForm(false)
      setBulkEntries([{ workerName: '', residentRegistrationNumber: '', workDays: '', dailyWage: '', paidAt: '', status: 'scheduled', memo: '', applyDeduction: false, bankName: '', accountNumber: '' }])
    }
  })

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (showForm || showBulkForm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showForm, showBulkForm])

  // 기간 변경 시 미생성 직원 수 조회
  useEffect(() => {
    if (selectedPeriod && activeTab === 'regular') {
      loadPendingCount()
    }
  }, [selectedPeriod, activeTab])

  const loadPendingCount = async () => {
    try {
      const response = await fetch(`/api/business/payrolls/pending-count?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPendingCount(data.count)
        }
      }
    } catch (error) {
      console.error('Error loading pending count:', error)
      setPendingCount(null)
    }
  }

  // 현재 기간의 정규 직원 인건비가 없으면 자동 생성 제안 (한 번만 실행)
  const [hasCheckedAutoGenerate, setHasCheckedAutoGenerate] = useState(false)
  
  useEffect(() => {
    if (!loading && selectedPeriod && !hasCheckedAutoGenerate && payrolls.length >= 0) {
      setHasCheckedAutoGenerate(true)
      const currentPeriodPayrolls = payrolls.filter(p => p.pay_period === selectedPeriod && p.user_id)
      if (currentPeriodPayrolls.length === 0 && !generatingRegular) {
        // 현재 기간에 정규 직원 인건비가 없으면 자동 생성 제안
        setTimeout(() => {
          const shouldAutoGenerate = confirm(
            `현재 선택한 기간(${selectedPeriod})에 정규 직원 인건비가 없습니다.\n자동으로 생성하시겠습니까?`
          )
          if (shouldAutoGenerate) {
            handleGenerateRegularPayrolls()
          }
        }, 500) // 약간의 지연을 두어 UI가 먼저 렌더링되도록
      }
    }
  }, [loading, selectedPeriod, payrolls.length, hasCheckedAutoGenerate, generatingRegular])

  const loadData = async () => {
    if (!selectedPeriod) return
    try {
      setLoading(true)
      const response = await fetch(`/api/business/payrolls?period=${selectedPeriod}`)
      if (!response.ok) {
        throw new Error('인건비 목록 조회 실패')
      }
      const result = await response.json()
      if (result.success) {
        setPayrolls(result.data || [])
      }
      if (activeTab === 'regular') {
        loadPendingCount()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const period = selectedPeriod || new Date().toISOString().substring(0, 7)

      // 일당 근로자 인건비만 처리
      if (!workerName || !workDays || !dailyWage) {
        setError('이름, 근무 일수, 일당 금액을 입력해주세요.')
        return
      }

      // 3.3% 공제 적용 여부에 따라 금액 계산
      const baseAmount = parseFloat(dailyWage) * parseInt(workDays)
      const finalAmount = applyDeduction 
        ? Math.floor(baseAmount * (1 - 0.033)) // 3.3% 공제 후 금액 (소수점 버림)
        : baseAmount

      const response = await fetch('/api/business/payrolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_name: workerName.trim(),
          resident_registration_number: residentRegistrationNumber || null,
          work_days: parseInt(workDays),
          daily_wage: parseFloat(dailyWage),
          amount: finalAmount,
          pay_period: period,
          paid_at: dailyPaidAt || null,
          status: dailyStatus,
          memo: dailyMemo.trim() || null,
          bank_name: bankName.trim() || null,
          account_number: accountNumber.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '인건비 저장 실패')
      }

      // 성공 시 폼 초기화 및 목록 새로고침
      resetForm()
      setShowForm(false)
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleGenerateRegularPayrolls = async () => {
    if (!selectedPeriod) {
      setError('기간을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 기간(${selectedPeriod})에 대해 근무중인 모든 직원의 인건비를 자동 생성하시겠습니까?`)) {
      return
    }

    try {
      setGeneratingRegular(true)
      setError(null)

      const response = await fetch('/api/business/payrolls/generate-regular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pay_period: selectedPeriod,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '인건비 자동 생성 실패')
      }

      const result = await response.json()
      alert(`정규 직원 인건비 ${result.count}건이 생성되었습니다.`)
      loadData()
      loadPendingCount() // 미생성 직원 수 갱신
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGeneratingRegular(false)
    }
  }

  const resetForm = () => {
    setWorkerName('')
    setResidentRegistrationNumber('')
    setWorkDays('')
    setDailyWage('')
    setDailyPaidAt('')
    setDailyStatus('scheduled')
    setDailyMemo('')
    setApplyDeduction(false)
    setBankName('')
    setAccountNumber('')
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 유효한 항목만 필터링
    const validEntries = bulkEntries.filter(
      (entry) => entry.workerName.trim() && entry.workDays && entry.dailyWage
    )

    if (validEntries.length === 0) {
      setError('최소 하나 이상의 유효한 항목을 입력해주세요.')
      return
    }

    if (!selectedPeriod) {
      setError('기간을 선택해주세요.')
      return
    }

    try {
      // 각 항목을 순차적으로 등록
      const results = []
      const errors = []

      for (const entry of validEntries) {
        try {
          // 3.3% 공제 적용 여부에 따라 금액 계산
          const baseAmount = parseFloat(entry.dailyWage) * parseInt(entry.workDays)
          const finalAmount = entry.applyDeduction
            ? Math.floor(baseAmount * (1 - 0.033)) // 3.3% 공제 후 금액 (소수점 버림)
            : baseAmount

          const response = await fetch('/api/business/payrolls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worker_name: entry.workerName.trim(),
              resident_registration_number: entry.residentRegistrationNumber.trim() || null,
              work_days: parseInt(entry.workDays),
              daily_wage: parseFloat(entry.dailyWage),
              amount: finalAmount,
              pay_period: selectedPeriod,
              paid_at: entry.paidAt || null,
              status: entry.status,
              memo: entry.memo.trim() || null,
              bank_name: entry.bankName.trim() || null,
              account_number: entry.accountNumber.trim() || null,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || '인건비 저장 실패')
          }

          results.push(entry.workerName)
        } catch (err: any) {
          errors.push(`${entry.workerName}: ${err.message}`)
        }
      }

      if (results.length > 0) {
        alert(`${results.length}건의 일당 인건비가 등록되었습니다.${errors.length > 0 ? `\n\n오류: ${errors.join('\n')}` : ''}`)
        // 폼 초기화
        setBulkEntries([{ workerName: '', residentRegistrationNumber: '', workDays: '', dailyWage: '', paidAt: '', status: 'scheduled', memo: '', applyDeduction: false, bankName: '', accountNumber: '' }])
        setShowBulkForm(false)
        loadData()
      } else {
        setError(`등록 실패: ${errors.join(', ')}`)
      }
    } catch (err: any) {
      setError(err.message || '대량 등록 중 오류가 발생했습니다.')
    }
  }

  const addBulkEntry = () => {
    setBulkEntries([
      ...bulkEntries,
      { workerName: '', residentRegistrationNumber: '', workDays: '', dailyWage: '', paidAt: '', status: 'scheduled', memo: '', applyDeduction: false, bankName: '', accountNumber: '' },
    ])
  }

  const removeBulkEntry = (index: number) => {
    if (bulkEntries.length > 1) {
      setBulkEntries(bulkEntries.filter((_, i) => i !== index))
    }
  }

  const updateBulkEntry = (index: number, field: string, value: string | boolean) => {
    const updated = [...bulkEntries]
    if (field === 'applyDeduction') {
      updated[index] = { ...updated[index], [field]: value as boolean }
    } else {
      updated[index] = { ...updated[index], [field]: value as string }
    }
    setBulkEntries(updated)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      setError(null)
      const response = await fetch(`/api/business/payrolls/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '삭제 실패')
      }

      const result = await response.json()
      if (result.success) {
        loadData()
      } else {
        throw new Error('삭제 실패')
      }
    } catch (err: any) {
      setError(err.message || '삭제 중 오류가 발생했습니다.')
      console.error('Delete error:', err)
    }
  }

  const handleMarkAsPaid = async (id: string, userName: string) => {
    if (!confirm(`${userName}의 인건비를 지급 완료 처리하시겠습니까?`)) {
      return
    }

    try {
      setError(null)
      const response = await fetch(`/api/business/payrolls/${id}`, {
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
      loadData()
    } catch (err: any) {
      setError(err.message || '지급 완료 처리 중 오류가 발생했습니다.')
      console.error('Mark as paid error:', err)
    }
  }

  const handleMarkDailyPayrollAsPaid = async (id: string, workerName: string) => {
    if (!confirm(`${workerName}의 일당을 지급 완료 처리하시겠습니까?`)) {
      return
    }

    try {
      setError(null)
      const response = await fetch(`/api/business/payrolls/${id}`, {
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
      loadData()
    } catch (err: any) {
      setError(err.message || '지급 완료 처리 중 오류가 발생했습니다.')
      console.error('Mark daily payroll as paid error:', err)
    }
  }

  const handleUpdateDailyPayroll = async (id: string, data: { amount?: number; paid_at?: string | null; status?: 'scheduled' | 'paid'; memo?: string | null }) => {
    try {
      setError(null)
      const response = await fetch(`/api/business/payrolls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '수정 실패')
      }

      alert('일당 인건비가 수정되었습니다.')
      loadData()
    } catch (err: any) {
      setError(err.message || '수정 중 오류가 발생했습니다.')
      console.error('Update daily payroll error:', err)
      throw err // DailyPayrollSection에서 처리할 수 있도록 에러를 다시 던짐
    }
  }

  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editPaidAt, setEditPaidAt] = useState('')
  const [editStatus, setEditStatus] = useState<'scheduled' | 'paid'>('scheduled')
  const [editMemo, setEditMemo] = useState('')

  const handleEdit = (payroll: Payroll) => {
    setEditingPayroll(payroll)
    setEditAmount(payroll.amount.toString())
    setEditPaidAt(payroll.paid_at ? (typeof payroll.paid_at === 'string' ? payroll.paid_at.split('T')[0] : new Date(payroll.paid_at).toISOString().split('T')[0]) : '')
    setEditStatus(payroll.status)
    setEditMemo(payroll.memo || '')
  }

  const handleCancelEdit = () => {
    setEditingPayroll(null)
    setEditAmount('')
    setEditPaidAt('')
    setEditStatus('scheduled')
    setEditMemo('')
  }

  const handleUpdatePayroll = async () => {
    if (!editingPayroll) return

    try {
      setError(null)
      const response = await fetch(`/api/business/payrolls/${editingPayroll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          paid_at: editPaidAt || null,
          status: editStatus,
          memo: editMemo || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '수정 실패')
      }

      alert('인건비가 수정되었습니다.')
      handleCancelEdit()
      loadData()
    } catch (err: any) {
      setError(err.message || '수정 중 오류가 발생했습니다.')
      console.error('Update error:', err)
    }
  }

  // 기간별 필터링
  const filteredPayrolls = selectedPeriod
    ? payrolls.filter(p => p.pay_period === selectedPeriod)
    : payrolls

  // 정규 직원과 일당 근로자 분리
  const regularPayrollsBase = filteredPayrolls.filter(p => p.user_id)
  const dailyPayrollsBase = filteredPayrolls.filter(p => !p.user_id)
  
  // 검색 필터링
  const regularPayrolls = regularSearchTerm
    ? regularPayrollsBase.filter(p => 
        p.users?.name?.toLowerCase().includes(regularSearchTerm.toLowerCase()) ||
        p.pay_period?.toLowerCase().includes(regularSearchTerm.toLowerCase())
      )
    : regularPayrollsBase
  
  const dailyPayrolls = dailySearchTerm
    ? dailyPayrollsBase.filter(p => 
        p.worker_name?.toLowerCase().includes(dailySearchTerm.toLowerCase()) ||
        p.pay_period?.toLowerCase().includes(dailySearchTerm.toLowerCase())
      )
    : dailyPayrollsBase

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">인건비 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* 기간 선택 */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-4">
          <label className="text-sm font-medium text-gray-700">기간 선택:</label>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          />
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-4 min-w-max">
          <button
            onClick={() => setActiveTab('regular')}
            className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'regular'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            정규 직원 인건비
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'daily'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            일당 관리
          </button>
          <button
            onClick={() => setActiveTab('subcontract')}
            className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'subcontract'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            도급 관리
          </button>
        </nav>
      </div>

      {/* 도급 관리 탭 */}
      {activeTab === 'subcontract' && (
        <>
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <div className="flex justify-end items-center">
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  value={subcontractSearchTerm}
                  onChange={(e) => setSubcontractSearchTerm(e.target.value)}
                  placeholder="이름, 기간으로 검색..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
          <SubcontractManagementSection
            selectedPeriod={selectedPeriod}
            onRefresh={loadData}
            searchTerm={subcontractSearchTerm}
          />
        </>
      )}

      {/* 일당 관리 탭 */}
      {activeTab === 'daily' && (
        <>
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <div className="flex justify-end items-center">
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  value={dailySearchTerm}
                  onChange={(e) => setDailySearchTerm(e.target.value)}
                  placeholder="이름, 기간으로 검색..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
          <DailyPayrollSection
            selectedPeriod={selectedPeriod}
            onRefresh={loadData}
            existingDailyPayrolls={dailyPayrolls.map(p => ({
              id: p.id,
              worker_name: p.worker_name || '',
              pay_period: p.pay_period,
              work_days: p.work_days,
              daily_wage: p.daily_wage,
              amount: p.amount,
              paid_at: p.paid_at,
              status: p.status,
            }))}
            onDelete={handleDelete}
            onMarkAsPaid={handleMarkDailyPayrollAsPaid}
            onUpdate={handleUpdateDailyPayroll}
          />
          
          {/* 일당 근로자 등록 버튼 */}
          <div className="bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 mt-6">
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setShowBulkForm(true)
                  setShowForm(false)
                }}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                대량 등록
              </button>
              <button
                onClick={() => {
                  setShowForm(true)
                  setShowBulkForm(false)
                }}
                className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                단일 등록
              </button>
            </div>
          </div>

          {/* 대량 등록 모달 */}
          {showBulkForm && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowBulkForm(false)
                  setBulkEntries([{ workerName: '', residentRegistrationNumber: '', workDays: '', dailyWage: '', paidAt: '', status: 'scheduled', memo: '', applyDeduction: false, bankName: '', accountNumber: '' }])
                }
              }}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 헤더 - 그라데이션 */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">일당 근로자 대량 등록</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowBulkForm(false)
                      setBulkEntries([{ workerName: '', residentRegistrationNumber: '', workDays: '', dailyWage: '', paidAt: '', status: 'scheduled', memo: '', applyDeduction: false, bankName: '', accountNumber: '' }])
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 본문 - 스크롤 가능 */}
                <div className="overflow-y-auto flex-1 p-6">
                  <form id="bulk-form" onSubmit={handleBulkSubmit} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        여러 일당 근로자를 한 번에 등록할 수 있습니다. 이름, 근무 일수, 일당 금액만 입력하면 됩니다.
                      </p>
                    </div>
                    <div className="overflow-x-auto border-2 border-gray-200 rounded-xl">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">이름 *</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">주민등록번호</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">근무 일수 *</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">일당 금액 *</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">은행명</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">계좌번호</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">지급일</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">상태</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">메모</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">작업</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bulkEntries.map((entry, index) => {
                            const baseAmount = entry.dailyWage && entry.workDays
                              ? parseFloat(entry.dailyWage) * parseInt(entry.workDays)
                              : 0
                            const deductionAmount = baseAmount * 0.033
                            const finalAmount = entry.applyDeduction
                              ? Math.floor(baseAmount * (1 - 0.033))
                              : baseAmount
                            return (
                              <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={entry.workerName}
                                    onChange={(e) => updateBulkEntry(index, 'workerName', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="이름"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={entry.residentRegistrationNumber}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9]/g, '')
                                      if (value.length <= 13) {
                                        let formatted = value
                                        if (value.length > 6) {
                                          formatted = `${value.substring(0, 6)}-${value.substring(6)}`
                                        }
                                        updateBulkEntry(index, 'residentRegistrationNumber', formatted)
                                      }
                                    }}
                                    maxLength={14}
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="900101-1234567"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={entry.workDays}
                                    onChange={(e) => updateBulkEntry(index, 'workDays', e.target.value)}
                                    min="1"
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="일수"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={entry.dailyWage}
                                    onChange={(e) => updateBulkEntry(index, 'dailyWage', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                                    placeholder="금액"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={entry.bankName}
                                    onChange={(e) => updateBulkEntry(index, 'bankName', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="은행명"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={entry.accountNumber}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9-]/g, '')
                                      updateBulkEntry(index, 'accountNumber', value)
                                    }}
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="계좌번호"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="date"
                                    value={entry.paidAt}
                                    onChange={(e) => updateBulkEntry(index, 'paidAt', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={entry.status}
                                    onChange={(e) => updateBulkEntry(index, 'status', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                  >
                                    <option value="scheduled">예정</option>
                                    <option value="paid">지급완료</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={entry.memo}
                                    onChange={(e) => updateBulkEntry(index, 'memo', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="메모"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-2">
                                    {entry.dailyWage && entry.workDays && (
                                      <div className="text-xs bg-blue-50 p-2 rounded-lg border border-blue-200">
                                        <div className="flex items-center space-x-1 mb-1">
                                          <input
                                            type="checkbox"
                                            checked={entry.applyDeduction}
                                            onChange={(e) => updateBulkEntry(index, 'applyDeduction', e.target.checked)}
                                            className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            title="3.3% 공제 적용"
                                          />
                                          <span className="text-gray-600 text-[10px] font-medium">3.3%</span>
                                        </div>
                                        {entry.applyDeduction ? (
                                          <div className="text-gray-700">
                                            <div className="text-[10px] text-gray-500 line-through">
                                              {baseAmount.toLocaleString('ko-KR')}원
                                            </div>
                                            <div className="font-bold text-blue-700">
                                              {finalAmount.toLocaleString('ko-KR')}원
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-gray-700 font-bold">
                                            {finalAmount.toLocaleString('ko-KR')}원
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {bulkEntries.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeBulkEntry(index)}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                                        title="삭제"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={addBulkEntry}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 text-sm font-medium transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        행 추가
                      </button>
                    </div>
                  </form>
                </div>

                {/* 푸터 - 고정 */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkForm(false)
                      setBulkEntries([{ workerName: '', residentRegistrationNumber: '', workDays: '', dailyWage: '', paidAt: '', status: 'scheduled', memo: '', applyDeduction: false, bankName: '', accountNumber: '' }])
                    }}
                    className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-all"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    form="bulk-form"
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    일괄 등록
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 일당 근로자 수동 등록 모달 */}
          {showForm && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowForm(false)
                  resetForm()
                }
              }}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 헤더 - 그라데이션 */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">일당 근로자 인건비 등록</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 본문 - 스크롤 가능 */}
                <div className="overflow-y-auto flex-1 p-6">
                  <form id="daily-form" onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                        placeholder="일당 근로자 이름"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        주민등록번호
                        <span className="ml-2 text-xs text-gray-500 font-normal">(선택사항)</span>
                      </label>
                      <input
                        type="text"
                        value={residentRegistrationNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          if (value.length <= 13) {
                            let formatted = value
                            if (value.length > 6) {
                              formatted = `${value.substring(0, 6)}-${value.substring(6)}`
                            }
                            setResidentRegistrationNumber(formatted)
                          }
                        }}
                        placeholder="900101-1234567"
                        maxLength={14}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                      />
                      <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        주민등록번호는 암호화되어 안전하게 저장됩니다.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          근무 일수 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={workDays}
                          onChange={(e) => setWorkDays(e.target.value)}
                          required
                          min="1"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                          placeholder="근무 일수"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          일당 금액 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={dailyWage}
                          onChange={(e) => setDailyWage(e.target.value)}
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white text-lg font-semibold"
                          placeholder="일당 금액"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          은행명
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                          placeholder="은행명 (선택사항)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          계좌번호
                        </label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9-]/g, '')
                            setAccountNumber(value)
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                          placeholder="계좌번호 (선택사항)"
                        />
                      </div>
                    </div>
                    {dailyWage && workDays && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-5 rounded-xl border-2 border-green-200 space-y-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="applyDeduction"
                            checked={applyDeduction}
                            onChange={(e) => setApplyDeduction(e.target.checked)}
                            className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <label htmlFor="applyDeduction" className="text-sm font-semibold text-gray-700">
                            3.3% 공제 적용
                          </label>
                        </div>
                        {(() => {
                          const baseAmount = parseFloat(dailyWage) * parseInt(workDays)
                          const deductionAmount = baseAmount * 0.033
                          const finalAmount = applyDeduction ? Math.floor(baseAmount * (1 - 0.033)) : baseAmount
                          return (
                            <div className="space-y-3 bg-white p-4 rounded-xl border-2 border-green-100 shadow-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">원금액:</span>
                                <span className="text-sm font-semibold text-gray-900">{baseAmount.toLocaleString('ko-KR')}원</span>
                              </div>
                              {applyDeduction && (
                                <>
                                  <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                    <span className="text-sm font-medium text-gray-700">공제액 (3.3%):</span>
                                    <span className="text-sm font-semibold text-red-600">-{Math.floor(deductionAmount).toLocaleString('ko-KR')}원</span>
                                  </div>
                                  <div className="flex justify-between items-center border-t-2 border-green-300 pt-3 mt-2">
                                    <span className="text-base font-bold text-green-800">지급 금액:</span>
                                    <span className="text-xl font-bold text-green-800">{finalAmount.toLocaleString('ko-KR')}원</span>
                                  </div>
                                </>
                              )}
                              {!applyDeduction && (
                                <div className="flex justify-between items-center border-t-2 border-green-300 pt-3 mt-2">
                                  <span className="text-base font-bold text-green-800">지급 금액:</span>
                                  <span className="text-xl font-bold text-green-800">{finalAmount.toLocaleString('ko-KR')}원</span>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          지급일
                        </label>
                        <input
                          type="date"
                          value={dailyPaidAt}
                          onChange={(e) => setDailyPaidAt(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          상태
                        </label>
                        <select
                          value={dailyStatus}
                          onChange={(e) => setDailyStatus(e.target.value as 'scheduled' | 'paid')}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                        >
                          <option value="scheduled">예정</option>
                          <option value="paid">지급완료</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        메모
                      </label>
                      <textarea
                        value={dailyMemo}
                        onChange={(e) => setDailyMemo(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white resize-none"
                        placeholder="메모를 입력하세요 (선택사항)"
                      />
                    </div>
                  </form>
                </div>

                {/* 푸터 - 고정 */}
                <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="px-4 sm:px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-all text-sm sm:text-base"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    form="daily-form"
                    className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    등록하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 정규 직원 인건비 탭 */}
      {activeTab === 'regular' && (
        <>
          {/* 정규 직원 인건비 자동 생성 버튼 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-end items-center gap-3">
              {pendingCount !== null && pendingCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                    {pendingCount}명 미생성
                  </span>
                </div>
              )}
              <button
                onClick={handleGenerateRegularPayrolls}
                disabled={generatingRegular || !selectedPeriod}
                className={`px-4 py-2 rounded-md ${
                  generatingRegular || !selectedPeriod
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {generatingRegular ? '생성 중...' : '정규 직원 인건비 자동 생성'}
              </button>
            </div>
          </div>

          {/* 정규 직원 인건비 목록 */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
              <h2 className="text-base sm:text-lg font-semibold">정규 직원 인건비</h2>
              <div className="flex-1 sm:max-w-xs sm:ml-4">
                <input
                  type="text"
                  value={regularSearchTerm}
                  onChange={(e) => setRegularSearchTerm(e.target.value)}
                  placeholder="이름, 기간으로 검색..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {regularPayrolls.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {regularSearchTerm ? '검색 결과가 없습니다.' : '등록된 인건비가 없습니다.'}
              </p>
            ) : (
              <>
                {/* 모바일: 카드 형태 */}
                <div className="block sm:hidden space-y-4">
                  {regularPayrolls.map((payroll) => (
                    <div key={payroll.id} className="bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-100 rounded-xl p-4 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base mb-1">
                              {payroll.users?.name || '-'}
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
                            <p className="text-xs text-gray-500 mb-1">금액</p>
                            {editingPayroll?.id === payroll.id ? (
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm"
                              />
                            ) : (
                              <p className="text-sm font-bold text-gray-900">{payroll.amount.toLocaleString('ko-KR')}원</p>
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
                                  className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm transition-colors"
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
                                {payroll.status === 'scheduled' && (
                                  <button
                                    onClick={() => handleMarkAsPaid(payroll.id, payroll.users?.name || '')}
                                    className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm transition-colors"
                                  >
                                    지급완료 처리
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(payroll.id)}
                                  className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 데스크톱: 테이블 형태 */}
                <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">기간</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">지급일</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {regularPayrolls.map((payroll) => (
                          <tr key={payroll.id}>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{payroll.users?.name || '-'}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{payroll.pay_period}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {editingPayroll?.id === payroll.id ? (
                                <input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                `${payroll.amount.toLocaleString('ko-KR')}원`
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {editingPayroll?.id === payroll.id ? (
                                <input
                                  type="date"
                                  value={editPaidAt}
                                  onChange={(e) => setEditPaidAt(e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                payroll.paid_at
                                  ? (typeof payroll.paid_at === 'string'
                                      ? payroll.paid_at.split('T')[0]
                                      : new Date(payroll.paid_at).toISOString().split('T')[0])
                                  : '-'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
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
                                <span className={`px-2 py-1 rounded text-xs ${
                                  payroll.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {payroll.status === 'paid' ? '지급완료' : '예정'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <div className="flex space-x-2">
                                {editingPayroll?.id === payroll.id ? (
                                  <>
                                    <button
                                      onClick={handleUpdatePayroll}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
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
                                    {payroll.status === 'scheduled' && (
                                      <button
                                        onClick={() => handleMarkAsPaid(payroll.id, payroll.users?.name || '')}
                                        className="text-green-600 hover:text-green-800 text-xs"
                                      >
                                        지급완료
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDelete(payroll.id)}
                                      className="text-red-600 hover:text-red-800 text-xs"
                                    >
                                      삭제
                                    </button>
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
              </>
            )}
          </div>

        </>
      )}

    </div>
  )
}

