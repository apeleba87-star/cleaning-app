'use client'

import { useState, useEffect, useCallback } from 'react'
import { Revenue, Receipt } from '@/types/db'

interface StoreReceivable {
  store_id: string
  store_name: string
  unpaid_tracking_enabled: boolean
  total_revenue: number
  total_received: number
  unpaid_amount: number
  revenue_count: number
  revenues: Array<{
    id: string
    service_period: string
    amount: number
    received: number
    unpaid: number
    status: 'unpaid' | 'partial' | 'paid'
    due_date?: string
    billing_memo?: string | null
  }>
}

interface Store {
  id: string
  name: string
  service_amount: number | null
  payment_method: string | null
}

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<StoreReceivable[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [showRevenueForm, setShowRevenueForm] = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null)
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null)
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set())

  // 매출(청구) 폼 상태
  const [revenueStoreId, setRevenueStoreId] = useState('')
  const [revenueServicePeriod, setRevenueServicePeriod] = useState('')
  const [revenueAmount, setRevenueAmount] = useState('')
  const [revenueDueDate, setRevenueDueDate] = useState('')
  const [revenueBillingMemo, setRevenueBillingMemo] = useState('')

  // 수금 폼 상태
  const [receiptRevenueId, setReceiptRevenueId] = useState('')
  const [receiptReceivedAt, setReceiptReceivedAt] = useState('')
  const [receiptAmount, setReceiptAmount] = useState('')
  const [receiptMemo, setReceiptMemo] = useState('')

  // 사용 가능한 매장 목록 업데이트 함수 (useEffect보다 먼저 정의)
  const updateAvailableStores = useCallback(() => {
    if (!selectedPeriod || stores.length === 0) {
      setAvailableStores(stores)
      return
    }

    // 현재 기간에 이미 매출이 등록된 매장 ID 목록
    const registeredStoreIds = new Set(
      revenues
        .filter(r => r.service_period === selectedPeriod)
        .map(r => r.store_id)
    )

    // 수정 모드인 경우, 현재 수정 중인 매출의 매장은 제외하지 않음
    const editingStoreId = editingRevenue?.store_id

    // 이미 등록된 매장 제외 (수정 중인 매장은 제외하지 않음)
    const available = stores.filter(store => 
      !registeredStoreIds.has(store.id) || store.id === editingStoreId
    )

    setAvailableStores(available)
  }, [selectedPeriod, stores, revenues, editingRevenue])

  useEffect(() => {
    // 현재 월을 기본값으로 설정 (YYYY-MM)
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setSelectedPeriod(currentMonth)
    loadStores()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      loadData()
      loadRevenues().then(() => {
        loadReceipts()
      })
    }
  }, [selectedPeriod])

  useEffect(() => {
    // revenues가 로드되면 수금 목록도 업데이트
    if (revenues.length >= 0 && selectedPeriod) {
      loadReceipts()
    }
  }, [revenues, selectedPeriod])

  useEffect(() => {
    // stores나 revenues가 변경되면 사용 가능한 매장 목록 업데이트
    updateAvailableStores()
  }, [revenues, stores, selectedPeriod, editingRevenue, updateAvailableStores])

  const loadStores = async () => {
    try {
      const response = await fetch('/api/business/stores')
      if (!response.ok) {
        throw new Error('매장 목록 조회 실패')
      }

      const result = await response.json()
      if (result.success) {
        setStores(result.data || [])
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = `/api/business/receivables${selectedPeriod ? `?period=${selectedPeriod}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다.' }))
        throw new Error(errorData.error || '수금/미수금 현황 조회 실패')
      }

      const result = await response.json()
      if (result.success) {
        setReceivables(result.data || [])
      } else {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다.')
      }
    } catch (err: any) {
      console.error('Error loading receivables:', err)
      setError(err.message || '수금/미수금 현황을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadRevenues = async () => {
    try {
      const url = `/api/business/revenues${selectedPeriod ? `?period=${selectedPeriod}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('매출 목록 조회 실패')
      }

      const result = await response.json()
      if (result.success) {
        setRevenues(result.data || [])
      }
    } catch (err: any) {
      console.error('Error loading revenues:', err)
    }
  }

  const loadReceipts = async () => {
    try {
      const response = await fetch('/api/business/receipts')
      
      if (!response.ok) {
        throw new Error('수금 목록 조회 실패')
      }

      const result = await response.json()
      if (result.success) {
        // 선택된 기간의 매출에 해당하는 수금만 필터링
        if (selectedPeriod) {
          // revenues가 로드되었는지 확인하고, 없으면 다시 로드
          if (revenues.length === 0) {
            await loadRevenues()
            // loadRevenues 후 revenues 상태가 업데이트되기 전이므로, 
            // API에서 직접 기간별 매출을 조회하여 필터링
            const revenuesResponse = await fetch(`/api/business/revenues?period=${selectedPeriod}`)
            if (revenuesResponse.ok) {
              const revenuesResult = await revenuesResponse.json()
              if (revenuesResult.success) {
                const periodRevenues = revenuesResult.data || []
                const revenueIds = periodRevenues.map((r: Revenue) => r.id)
                const filteredReceipts = (result.data || []).filter((r: Receipt) => 
                  revenueIds.includes(r.revenue_id)
                )
                setReceipts(filteredReceipts)
                return
              }
            }
          } else {
            const periodRevenues = revenues.filter(r => r.service_period === selectedPeriod)
            const revenueIds = periodRevenues.map(r => r.id)
            const filteredReceipts = (result.data || []).filter((r: Receipt) => 
              revenueIds.includes(r.revenue_id)
            )
            setReceipts(filteredReceipts)
            return
          }
        }
        setReceipts(result.data || [])
      }
    } catch (err: any) {
      console.error('Error loading receipts:', err)
    }
  }

  const handleRevenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (!revenueStoreId || !revenueServicePeriod || !revenueAmount || !revenueDueDate) {
        setError('모든 필수 항목을 입력해주세요.')
        return
      }

      const response = await fetch('/api/business/revenues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: revenueStoreId,
          service_period: revenueServicePeriod,
          amount: parseFloat(revenueAmount),
          due_date: revenueDueDate,
          billing_memo: revenueBillingMemo.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '매출 등록 실패')
      }

      const result = await response.json()
      
      // 성공 시 폼 초기화 및 목록 새로고침
      resetRevenueForm()
      setShowRevenueForm(false)
      await loadData()
      await loadRevenues()
      await loadReceipts()
      updateAvailableStores()
      
      // 자동결제인 경우 알림
      if (result.auto_payment) {
        alert('매출이 등록되었고, 자동결제로 인해 완납 처리되었습니다.')
      } else {
        alert('매출이 등록되었습니다. 수금은 별도로 등록해주세요.')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (!receiptRevenueId || !receiptAmount) {
        setError('매출과 수금액을 입력해주세요.')
        return
      }

      const response = await fetch('/api/business/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenue_id: receiptRevenueId,
          received_at: receiptReceivedAt || new Date().toISOString(),
          amount: parseFloat(receiptAmount),
          memo: receiptMemo.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '수금 등록 실패')
      }

      // 성공 시 폼 초기화 및 목록 새로고침
      resetReceiptForm()
      setShowReceiptForm(false)
      loadData()
      loadReceipts()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetRevenueForm = () => {
    setRevenueStoreId('')
    setRevenueServicePeriod(selectedPeriod)
    setRevenueAmount('')
    setRevenueDueDate('')
    setRevenueBillingMemo('')
    setEditingRevenue(null)
  }

  const handleEditRevenue = (revenue: Revenue) => {
    setEditingRevenue(revenue)
    setRevenueStoreId(revenue.store_id)
    setRevenueServicePeriod(revenue.service_period)
    setRevenueAmount(revenue.amount.toString())
    setRevenueDueDate(revenue.due_date.split('T')[0])
    setRevenueBillingMemo(revenue.billing_memo || '')
    setShowRevenueForm(true)
  }

  const handleUpdateRevenue = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!editingRevenue) return

    try {
      if (!revenueServicePeriod || !revenueAmount || !revenueDueDate) {
        setError('모든 필수 항목을 입력해주세요.')
        return
      }

      const response = await fetch(`/api/business/revenues/${editingRevenue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_period: revenueServicePeriod,
          amount: parseFloat(revenueAmount),
          due_date: revenueDueDate,
          billing_memo: revenueBillingMemo.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '매출 수정 실패')
      }

      // 성공 시 폼 초기화 및 목록 새로고침
      resetRevenueForm()
      setShowRevenueForm(false)
      await loadData()
      await loadRevenues()
      await loadReceipts()
      updateAvailableStores()
      alert('매출이 수정되었습니다.')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteRevenue = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      setError(null)
      const response = await fetch(`/api/business/revenues/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '삭제 실패')
      }

      await loadData()
      await loadRevenues()
      await loadReceipts()
      updateAvailableStores()
      alert('매출이 삭제되었습니다.')
    } catch (err: any) {
      setError(err.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  const resetReceiptForm = () => {
    setReceiptRevenueId('')
    setReceiptReceivedAt('')
    setReceiptAmount('')
    setReceiptMemo('')
    setSelectedRevenue(null)
    setEditingReceipt(null)
  }

  const handleEditReceipt = (receipt: Receipt) => {
    setEditingReceipt(receipt)
    setReceiptRevenueId(receipt.revenue_id)
    // datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
    if (receipt.received_at) {
      const date = new Date(receipt.received_at)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      setReceiptReceivedAt(`${year}-${month}-${day}T${hours}:${minutes}`)
    } else {
      setReceiptReceivedAt('')
    }
    setReceiptAmount(receipt.amount.toString())
    setReceiptMemo(receipt.memo || '')
    setShowReceiptForm(true)
  }

  const handleUpdateReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!editingReceipt) return

    try {
      if (!receiptAmount) {
        setError('수금액을 입력해주세요.')
        return
      }

      const response = await fetch(`/api/business/receipts/${editingReceipt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          received_at: receiptReceivedAt || new Date().toISOString(),
          amount: parseFloat(receiptAmount),
          memo: receiptMemo.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '수금 수정 실패')
      }

      // 성공 시 폼 초기화 및 목록 새로고침
      resetReceiptForm()
      setShowReceiptForm(false)
      loadData()
      loadReceipts()
      alert('수금이 수정되었습니다.')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteReceipt = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      setError(null)
      const response = await fetch(`/api/business/receipts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '삭제 실패')
      }

      loadData()
      loadReceipts()
      alert('수금이 삭제되었습니다.')
    } catch (err: any) {
      setError(err.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const getStatusBadge = (status: 'unpaid' | 'partial' | 'paid') => {
    const styles = {
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    }
    const labels = {
      unpaid: '미수금',
      partial: '부분수금',
      paid: '완납',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

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
        <h1 className="text-2xl font-bold">수금/미수금 관리</h1>
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
              onClick={() => {
                setRevenueServicePeriod(selectedPeriod)
                updateAvailableStores()
                setShowRevenueForm(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + 매출(청구) 등록
            </button>
            <button
              onClick={() => {
                setShowReceiptForm(true)
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + 수금 등록
            </button>
          </div>
        </div>
      </div>

      {/* 매출(청구) 등록 폼 */}
      {showRevenueForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">매출(청구) 등록</h2>
            <button
              onClick={() => {
                setShowRevenueForm(false)
                resetRevenueForm()
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <form onSubmit={editingRevenue ? handleUpdateRevenue : handleRevenueSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                매장 <span className="text-red-500">*</span>
              </label>
              <select
                value={revenueStoreId}
                onChange={(e) => {
                  const selectedStoreId = e.target.value
                  setRevenueStoreId(selectedStoreId)
                  
                  // 매장 선택 시 서비스 금액 자동 입력 (수정 모드가 아닐 때만)
                  if (selectedStoreId && !editingRevenue) {
                    const selectedStore = stores.find(s => s.id === selectedStoreId)
                    if (selectedStore && selectedStore.service_amount) {
                      setRevenueAmount(selectedStore.service_amount.toString())
                    } else {
                      setRevenueAmount('')
                    }
                  } else if (!selectedStoreId) {
                    setRevenueAmount('')
                  }
                }}
                required
                disabled={!!editingRevenue}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">매장 선택</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
                {availableStores.length === 0 && stores.length > 0 && (
                  <option value="" disabled>
                    {selectedPeriod ? `${selectedPeriod} 기간에 등록 가능한 매장이 없습니다.` : '등록 가능한 매장이 없습니다.'}
                  </option>
                )}
              </select>
              {editingRevenue && (
                <p className="mt-1 text-xs text-gray-500">수정 시 매장은 변경할 수 없습니다.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                서비스 기간 <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                value={revenueServicePeriod}
                onChange={(e) => setRevenueServicePeriod(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                청구 금액 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={revenueAmount}
                onChange={(e) => setRevenueAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                납기일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={revenueDueDate}
                onChange={(e) => setRevenueDueDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                청구 메모
              </label>
              <textarea
                value={revenueBillingMemo}
                onChange={(e) => setRevenueBillingMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="청구 관련 메모 (선택사항)"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingRevenue ? '수정' : '등록'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRevenueForm(false)
                  resetRevenueForm()
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 수금 등록 폼 */}
      {showReceiptForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">수금 등록</h2>
            <button
              onClick={() => {
                setShowReceiptForm(false)
                resetReceiptForm()
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <form onSubmit={editingReceipt ? handleUpdateReceipt : handleReceiptSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                매출(청구) 선택 <span className="text-red-500">*</span>
              </label>
              <select
                value={receiptRevenueId}
                onChange={(e) => {
                  setReceiptRevenueId(e.target.value)
                  // 선택한 매출 정보 로드
                  const revenue = receivables
                    .flatMap((r) => r.revenues)
                    .find((rev) => rev.id === e.target.value)
                  if (revenue) {
                    // 최대 수금 가능 금액 표시를 위해 selectedRevenue에 저장
                    // 실제로는 API에서 revenue 정보를 가져와야 하지만, 간단하게 처리
                  }
                }}
                required
                disabled={!!editingReceipt}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">매출 선택</option>
                {receivables.flatMap((r) =>
                  r.revenues.map((rev) => (
                    <option key={rev.id} value={rev.id}>
                      {r.store_name} - {rev.service_period} ({formatCurrency(rev.amount)}, 미수: {formatCurrency(rev.unpaid)})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수금일
              </label>
              <input
                type="datetime-local"
                value={receiptReceivedAt}
                onChange={(e) => setReceiptReceivedAt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">미입력 시 현재 시간으로 저장됩니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수금액 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수금 메모
              </label>
              <textarea
                value={receiptMemo}
                onChange={(e) => setReceiptMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="수금 관련 메모 (선택사항)"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {editingReceipt ? '수정' : '등록'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReceiptForm(false)
                  resetReceiptForm()
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 매장별 수금/미수금 현황 테이블 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  매장명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  청구 건수
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 청구액
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 수금액
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  미수금
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receivables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {selectedPeriod ? `${selectedPeriod} 기간의 데이터가 없습니다.` : '데이터가 없습니다.'}
                  </td>
                </tr>
              ) : (
                receivables.map((receivable) => {
                  const isExpanded = expandedStores.has(receivable.store_id)
                  return (
                    <>
                      <tr key={receivable.store_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedStores)
                                if (isExpanded) {
                                  newExpanded.delete(receivable.store_id)
                                } else {
                                  newExpanded.add(receivable.store_id)
                                }
                                setExpandedStores(newExpanded)
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {receivable.store_name}
                              </div>
                              {!receivable.unpaid_tracking_enabled && (
                                <div className="text-xs text-gray-500">(미수금 추적 비활성화)</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {receivable.revenue_count}건
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(receivable.total_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(receivable.total_received)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                          receivable.unpaid_amount > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(receivable.unpaid_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {receivable.unpaid_amount === 0 ? (
                            getStatusBadge('paid')
                          ) : receivable.total_received > 0 ? (
                            getStatusBadge('partial')
                          ) : (
                            getStatusBadge('unpaid')
                          )}
                        </td>
                      </tr>
                      {isExpanded && receivable.revenues.length > 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                {receivable.store_name} - 매출 상세
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                                        서비스 기간
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                                        청구 금액
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                                        납기일
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                                        수금액
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                                        미수금
                                      </th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">
                                        상태
                                      </th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">
                                        작업
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {receivable.revenues.map((revenue) => {
                                      const fullRevenue = revenues.find(r => r.id === revenue.id)
                                      return (
                                        <tr key={revenue.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-2 text-sm text-gray-900">
                                            {revenue.service_period}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                            {formatCurrency(revenue.amount)}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-500">
                                            {revenue.due_date ? revenue.due_date.split('T')[0] : (fullRevenue ? fullRevenue.due_date.split('T')[0] : '-')}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                            {formatCurrency(revenue.received)}
                                          </td>
                                          <td className={`px-4 py-2 text-sm font-medium text-right ${
                                            revenue.unpaid > 0 ? 'text-red-600' : 'text-green-600'
                                          }`}>
                                            {formatCurrency(revenue.unpaid)}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            {getStatusBadge(revenue.status)}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            {fullRevenue && (
                                              <div className="flex justify-center space-x-1">
                                                <button
                                                  onClick={() => handleEditRevenue(fullRevenue)}
                                                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                                >
                                                  수정
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteRevenue(fullRevenue.id)}
                                                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                >
                                                  삭제
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 매출(청구) 목록 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">매출(청구) 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  매장명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스 기간
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  청구 금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  납기일
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {selectedPeriod ? `${selectedPeriod} 기간의 매출 데이터가 없습니다.` : '매출 데이터가 없습니다.'}
                  </td>
                </tr>
              ) : (
                revenues.map((revenue) => (
                  <tr key={revenue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(revenue as any).stores?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {revenue.service_period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(revenue.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {revenue.due_date.split('T')[0]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(revenue.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleEditRevenue(revenue)}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteRevenue(revenue.id)}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수금 목록 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">수금 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  매장명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스 기간
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  수금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  수금일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  메모
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {selectedPeriod ? `${selectedPeriod} 기간의 수금 데이터가 없습니다.` : '수금 데이터가 없습니다.'}
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(receipt as any).revenues?.stores?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(receipt as any).revenues?.service_period || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(receipt.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.received_at ? receipt.received_at.split('T')[0] : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {receipt.memo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleEditReceipt(receipt)}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteReceipt(receipt.id)}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

