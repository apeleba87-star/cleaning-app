'use client'

import { useState, useEffect } from 'react'
import { Payroll } from '@/types/db'

export default function PayrollsPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [generatingRegular, setGeneratingRegular] = useState(false)

  // 폼 상태 - 일당 근로자
  const [workerName, setWorkerName] = useState('')
  const [residentRegistrationNumber, setResidentRegistrationNumber] = useState('')
  const [workDays, setWorkDays] = useState('')
  const [dailyWage, setDailyWage] = useState('')
  const [dailyPaidAt, setDailyPaidAt] = useState('')
  const [dailyStatus, setDailyStatus] = useState<'scheduled' | 'paid'>('scheduled')
  const [dailyMemo, setDailyMemo] = useState('')

  useEffect(() => {
    // 현재 월을 기본값으로 설정 (YYYY-MM)
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setSelectedPeriod(currentMonth)
    loadData()
  }, [])

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
    try {
      setLoading(true)

      // 인건비 목록 조회
      const response = await fetch('/api/business/payrolls')
      if (!response.ok) {
        throw new Error('인건비 목록 조회 실패')
      }

      const result = await response.json()
      if (result.success) {
        setPayrolls(result.data || [])
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

      const response = await fetch('/api/business/payrolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_name: workerName.trim(),
          resident_registration_number: residentRegistrationNumber || null,
          work_days: parseInt(workDays),
          daily_wage: parseFloat(dailyWage),
          pay_period: period,
          paid_at: dailyPaidAt || null,
          status: dailyStatus,
          memo: dailyMemo.trim() || null,
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

  // 기간별 필터링
  const filteredPayrolls = selectedPeriod
    ? payrolls.filter(p => p.pay_period === selectedPeriod)
    : payrolls

  // 정규 직원과 일당 근로자 분리
  const regularPayrolls = filteredPayrolls.filter(p => p.user_id)
  const dailyPayrolls = filteredPayrolls.filter(p => !p.user_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">인건비 관리</h1>
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

      {/* 기간 선택 및 추가 버튼 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              기간 선택:
            </label>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex space-x-2">
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
            <button
              onClick={() => {
                setShowForm(true)
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + 일당 근로자 인건비
            </button>
          </div>
        </div>
      </div>

      {/* 인건비 입력 폼 (일당 근로자만) */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">일당 근로자 인건비 추가</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="일당 근로자 이름"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주민등록번호
                    <span className="ml-2 text-xs text-gray-500">(선택사항, 세금 처리를 위해 필요할 수 있음)</span>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ⚠️ 주민등록번호는 암호화되어 안전하게 저장됩니다.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      일당 금액 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={dailyWage}
                      onChange={(e) => setDailyWage(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="일당 금액"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      근무 일수 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={workDays}
                      onChange={(e) => setWorkDays(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="근무 일수"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    총 금액: {dailyWage && workDays ? (parseFloat(dailyWage) * parseInt(workDays)).toLocaleString('ko-KR') : 0}원
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      지급일
                    </label>
                    <input
                      type="date"
                      value={dailyPaidAt}
                      onChange={(e) => setDailyPaidAt(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      상태
                    </label>
                    <select
                      value={dailyStatus}
                      onChange={(e) => setDailyStatus(e.target.value as 'scheduled' | 'paid')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="scheduled">예정</option>
                      <option value="paid">지급완료</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메모
                  </label>
                  <textarea
                    value={dailyMemo}
                    onChange={(e) => setDailyMemo(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="메모를 입력하세요"
                  />
                </div>
            </>
            <div className="flex justify-end space-x-3 pt-4">
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 정규 직원 인건비 목록 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">정규 직원 인건비</h2>
        {regularPayrolls.length === 0 ? (
          <p className="text-gray-500 text-sm">등록된 인건비가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">직원</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">기간</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">지급일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {regularPayrolls.map((payroll) => (
                  <tr key={payroll.id}>
                    <td className="px-4 py-3 text-sm">{payroll.users?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{payroll.pay_period}</td>
                    <td className="px-4 py-3 text-sm">{payroll.amount.toLocaleString('ko-KR')}원</td>
                    <td className="px-4 py-3 text-sm">
                      {payroll.paid_at 
                        ? (typeof payroll.paid_at === 'string' 
                            ? payroll.paid_at.split('T')[0] 
                            : new Date(payroll.paid_at).toISOString().split('T')[0])
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        payroll.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payroll.status === 'paid' ? '지급완료' : '예정'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(payroll.id)}
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
      </div>

      {/* 일당 근로자 인건비 목록 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">일당 근로자 인건비</h2>
        {dailyPayrolls.length === 0 ? (
          <p className="text-gray-500 text-sm">등록된 인건비가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
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
              <tbody className="divide-y divide-gray-200">
                {dailyPayrolls.map((payroll) => (
                  <tr key={payroll.id}>
                    <td className="px-4 py-3 text-sm">{payroll.worker_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{payroll.pay_period}</td>
                    <td className="px-4 py-3 text-sm">{payroll.daily_wage?.toLocaleString('ko-KR') || '-'}원</td>
                    <td className="px-4 py-3 text-sm">{payroll.work_days || '-'}일</td>
                    <td className="px-4 py-3 text-sm font-medium">{payroll.amount.toLocaleString('ko-KR')}원</td>
                    <td className="px-4 py-3 text-sm">
                      {payroll.paid_at 
                        ? (typeof payroll.paid_at === 'string' 
                            ? payroll.paid_at.split('T')[0] 
                            : new Date(payroll.paid_at).toISOString().split('T')[0])
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        payroll.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payroll.status === 'paid' ? '지급완료' : '예정'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(payroll.id)}
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
      </div>
    </div>
  )
}

