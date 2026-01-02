'use client'

import { useState, useEffect } from 'react'
import { Subcontract, SubcontractPayment } from '@/types/db'

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
          monthly_amount: parseFloat(monthlyAmount),
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">도급 관리</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleGeneratePayments}
              disabled={generating || !selectedPeriod}
              className={`px-4 py-2 rounded-md ${
                generating || !selectedPeriod
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {generating ? '생성 중...' : '월별 도급 자동생성'}
            </button>
            <button
              onClick={() => {
                setFormType('company')
                setShowForm(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + 업체 간 도급
            </button>
            <button
              onClick={() => {
                setFormType('individual')
                setShowForm(true)
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + 개인 도급
            </button>
          </div>
        </div>

        {/* 섹션 선택 */}
        <div className="flex space-x-2 border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveSection('company')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeSection === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            업체 간 도급 ({companySubcontracts.length})
          </button>
          <button
            onClick={() => setActiveSection('individual')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeSection === 'individual'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            개인 도급 ({individualSubcontracts.length})
          </button>
        </div>
      </div>

      {/* 도급 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {formType === 'company' ? '업체 간 도급 등록' : '개인 도급 등록'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  도급업체 <span className="text-red-500">*</span>
                </label>
                <select
                  value={subcontractorId}
                  onChange={(e) => setSubcontractorId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">도급업체 선택</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="이름"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  은행명
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="은행명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계좌번호
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9-]/g, '')
                    setAccountNumber(value)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="계좌번호"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계약 시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={contractPeriodStart}
                  onChange={(e) => setContractPeriodStart(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계약 종료일
                </label>
                <input
                  type="date"
                  value={contractPeriodEnd}
                  onChange={(e) => setContractPeriodEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  월 도급금액 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="월 도급금액"
                />
              </div>
              {formType === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    세율 (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="3.3"
                  />
                  <p className="mt-1 text-xs text-gray-500">기본값: 3.3% (원천징수)</p>
                </div>
              )}
            </div>

            {monthlyAmount && formType === 'individual' && (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    원금액: {parseFloat(monthlyAmount).toLocaleString('ko-KR')}원
                  </p>
                  <p className="text-sm text-gray-600">
                    공제액 ({taxRate}%): -{Math.floor(parseFloat(monthlyAmount) * (parseFloat(taxRate) / 100)).toLocaleString('ko-KR')}원
                  </p>
                  <p className="text-sm font-bold text-green-800">
                    지급 금액: {Math.floor(parseFloat(monthlyAmount) * (1 - parseFloat(taxRate) / 100)).toLocaleString('ko-KR')}원
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="메모 (선택사항)"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                등록
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 업체 간 도급 섹션 */}
      {activeSection === 'company' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">업체 간 도급</h3>
          {companySubcontracts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">등록된 업체 간 도급이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
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
          )}

          {/* 업체 간 도급 정산 내역 */}
          {companyPayments.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3">정산 내역 ({selectedPeriod})</h4>
              <div className="overflow-x-auto">
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
                          {formatCurrency(payment.amount)}
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
                          {payment.status === 'scheduled' && (
                            <button
                              onClick={() => handleMarkPaymentAsPaid(payment.id, payment.subcontract?.subcontractor?.name || payment.subcontract?.worker_name || '')}
                              disabled={paymentSubmitting === payment.id}
                              className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              지급완료
                            </button>
                          )}
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">개인 도급</h3>
          {individualSubcontracts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">등록된 개인 도급이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
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
          )}

          {/* 개인 도급 정산 내역 */}
          {individualPayments.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3">정산 내역 ({selectedPeriod})</h4>
              <div className="overflow-x-auto">
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
                          {formatCurrency(payment.amount)}
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
                          {payment.status === 'scheduled' && (
                            <button
                              onClick={() => handleMarkPaymentAsPaid(payment.id, payment.subcontract?.worker?.name || payment.subcontract?.worker_name || '')}
                              disabled={paymentSubmitting === payment.id}
                              className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              지급완료
                            </button>
                          )}
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

