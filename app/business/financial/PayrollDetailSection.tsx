'use client'

import { useState, useEffect } from 'react'

interface Payroll {
  id: string
  user_id: string | null
  worker_name: string | null
  pay_period: string
  amount: number
  paid_at: string | null
  status: 'paid' | 'scheduled'
  memo: string | null
  users: {
    id: string
    name: string
  } | null
}

interface PayrollDetailSectionProps {
  period: string
  onRefresh: () => void
}

export default function PayrollDetailSection({ period, onRefresh }: PayrollDetailSectionProps) {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)
  const [editStatus, setEditStatus] = useState<'paid' | 'scheduled'>('scheduled')
  const [editPaidAt, setEditPaidAt] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPayrolls()
  }, [period])

  const loadPayrolls = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/payrolls?period=${period}`)
      if (!response.ok) {
        throw new Error('인건비 데이터를 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success) {
        setPayrolls(data.data || [])
      }
    } catch (error: any) {
      console.error('Error loading payrolls:', error)
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getWorkerName = (payroll: Payroll) => {
    if (payroll.user_id && payroll.users) {
      return payroll.users.name
    }
    return payroll.worker_name || '-'
  }

  const filteredPayrolls = payrolls.filter((payroll) => {
    const matchesSearch = getWorkerName(payroll).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || payroll.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalAmount = filteredPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0)
  const paidCount = filteredPayrolls.filter(p => p.status === 'paid').length
  const scheduledCount = filteredPayrolls.filter(p => p.status === 'scheduled').length

  const handleMarkAsPaid = async (payroll: Payroll) => {
    if (!confirm(`${getWorkerName(payroll)}의 인건비 ${formatCurrency(payroll.amount)}을 지급 완료 처리하시겠습니까?`)) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/business/payrolls/${payroll.id}`, {
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
      loadPayrolls()
      onRefresh()
    } catch (err: any) {
      alert(err.message || '지급 완료 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDetail = (payroll: Payroll) => {
    setSelectedPayroll(payroll)
    setEditStatus(payroll.status)
    setEditPaidAt(payroll.paid_at ? new Date(payroll.paid_at).toISOString().split('T')[0] : '')
    setEditMemo(payroll.memo || '')
    setShowDetailModal(true)
  }

  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayroll) return

    try {
      setSubmitting(true)
      const updateData: any = {
        status: editStatus,
        memo: editMemo.trim() || null,
      }

      if (editStatus === 'paid' && editPaidAt) {
        updateData.paid_at = new Date(editPaidAt).toISOString()
      } else if (editStatus === 'scheduled') {
        updateData.paid_at = null
      } else if (editStatus === 'paid' && !editPaidAt) {
        updateData.paid_at = new Date().toISOString()
      }

      const response = await fetch(`/api/business/payrolls/${selectedPayroll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '인건비 수정 실패')
      }

      alert('인건비 정보가 수정되었습니다.')
      setShowDetailModal(false)
      setSelectedPayroll(null)
      loadPayrolls()
      onRefresh()
    } catch (err: any) {
      alert(err.message || '인건비 수정 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPayroll) return
    if (!confirm(`${getWorkerName(selectedPayroll)}의 인건비를 삭제하시겠습니까?`)) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/business/payrolls/${selectedPayroll.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '인건비 삭제 실패')
      }

      alert('인건비가 삭제되었습니다.')
      setShowDetailModal(false)
      setSelectedPayroll(null)
      loadPayrolls()
      onRefresh()
    } catch (err: any) {
      alert(err.message || '인건비 삭제 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">인건비 데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">인건비 상세</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="직원명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">전체</option>
            <option value="paid">지급완료</option>
            <option value="scheduled">예정</option>
          </select>
        </div>
      </div>

      <div className="mb-4 p-4 bg-purple-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">총 인건비:</span>
          <span className="text-lg font-bold text-purple-600">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-700">지급완료:</span>
          <span className="text-sm font-semibold text-green-600">{paidCount}건</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm font-medium text-gray-700">예정:</span>
          <span className="text-sm font-semibold text-yellow-600">{scheduledCount}건</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                직원명
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                지급일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                메모
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayrolls.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  인건비 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredPayrolls.map((payroll) => (
                <tr 
                  key={payroll.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleOpenDetail(payroll)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {getWorkerName(payroll)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(payroll.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {payroll.status === 'paid' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        지급완료
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        예정
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(payroll.paid_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {payroll.memo || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    {payroll.status === 'scheduled' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsPaid(payroll)
                        }}
                        disabled={submitting}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        지급 완료
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDetail(payroll)
                        }}
                        className="px-3 py-1 bg-gray-500 text-white text-xs rounded-md hover:bg-gray-600"
                      >
                        상세
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 상세 모달 */}
      {showDetailModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">인건비 상세</h3>
            <form onSubmit={handleSaveDetail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  직원명
                </label>
                <input
                  type="text"
                  value={getWorkerName(selectedPayroll)}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  금액
                </label>
                <input
                  type="text"
                  value={formatCurrency(selectedPayroll.amount)}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상태 *
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'paid' | 'scheduled')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="scheduled">예정</option>
                  <option value="paid">지급완료</option>
                </select>
              </div>

              {editStatus === 'paid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    지급일 *
                  </label>
                  <input
                    type="date"
                    value={editPaidAt}
                    onChange={(e) => setEditPaidAt(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required={editStatus === 'paid'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="메모를 입력하세요 (선택사항)"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedPayroll(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

