'use client'

import { useState, useEffect } from 'react'
import { Subcontract, SubcontractPayment } from '@/types/db'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { parseCurrencyNumber } from '@/lib/utils/currency'

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

interface SubcontractManagementSectionProps {
  selectedPeriod: string
  onRefresh: () => void
  searchTerm?: string
}

export default function SubcontractManagementSection({
  selectedPeriod,
  onRefresh,
  searchTerm = '',
}: SubcontractManagementSectionProps) {
  const [subcontracts, setSubcontracts] = useState<Subcontract[]>([])
  const [payments, setPayments] = useState<SubcontractPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [activeSection, setActiveSection] = useState<'company' | 'individual'>('company')
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'company' | 'individual'>('company')
  const [paymentSubmitting, setPaymentSubmitting] = useState<string | null>(null)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editPaymentAmount, setEditPaymentAmount] = useState('')

  // 폼 상태
  const [subcontractorId, setSubcontractorId] = useState('')
  const [workerId, setWorkerId] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [residentRegistrationNumber, setResidentRegistrationNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [contractPeriodStart, setContractPeriodStart] = useState('')
  const [contractPeriodEnd, setContractPeriodEnd] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [taxRate, setTaxRate] = useState('3.3')
  const [memo, setMemo] = useState('')

  // 도급업체 목록 (프렌차이즈)
  const [franchises, setFranchises] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadData()
    loadFranchises()
    loadUsers()
  }, [selectedPeriod])

  // ESC 키로 모달 닫기
  useEscapeKey(() => {
    if (showForm) {
      setShowForm(false)
      resetForm()
    }
  })

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showForm])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/business/subcontracts?period=${selectedPeriod || ''}`)
      if (!response.ok) {
        throw new Error('도급 정보를 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success) {
        setSubcontracts(data.data?.subcontracts || [])
        setPayments(data.data?.payments || [])
      }
    } catch (err: any) {
      setError(err.message || '도급 정보를 불러오는 중 오류가 발생했습니다.')
      console.error('Error loading subcontracts:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFranchises = async () => {
    try {
      const response = await fetch('/api/business/franchises')
      if (response.ok) {
        const data = await response.json()
        if (data.success || data.franchises) {
          setFranchises(data.franchises || data.data || [])
        }
      }
    } catch (err) {
      console.error('Error loading franchises:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/business/users')
      if (response.ok) {
        const data = await response.json()
        if (data.success || data.users) {
          const usersList = data.users || data.data || []
          setUsers(usersList.map((u: any) => ({ id: u.id, name: u.name })))
        }
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const handleGeneratePayments = async () => {
    if (!selectedPeriod) {
      alert('기간을 선택해주세요.')
      return
    }

    if (!confirm(`${selectedPeriod} 기간의 도급 정산을 자동 생성하시겠습니까?`)) {
      return
    }

    try {
      setGenerating(true)
      setError(null)
      const response = await fetch('/api/business/subcontracts/generate-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pay_period: selectedPeriod }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '도급 정산 생성 실패')
      }

      const result = await response.json()
      alert(result.message || `${result.created}건의 도급 정산이 생성되었습니다.`)
      loadData()
      onRefresh()
    } catch (err: any) {
      setError(err.message || '도급 정산 생성 중 오류가 발생했습니다.')
      console.error('Error generating payments:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (formType === 'company' && !subcontractorId) {
        setError('도급업체를 선택해주세요.')
        return
      }

      if (formType === 'individual' && !workerName) {
        setError('이름을 입력해주세요.')
        return
      }

      if (!contractPeriodStart || !monthlyAmount) {
        setError('계약 시작일과 월 도급금액을 입력해주세요.')
        return
      }

      const response = await fetch('/api/business/subcontracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcontract_type: formType,
          subcontractor_id: formType === 'company' ? subcontractorId : null,
          worker_id: formType === 'individual' && workerId ? workerId : null,
          worker_name: formType === 'individual' ? workerName : null,
          resident_registration_number: formType === 'individual' ? residentRegistrationNumber : null,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          contract_period_start: contractPeriodStart,
          contract_period_end: contractPeriodEnd || null,
          monthly_amount: parseCurrencyNumber(monthlyAmount),
          tax_rate: formType === 'individual' ? parseFloat(taxRate) / 100 : 0,
          memo: memo || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '도급 등록 실패')
      }

      alert('도급이 등록되었습니다.')
      resetForm()
      setShowForm(false)
      loadData()
    } catch (err: any) {
      setError(err.message || '도급 등록 중 오류가 발생했습니다.')
    }
  }

  const resetForm = () => {
    setSubcontractorId('')
    setWorkerId('')
    setWorkerName('')
    setResidentRegistrationNumber('')
    setBankName('')
    setAccountNumber('')
    setContractPeriodStart('')
    setContractPeriodEnd('')
    setMonthlyAmount('')
    setTaxRate('3.3')
    setMemo('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/business/subcontracts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '삭제 실패')
      }

      alert('도급이 삭제되었습니다.')
      loadData()
    } catch (err: any) {
      setError(err.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  const handleMarkPaymentAsPaid = async (paymentId: string, companyName: string) => {
    if (!confirm(`${companyName}의 도급 정산을 지급 완료 처리하시겠습니까?`)) {
      return
    }

    try {
      setPaymentSubmitting(paymentId)
      setError(null)
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
      loadData()
      onRefresh()
    } catch (err: any) {
      setError(err.message || '지급 완료 처리 중 오류가 발생했습니다.')
    } finally {
      setPaymentSubmitting(null)
    }
  }

  const handleStartEditPaymentAmount = (payment: SubcontractPayment) => {
    setEditingPaymentId(payment.id)
    setEditPaymentAmount(String(payment.amount ?? 0))
  }

  const handleCancelEditPaymentAmount = () => {
    setEditingPaymentId(null)
    setEditPaymentAmount('')
  }

  const handleSavePaymentAmount = async () => {
    if (!editingPaymentId) return
    const amount = parseCurrencyNumber(editPaymentAmount)
    if (amount < 0) {
      setError('지급 금액은 0 이상이어야 합니다.')
      return
    }
    try {
      setPaymentSubmitting(editingPaymentId)
      setError(null)
      const response = await fetch(`/api/business/subcontracts/payments/${editingPaymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '정산금액 수정 실패')
      }
      alert('정산금액이 수정되었습니다.')
      handleCancelEditPaymentAmount()
      loadData()
      onRefresh()
    } catch (err: any) {
      setError(err.message || '정산금액 수정 중 오류가 발생했습니다.')
    } finally {
      setPaymentSubmitting(null)
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">도급 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const companySubcontractsBase = subcontracts.filter((s) => s.subcontract_type === 'company')
  const individualSubcontractsBase = subcontracts.filter((s) => s.subcontract_type === 'individual')
  
  // 검색 필터링
  const companySubcontracts = searchTerm
    ? companySubcontractsBase.filter(s => 
        s.subcontractor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contract_period_start?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contract_period_end?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : companySubcontractsBase
  
  const individualSubcontracts = searchTerm
    ? individualSubcontractsBase.filter(s => 
        s.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contract_period_start?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contract_period_end?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : individualSubcontractsBase
  
  const companyPayments = payments.filter((p) => p.subcontract?.subcontract_type === 'company')
  const individualPayments = payments.filter((p) => p.subcontract?.subcontract_type === 'individual')

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* 도급 등록 버튼 */}
      <div className="bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">도급 관리</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={handleGeneratePayments}
              disabled={generating || !selectedPeriod}
              className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                generating || !selectedPeriod
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {generating ? '생성 중...' : '월별 도급 자동생성'}
            </button>
            <button
              onClick={() => {
                setFormType('company')
                setShowForm(true)
              }}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              업체 간 도급
            </button>
            <button
              onClick={() => {
                setFormType('individual')
                setShowForm(true)
              }}
              className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              개인 도급
            </button>
          </div>
        </div>

        {/* 섹션 선택 */}
        <div className="flex space-x-2 border-b border-gray-200 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveSection('company')}
            className={`py-2.5 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeSection === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            업체 간 도급 ({companySubcontracts.length})
          </button>
          <button
            onClick={() => setActiveSection('individual')}
            className={`py-2.5 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeSection === 'individual'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            개인 도급 ({individualSubcontracts.length})
          </button>
        </div>
      </div>

      {/* 도급 등록 모달 */}
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
            <div className={`px-6 py-4 flex justify-between items-center ${
              formType === 'company' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                : 'bg-gradient-to-r from-green-600 to-green-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-white">
                  {formType === 'company' ? '업체 간 도급 등록' : '개인 도급 등록'}
                </h3>
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
              <form id="subcontract-form" onSubmit={handleSubmit} className="space-y-5">
                {formType === 'company' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      도급업체 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={subcontractorId}
                      onChange={(e) => setSubcontractorId(e.target.value)}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="">도급업체를 선택하세요</option>
                      {franchises.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
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
                        placeholder="이름"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        주민등록번호
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
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        기존 직원 선택 (선택사항)
                      </label>
                      <select
                        value={workerId}
                        onChange={(e) => {
                          setWorkerId(e.target.value)
                          if (e.target.value) {
                            const user = users.find((u) => u.id === e.target.value)
                            if (user) setWorkerName(user.name)
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                      >
                        <option value="">직원 선택 (선택사항)</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      은행명
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                      placeholder="은행명"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                      placeholder="계좌번호"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      계약 시작일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={contractPeriodStart}
                      onChange={(e) => setContractPeriodStart(e.target.value)}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      계약 종료일
                    </label>
                    <input
                      type="date"
                      value={contractPeriodEnd}
                      onChange={(e) => setContractPeriodEnd(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      월 도급금액 <span className="text-red-500">*</span>
                    </label>
                    <CurrencyInput
                      value={monthlyAmount}
                      onChange={setMonthlyAmount}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white text-lg font-semibold"
                      placeholder="월 도급금액"
                    />
                  </div>
                  {formType === 'individual' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        세율 (%)
                      </label>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                        placeholder="3.3"
                      />
                      <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        기본값: 3.3% (원천징수)
                      </p>
                    </div>
                  )}
                </div>

                {parseCurrencyNumber(monthlyAmount) > 0 && formType === 'individual' && (
                  <div className="bg-gradient-to-r from-green-50 to-purple-50 p-5 rounded-xl border-2 border-green-200">
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">원금액:</span>
                        <span className="text-sm font-semibold text-gray-900">{parseCurrencyNumber(monthlyAmount).toLocaleString('ko-KR')}원</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                        <span className="text-sm font-medium text-gray-700">공제액 ({taxRate}%):</span>
                        <span className="text-sm font-semibold text-red-600">-{Math.floor(parseCurrencyNumber(monthlyAmount) * (parseFloat(taxRate) / 100)).toLocaleString('ko-KR')}원</span>
                      </div>
                      <div className="flex justify-between items-center border-t-2 border-green-300 pt-3 mt-2">
                        <span className="text-base font-bold text-green-800">지급 금액:</span>
                        <span className="text-xl font-bold text-green-800">{Math.floor(parseCurrencyNumber(monthlyAmount) * (1 - parseFloat(taxRate) / 100)).toLocaleString('ko-KR')}원</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    메모
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white resize-none"
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
                form="subcontract-form"
                className={`px-4 sm:px-6 py-2.5 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                  formType === 'company'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                }`}
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

      {/* 업체 간 도급 섹션 */}
      {activeSection === 'company' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4">업체 간 도급</h3>
          {companySubcontracts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">등록된 업체 간 도급이 없습니다.</p>
          ) : (
            <>
              {/* 모바일: 카드 형태 */}
              <div className="block sm:hidden space-y-4">
                {companySubcontracts.map((sub) => (
                  <div key={sub.id} className="bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-100 rounded-xl p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-base mb-1">
                            {sub.subcontractor?.name || sub.worker_name || sub.worker?.name || '-'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {sub.contract_period_start.split('T')[0]}
                            {sub.contract_period_end ? ` ~ ${sub.contract_period_end.split('T')[0]}` : ' ~ 진행중'}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                            sub.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : sub.status === 'inactive'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sub.status === 'active' ? '활성' : sub.status === 'inactive' ? '비활성' : '종료'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">월 도급금액</p>
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(sub.monthly_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">은행/계좌</p>
                          <p className="text-xs text-gray-700">
                            {sub.bank_name || '-'}
                            {sub.account_number && ` / ${sub.account_number}`}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors"
                        >
                          삭제
                        </button>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">도급업체</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약 기간</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">월 도급금액</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">은행명</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계좌번호</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companySubcontracts.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {sub.subcontractor?.name || sub.worker_name || sub.worker?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {sub.contract_period_start.split('T')[0]}
                          {sub.contract_period_end ? ` ~ ${sub.contract_period_end.split('T')[0]}` : ' ~ 진행중'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatCurrency(sub.monthly_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{sub.bank_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{sub.account_number || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              sub.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : sub.status === 'inactive'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {sub.status === 'active' ? '활성' : sub.status === 'inactive' ? '비활성' : '종료'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 업체 간 도급 정산 내역 */}
          {companyPayments.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm sm:text-md font-semibold mb-3">정산 내역 ({selectedPeriod})</h4>
              
              {/* 모바일: 카드 형태 */}
              <div className="block sm:hidden space-y-3">
                {companyPayments.map((payment) => (
                  <div key={payment.id} className="bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-100 rounded-xl p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">
                            {payment.subcontract?.subcontractor?.name || payment.subcontract?.worker_name || payment.subcontract?.worker?.name || '-'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {payment.paid_at ? payment.paid_at.split('T')[0] : '지급일 미정'}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {payment.status === 'paid' ? '지급완료' : '예정'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">원금액</p>
                          <p className="text-sm font-semibold text-gray-700">{formatCurrency(payment.base_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">지급 금액</p>
                          {editingPaymentId === payment.id ? (
                            <div className="space-y-2">
                              <CurrencyInput
                                value={editPaymentAmount}
                                onChange={setEditPaymentAmount}
                                className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSavePaymentAmount}
                                  disabled={paymentSubmitting === payment.id}
                                  className="flex-1 py-1.5 px-3 bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={handleCancelEditPaymentAmount}
                                  className="flex-1 py-1.5 px-3 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-blue-700">{formatCurrency(payment.amount)}</p>
                          )}
                        </div>
                      </div>
                      {editingPaymentId !== payment.id && (
                        <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditPaymentAmount(payment)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            수정
                          </button>
                          {payment.status === 'scheduled' && (
                            <button
                              onClick={() => handleMarkPaymentAsPaid(payment.id, payment.subcontract?.subcontractor?.name || payment.subcontract?.worker_name || '')}
                              disabled={paymentSubmitting === payment.id}
                              className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              지급완료
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 데스크톱: 테이블 형태 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">도급업체</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">원금액</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">지급 금액</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">지급일</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">지급 상태</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companyPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {payment.subcontract?.subcontractor?.name || payment.subcontract?.worker_name || payment.subcontract?.worker?.name || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {formatCurrency(payment.base_amount)}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                          {editingPaymentId === payment.id ? (
                            <div className="flex items-center gap-2">
                              <CurrencyInput
                                value={editPaymentAmount}
                                onChange={setEditPaymentAmount}
                                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button
                                onClick={handleSavePaymentAmount}
                                disabled={paymentSubmitting === payment.id}
                                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                              >
                                저장
                              </button>
                              <button
                                onClick={handleCancelEditPaymentAmount}
                                className="text-xs text-gray-500 hover:underline"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            formatCurrency(payment.amount)
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {payment.paid_at ? payment.paid_at.split('T')[0] : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              payment.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {payment.status === 'paid' ? '지급완료' : '예정'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            {editingPaymentId === payment.id ? null : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPaymentAmount(payment)}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  수정
                                </button>
                                {payment.status === 'scheduled' && (
                                  <button
                                    onClick={() => handleMarkPaymentAsPaid(payment.id, payment.subcontract?.subcontractor?.name || payment.subcontract?.worker_name || '')}
                                    disabled={paymentSubmitting === payment.id}
                                    className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    지급완료
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
          )}
        </div>
      )}

      {/* 개인 도급 섹션 */}
      {activeSection === 'individual' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4">개인 도급</h3>
          {individualSubcontracts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">등록된 개인 도급이 없습니다.</p>
          ) : (
            <>
              {/* 모바일: 카드 형태 */}
              <div className="block sm:hidden space-y-4">
                {individualSubcontracts.map((sub) => {
                  const finalAmount = Math.floor(sub.monthly_amount * (1 - sub.tax_rate))
                  return (
                    <div key={sub.id} className="bg-gradient-to-br from-white to-green-50/30 border-2 border-green-100 rounded-xl p-4 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base mb-1">
                              {sub.worker?.name || sub.worker_name || '-'}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {sub.contract_period_start.split('T')[0]}
                              {sub.contract_period_end ? ` ~ ${sub.contract_period_end.split('T')[0]}` : ' ~ 진행중'}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                              sub.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : sub.status === 'inactive'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {sub.status === 'active' ? '활성' : sub.status === 'inactive' ? '비활성' : '종료'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">월 도급금액</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(sub.monthly_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">세율</p>
                            <p className="text-sm font-semibold text-gray-700">{(sub.tax_rate * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <p className="text-xs text-gray-500 mb-1">지급 금액</p>
                          <p className="text-base font-bold text-green-700">{formatCurrency(finalAmount)}</p>
                        </div>
                        {(sub.bank_name || sub.account_number) && (
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">은행/계좌</p>
                            <p className="text-xs text-gray-700">
                              {sub.bank_name || '-'}
                              {sub.account_number && ` / ${sub.account_number}`}
                            </p>
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-200">
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 데스크톱: 테이블 형태 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약 기간</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">월 도급금액</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">세율</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">지급 금액</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">은행명</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계좌번호</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {individualSubcontracts.map((sub) => {
                      const finalAmount = Math.floor(sub.monthly_amount * (1 - sub.tax_rate))
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {sub.worker?.name || sub.worker_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {sub.contract_period_start.split('T')[0]}
                            {sub.contract_period_end ? ` ~ ${sub.contract_period_end.split('T')[0]}` : ' ~ 진행중'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatCurrency(sub.monthly_amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {(sub.tax_rate * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-700">
                            {formatCurrency(finalAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{sub.bank_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{sub.account_number || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                sub.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : sub.status === 'inactive'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {sub.status === 'active' ? '활성' : sub.status === 'inactive' ? '비활성' : '종료'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleDelete(sub.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 개인 도급 정산 내역 */}
          {individualPayments.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm sm:text-md font-semibold mb-3">정산 내역 ({selectedPeriod})</h4>
              
              {/* 모바일: 카드 형태 */}
              <div className="block sm:hidden space-y-3">
                {individualPayments.map((payment) => (
                  <div key={payment.id} className="bg-gradient-to-br from-white to-green-50/30 border-2 border-green-100 rounded-xl p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">
                            {payment.subcontract?.worker?.name || payment.subcontract?.worker_name || '-'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {payment.paid_at ? payment.paid_at.split('T')[0] : '지급일 미정'}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {payment.status === 'paid' ? '지급완료' : '예정'}
                        </span>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">원금액</span>
                          <span className="text-sm font-semibold text-gray-700">{formatCurrency(payment.base_amount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">공제액</span>
                          <span className="text-sm font-semibold text-red-600">-{formatCurrency(payment.deduction_amount)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-sm font-bold text-green-800">지급 금액</span>
                          {editingPaymentId === payment.id ? (
                            <div className="flex-1 ml-2 space-y-2">
                              <CurrencyInput
                                value={editPaymentAmount}
                                onChange={setEditPaymentAmount}
                                className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSavePaymentAmount}
                                  disabled={paymentSubmitting === payment.id}
                                  className="flex-1 py-1.5 px-3 bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={handleCancelEditPaymentAmount}
                                  className="flex-1 py-1.5 px-3 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-base font-bold text-green-700">{formatCurrency(payment.amount)}</span>
                          )}
                        </div>
                      </div>
                      {editingPaymentId !== payment.id && (
                        <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditPaymentAmount(payment)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            수정
                          </button>
                          {payment.status === 'scheduled' && (
                            <button
                              onClick={() => handleMarkPaymentAsPaid(payment.id, payment.subcontract?.worker?.name || payment.subcontract?.worker_name || '')}
                              disabled={paymentSubmitting === payment.id}
                              className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              지급완료
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 데스크톱: 테이블 형태 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">원금액</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">공제액</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">지급 금액</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">지급일</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">지급 상태</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {individualPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {payment.subcontract?.worker?.name || payment.subcontract?.worker_name || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {formatCurrency(payment.base_amount)}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-600">
                          -{formatCurrency(payment.deduction_amount)}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-700">
                          {editingPaymentId === payment.id ? (
                            <div className="flex items-center gap-2">
                              <CurrencyInput
                                value={editPaymentAmount}
                                onChange={setEditPaymentAmount}
                                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button
                                onClick={handleSavePaymentAmount}
                                disabled={paymentSubmitting === payment.id}
                                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                              >
                                저장
                              </button>
                              <button
                                onClick={handleCancelEditPaymentAmount}
                                className="text-xs text-gray-500 hover:underline"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            formatCurrency(payment.amount)
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {payment.paid_at ? payment.paid_at.split('T')[0] : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              payment.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {payment.status === 'paid' ? '지급완료' : '예정'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            {editingPaymentId === payment.id ? null : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPaymentAmount(payment)}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  수정
                                </button>
                                {payment.status === 'scheduled' && (
                                  <button
                                    onClick={() => handleMarkPaymentAsPaid(payment.id, payment.subcontract?.worker?.name || payment.subcontract?.worker_name || '')}
                                    disabled={paymentSubmitting === payment.id}
                                    className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    지급완료
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
          )}
        </div>
      )}
    </div>
  )
}

