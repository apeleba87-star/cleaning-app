'use client'

import { useState, useEffect, useCallback } from 'react'
import { Revenue, Receipt } from '@/types/db'
import { adjustPaymentDayToLastDay } from '@/lib/utils/date'

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
  payment_day: number | null
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
  
  // 정렬 상태 (매장별 수금/미수금 현황 테이블용)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // 매출 목록 정렬 상태
  const [revenueSortColumn, setRevenueSortColumn] = useState<string | null>(null)
  const [revenueSortDirection, setRevenueSortDirection] = useState<'asc' | 'desc'>('asc')
  const [revenueCurrentPage, setRevenueCurrentPage] = useState(1)
  const revenueItemsPerPage = 30

  // 매출(청구) 폼 상태
  const [revenueStoreId, setRevenueStoreId] = useState('')
  const [revenueServicePeriod, setRevenueServicePeriod] = useState('')
  const [revenueAmount, setRevenueAmount] = useState('')
  const [revenueDueDate, setRevenueDueDate] = useState('')
  const [revenueBillingMemo, setRevenueBillingMemo] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [batchStores, setBatchStores] = useState<Array<{
    storeId: string
    storeName: string
    amount: string
    dueDate: string
    checked: boolean
  }>>([])

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

  // 납기일 자동 계산 함수
  const calculateDueDate = (servicePeriod: string, paymentDay: number | null): string => {
    if (!servicePeriod || !paymentDay) {
      return ''
    }

    try {
      // 서비스 기간 파싱 (YYYY-MM)
      const [year, month] = servicePeriod.split('-').map(Number)
      
      // 서비스 기간과 같은 달로 납기일 설정
      // payment_day가 해당 월에 유효한지 확인 (말일 조정)
      const finalDay = adjustPaymentDayToLastDay(year, month, paymentDay)

      // YYYY-MM-DD 형식으로 반환
      return `${year}-${String(month).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`
    } catch (error) {
      console.error('Error calculating due date:', error)
      return ''
    }
  }

  // 신규 매장 자동 추가 함수
  const handleAutoAddStores = async () => {
    if (!selectedPeriod) {
      alert('기간을 먼저 선택해주세요.')
      return
    }

    try {
      // 해당 기간에 이미 청구가 등록된 매장 ID 목록
      const registeredStoreIds = new Set(
        revenues
          .filter(r => r.service_period === selectedPeriod)
          .map(r => r.store_id)
      )

      // 청구가 없는 매장들 필터링
      const unregisteredStores = stores.filter(
        store => !registeredStoreIds.has(store.id)
      )

      if (unregisteredStores.length === 0) {
        alert('자동 추가할 매장이 없습니다. 모든 매장에 이미 청구가 등록되어 있습니다.')
        return
      }

      // 배치 모드로 전환하고 매장 목록 준비
      const batchStoresData = unregisteredStores.map(store => ({
        storeId: store.id,
        storeName: store.name,
        amount: store.service_amount?.toString() || '0',
        dueDate: calculateDueDate(selectedPeriod, store.payment_day),
        checked: true,
      }))

      setBatchStores(batchStoresData)
      setBatchMode(true)
      setShowRevenueForm(true)
    } catch (err: any) {
      setError(err.message || '매장 자동 추가 중 오류가 발생했습니다.')
    }
  }

  // 배치 등록 처리
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const checkedStores = batchStores.filter(s => s.checked)
    
    if (checkedStores.length === 0) {
      setError('등록할 매장을 최소 1개 이상 선택해주세요.')
      return
    }

    try {
      // 각 매장에 대해 청구 등록
      const promises = checkedStores.map(store => 
        fetch('/api/business/revenues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: store.storeId,
            service_period: revenueServicePeriod || selectedPeriod,
            amount: parseFloat(store.amount) || 0,
            due_date: store.dueDate || calculateDueDate(revenueServicePeriod || selectedPeriod, stores.find(s => s.id === store.storeId)?.payment_day || null),
            billing_memo: revenueBillingMemo.trim() || null,
          }),
        })
      )

      const results = await Promise.allSettled(promises)
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
      
      if (failed.length > 0) {
        throw new Error(`${failed.length}개 매장의 등록에 실패했습니다.`)
      }

      // 성공 시 폼 초기화 및 목록 새로고침
      setBatchMode(false)
      setBatchStores([])
      setShowRevenueForm(false)
      resetRevenueForm()
      await loadData()
      await loadRevenues()
      await loadReceipts()
      updateAvailableStores()
      
      alert(`${checkedStores.length}개 매장의 매출이 등록되었습니다.`)
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
    setBatchMode(false)
    setBatchStores([])
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

  const getStatusBadge = (status: 'unregistered' | 'unpaid' | 'partial' | 'paid' | 'no_revenue') => {
    const styles = {
      no_revenue: 'bg-red-100 text-red-800',
      unregistered: 'bg-orange-100 text-orange-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    }
    const labels = {
      no_revenue: '청구 없음',
      unregistered: '수금 미등록',
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

  // 정렬 함수
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // 같은 컬럼 클릭 시 정렬 방향 전환
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // 다른 컬럼 클릭 시 해당 컬럼으로 정렬 (기본 오름차순)
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // 정렬된 데이터
  const sortedReceivables = [...receivables].sort((a, b) => {
    if (!sortColumn) return 0

    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case 'store_name':
        aValue = a.store_name
        bValue = b.store_name
        break
      case 'revenue_count':
        aValue = a.revenue_count
        bValue = b.revenue_count
        break
      case 'total_revenue':
        aValue = a.total_revenue
        bValue = b.total_revenue
        break
      case 'total_received':
        aValue = a.total_received
        bValue = b.total_received
        break
      case 'unpaid_amount':
        aValue = a.unpaid_amount
        bValue = b.unpaid_amount
        break
      case 'status':
        // 상태 정렬: 완납 > 부분수금 > 수금 미등록 > 청구 없음
        const statusOrder: Record<string, number> = {
          'paid': 1,
          'partial': 2,
          'unregistered': 3,
          'unpaid': 3,
          'no_revenue': 4,
        }
        const getStatus = (r: StoreReceivable) => {
          if (r.total_revenue === 0) return 'no_revenue'
          if (r.total_received === 0) return 'unregistered'
          if (r.unpaid_amount === 0) return 'paid'
          return 'partial'
        }
        aValue = statusOrder[getStatus(a)] || 5
        bValue = statusOrder[getStatus(b)] || 5
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // 정렬 아이콘 표시 함수
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400">↕</span>
    }
    return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
  }

  // 매출 목록 정렬 함수
  const handleRevenueSort = (column: string) => {
    if (revenueSortColumn === column) {
      setRevenueSortDirection(revenueSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setRevenueSortColumn(column)
      setRevenueSortDirection('asc')
    }
    setRevenueCurrentPage(1) // 정렬 변경 시 첫 페이지로
  }

  // 매출 목록 정렬 아이콘
  const getRevenueSortIcon = (column: string) => {
    if (revenueSortColumn !== column) {
      return <span className="text-gray-400">↕</span>
    }
    return revenueSortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
  }

  // 매출 목록 정렬 및 페이지네이션
  const sortedRevenues = [...revenues].sort((a, b) => {
    if (!revenueSortColumn) return 0

    let aValue: any
    let bValue: any

    switch (revenueSortColumn) {
      case 'store_name':
        aValue = (a as any).stores?.name || ''
        bValue = (b as any).stores?.name || ''
        break
      case 'service_period':
        aValue = a.service_period
        bValue = b.service_period
        break
      case 'amount':
        aValue = a.amount
        bValue = b.amount
        break
      case 'due_date':
        aValue = new Date(a.due_date).getTime()
        bValue = new Date(b.due_date).getTime()
        break
      case 'status':
        // 상태는 receipts를 계산해야 하므로 복잡함, 여기서는 간단히 처리
        const aReceipts = receipts.filter(r => r.revenue_id === a.id)
        const bReceipts = receipts.filter(r => r.revenue_id === b.id)
        const aReceived = aReceipts.reduce((sum, r) => sum + r.amount, 0)
        const bReceived = bReceipts.reduce((sum, r) => sum + r.amount, 0)
        const aUnpaid = a.amount - aReceived
        const bUnpaid = b.amount - bReceived
        
        const statusOrder: Record<string, number> = {
          'paid': 1,
          'partial': 2,
          'unregistered': 3,
        }
        const getStatus = (unpaid: number, received: number) => {
          if (received === 0) return 'unregistered'
          if (unpaid === 0) return 'paid'
          return 'partial'
        }
        aValue = statusOrder[getStatus(aUnpaid, aReceived)] || 4
        bValue = statusOrder[getStatus(bUnpaid, bReceived)] || 4
        break
      default:
        return 0
    }

    if (aValue < bValue) return revenueSortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return revenueSortDirection === 'asc' ? 1 : -1
    return 0
  })

  // 페이지네이션 계산
  const revenueTotalPages = Math.ceil(sortedRevenues.length / revenueItemsPerPage)
  const revenueStartIndex = (revenueCurrentPage - 1) * revenueItemsPerPage
  const revenueEndIndex = revenueStartIndex + revenueItemsPerPage
  const paginatedRevenues = sortedRevenues.slice(revenueStartIndex, revenueEndIndex)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 헤더 - 모바일 최적화 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pt-4 sm:pt-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            수금/미수금 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1 hidden sm:block">매장별 매출(청구) 및 수금 관리</p>
        </div>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
        >
          ← 대시보드로
        </a>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* 기간 선택 및 액션 버튼 - 모바일 최적화 */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              기간 선택:
            </label>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="flex flex-col items-center">
              <button
                onClick={handleAutoAddStores}
                className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm sm:text-base flex items-center justify-center gap-2 min-h-[48px]"
              >
                <span className="text-lg">+</span>
                <span className="hidden sm:inline">매장 매출 자동 추가</span>
                <span className="sm:hidden">자동 추가</span>
              </button>
              <span className="mt-1.5 text-xs text-gray-600 text-center max-w-[200px] sm:max-w-none">
                매장별 청구금액과 납기일을<br className="hidden sm:block" />자동으로 계산하여 일괄 등록
              </span>
            </div>
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setShowRevenueForm(true)
                  resetRevenueForm()
                }}
                className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm sm:text-base flex items-center justify-center gap-2 min-h-[48px]"
              >
                <span className="text-lg">+</span>
                <span className="hidden sm:inline">신규 매출(청구) 등록</span>
                <span className="sm:hidden">매출 등록</span>
              </button>
              <span className="mt-1.5 text-xs text-gray-600 text-center max-w-[200px] sm:max-w-none">
                개별 매장의 매출(청구)을<br className="hidden sm:block" />수동으로 등록
              </span>
            </div>
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setShowReceiptForm(true)
                }}
                className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm sm:text-base flex items-center justify-center gap-2 min-h-[48px]"
              >
                <span className="text-lg">+</span>
                <span>수금 등록</span>
              </button>
              <span className="mt-1.5 text-xs text-gray-600 text-center max-w-[200px] sm:max-w-none">
                등록된 매출에 대한<br className="hidden sm:block" />수금 내역을 등록
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 매출(청구) 등록 폼 */}
      {showRevenueForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {batchMode ? '매출(청구) 일괄 등록' : editingRevenue ? '매출(청구) 수정' : '매출(청구) 등록'}
            </h2>
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
          
          {batchMode ? (
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  서비스 기간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={revenueServicePeriod || selectedPeriod}
                  onChange={(e) => {
                    setRevenueServicePeriod(e.target.value)
                    // 기간 변경 시 모든 매장의 납기일 재계산
                    setBatchStores(prev => prev.map(store => {
                      const storeData = stores.find(s => s.id === store.storeId)
                      return {
                        ...store,
                        dueDate: calculateDueDate(e.target.value, storeData?.payment_day || null)
                      }
                    }))
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  청구 메모 (공통)
                </label>
                <textarea
                  value={revenueBillingMemo}
                  onChange={(e) => setRevenueBillingMemo(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="청구 관련 메모 (선택사항, 모든 매장에 공통 적용)"
                />
              </div>

              <div className="border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    등록할 매장 목록 ({batchStores.filter(s => s.checked).length}/{batchStores.length})
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setBatchStores(prev => prev.map(s => ({ ...s, checked: true })))}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      전체 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchStores(prev => prev.map(s => ({ ...s, checked: false })))}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {batchStores.map((store, index) => (
                    <div key={store.storeId} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={store.checked}
                          onChange={(e) => {
                            setBatchStores(prev => prev.map((s, i) => 
                              i === index ? { ...s, checked: e.target.checked } : s
                            ))
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              매장명
                            </label>
                            <div className="text-sm text-gray-900">{store.storeName}</div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              청구 금액 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={store.amount}
                              onChange={(e) => {
                                setBatchStores(prev => prev.map((s, i) => 
                                  i === index ? { ...s, amount: e.target.value } : s
                                ))
                              }}
                              required
                              min="0"
                              step="0.01"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              납기일 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={store.dueDate}
                              onChange={(e) => {
                                setBatchStores(prev => prev.map((s, i) => 
                                  i === index ? { ...s, dueDate: e.target.value } : s
                                ))
                              }}
                              required
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  일괄 등록 ({batchStores.filter(s => s.checked).length}개)
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
          ) : (
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
                    
                    // 매장 선택 시 서비스 금액 및 납기일 자동 입력 (수정 모드가 아닐 때만)
                    if (selectedStoreId && !editingRevenue) {
                      const selectedStore = stores.find(s => s.id === selectedStoreId)
                      if (selectedStore) {
                        // 서비스 금액 자동 입력
                        if (selectedStore.service_amount) {
                          setRevenueAmount(selectedStore.service_amount.toString())
                        } else {
                          setRevenueAmount('')
                        }
                        
                        // 납기일 자동 계산
                        if (revenueServicePeriod && selectedStore.payment_day) {
                          const calculatedDueDate = calculateDueDate(revenueServicePeriod, selectedStore.payment_day)
                          if (calculatedDueDate) {
                            setRevenueDueDate(calculatedDueDate)
                          }
                        }
                      }
                    } else if (!selectedStoreId) {
                      setRevenueAmount('')
                      setRevenueDueDate('')
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
                  onChange={(e) => {
                    setRevenueServicePeriod(e.target.value)
                    // 서비스 기간 변경 시 납기일 자동 재계산
                    if (revenueStoreId && e.target.value) {
                      const selectedStore = stores.find(s => s.id === revenueStoreId)
                      if (selectedStore && selectedStore.payment_day) {
                        const calculatedDueDate = calculateDueDate(e.target.value, selectedStore.payment_day)
                        if (calculatedDueDate) {
                          setRevenueDueDate(calculatedDueDate)
                        }
                      }
                    }
                  }}
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
                {revenueStoreId && stores.find(s => s.id === revenueStoreId)?.payment_day && (
                  <p className="mt-1 text-xs text-gray-500">
                    매장의 결제일({stores.find(s => s.id === revenueStoreId)?.payment_day}일) 기준으로 자동 계산됩니다.
                  </p>
                )}
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
          )}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                수금 일시
              </label>
              <input
                type="datetime-local"
                value={receiptReceivedAt}
                onChange={(e) => setReceiptReceivedAt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                메모
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

      {/* 매장별 수금/미수금 현황 - 모바일 카드, 데스크톱 테이블 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        {/* 데스크톱 테이블 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('store_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>매장명</span>
                  {getSortIcon('store_name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('revenue_count')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>청구 건수</span>
                  {getSortIcon('revenue_count')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_revenue')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>총 청구액</span>
                  {getSortIcon('total_revenue')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_received')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>총 수금액</span>
                  {getSortIcon('total_received')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('unpaid_amount')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>미수금</span>
                  {getSortIcon('unpaid_amount')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>상태</span>
                  {getSortIcon('status')}
                </div>
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
              sortedReceivables.map((receivable) => {
                const isExpanded = expandedStores.has(receivable.store_id)
                
                // 상태 계산 로직
                let status: 'unregistered' | 'unpaid' | 'partial' | 'paid' | 'no_revenue'
                let rowBgColor = ''
                
                if (receivable.total_revenue === 0) {
                  status = 'no_revenue'
                  rowBgColor = ''
                } else if (receivable.total_received === 0) {
                  status = 'unregistered'
                  rowBgColor = 'bg-orange-50'
                } else if (receivable.unpaid_amount === 0) {
                  status = 'paid'
                  rowBgColor = ''
                } else {
                  status = 'partial'
                  rowBgColor = 'bg-yellow-50'
                }
                
                return (
                  <>
                    <tr key={receivable.store_id} className={`hover:bg-gray-50 ${rowBgColor}`}>
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
                        {getStatusBadge(status)}
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
                                    
                                    // Revenue 상태 계산 로직
                                    let revenueStatus: 'unregistered' | 'unpaid' | 'partial' | 'paid' | 'no_revenue'
                                    let revenueRowBgColor = ''
                                    
                                    if (revenue.amount === 0) {
                                      revenueStatus = 'no_revenue'
                                      revenueRowBgColor = ''
                                    } else if (revenue.received === 0) {
                                      revenueStatus = 'unregistered'
                                      revenueRowBgColor = 'bg-orange-50'
                                    } else if (revenue.unpaid === 0) {
                                      revenueStatus = 'paid'
                                      revenueRowBgColor = ''
                                    } else {
                                      revenueStatus = 'partial'
                                      revenueRowBgColor = 'bg-yellow-50'
                                    }
                                    
                                    return (
                                      <tr key={revenue.id} className={`hover:bg-gray-50 ${revenueRowBgColor}`}>
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
                                          {getStatusBadge(revenueStatus)}
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

        {/* 모바일 카드 뷰 */}
        <div className="lg:hidden p-4 space-y-4">
          {receivables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedPeriod ? `${selectedPeriod} 기간의 데이터가 없습니다.` : '데이터가 없습니다.'}
            </div>
          ) : (
            sortedReceivables.map((receivable) => {
              const isExpanded = expandedStores.has(receivable.store_id)
              
              let status: 'unregistered' | 'unpaid' | 'partial' | 'paid' | 'no_revenue'
              if (receivable.total_revenue === 0) {
                status = 'no_revenue'
              } else if (receivable.total_received === 0) {
                status = 'unregistered'
              } else if (receivable.unpaid_amount === 0) {
                status = 'paid'
              } else {
                status = 'partial'
              }

              return (
                <div
                  key={receivable.store_id}
                  className={`bg-white rounded-xl shadow-md border-2 p-4 transition-all duration-200 ${
                    status === 'unregistered' ? 'border-orange-200 bg-orange-50/50' :
                    status === 'partial' ? 'border-yellow-200 bg-yellow-50/50' :
                    status === 'paid' ? 'border-green-200 bg-green-50/50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
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
                          className="text-gray-500 hover:text-gray-700 text-lg"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <h3 className="font-semibold text-gray-900">{receivable.store_name}</h3>
                      </div>
                      {!receivable.unpaid_tracking_enabled && (
                        <p className="text-xs text-gray-500 ml-6">(미수금 추적 비활성화)</p>
                      )}
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 ml-6">
                    <div className="bg-blue-50/50 rounded-lg p-2">
                      <p className="text-xs text-gray-600 mb-1">청구 건수</p>
                      <p className="text-sm font-semibold text-gray-900">{receivable.revenue_count}건</p>
                    </div>
                    <div className="bg-purple-50/50 rounded-lg p-2">
                      <p className="text-xs text-gray-600 mb-1">총 청구액</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(receivable.total_revenue)}</p>
                    </div>
                    <div className="bg-green-50/50 rounded-lg p-2">
                      <p className="text-xs text-gray-600 mb-1">총 수금액</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(receivable.total_received)}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${receivable.unpaid_amount > 0 ? 'bg-red-50/50' : 'bg-gray-50/50'}`}>
                      <p className="text-xs text-gray-600 mb-1">미수금</p>
                      <p className={`text-sm font-semibold ${receivable.unpaid_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(receivable.unpaid_amount)}
                      </p>
                    </div>
                  </div>

                  {isExpanded && receivable.revenues.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 ml-6">
                        {receivable.store_name} - 매출 상세
                      </h4>
                      {receivable.revenues.map((revenue) => {
                        const fullRevenue = revenues.find(r => r.id === revenue.id)
                        let revenueStatus: 'unregistered' | 'unpaid' | 'partial' | 'paid' | 'no_revenue'
                        if (revenue.amount === 0) {
                          revenueStatus = 'no_revenue'
                        } else if (revenue.received === 0) {
                          revenueStatus = 'unregistered'
                        } else if (revenue.unpaid === 0) {
                          revenueStatus = 'paid'
                        } else {
                          revenueStatus = 'partial'
                        }
                        
                        return (
                          <div
                            key={revenue.id}
                            className={`ml-6 bg-white rounded-lg p-3 border ${
                              revenueStatus === 'unregistered' ? 'border-orange-200 bg-orange-50/30' :
                              revenueStatus === 'partial' ? 'border-yellow-200 bg-yellow-50/30' :
                              revenueStatus === 'paid' ? 'border-green-200 bg-green-50/30' :
                              'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">{revenue.service_period}</span>
                              {getStatusBadge(revenueStatus)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600">청구:</span>
                                <span className="ml-1 font-semibold">{formatCurrency(revenue.amount)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">수금:</span>
                                <span className="ml-1 font-semibold">{formatCurrency(revenue.received)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">납기일:</span>
                                <span className="ml-1">{revenue.due_date ? revenue.due_date.split('T')[0] : (fullRevenue ? fullRevenue.due_date.split('T')[0] : '-')}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">미수:</span>
                                <span className={`ml-1 font-semibold ${revenue.unpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {formatCurrency(revenue.unpaid)}
                                </span>
                              </div>
                            </div>
                            {fullRevenue && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleEditRevenue(fullRevenue)}
                                  className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDeleteRevenue(fullRevenue.id)}
                                  className="flex-1 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 매출 목록 - 모바일 카드, 데스크톱 테이블 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden mt-6">
        <h2 className="text-lg sm:text-xl font-semibold p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          매출 목록
        </h2>
        
        {/* 데스크톱 테이블 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleRevenueSort('store_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>매장명</span>
                  {getRevenueSortIcon('store_name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleRevenueSort('service_period')}
              >
                <div className="flex items-center space-x-1">
                  <span>서비스 기간</span>
                  {getRevenueSortIcon('service_period')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleRevenueSort('amount')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>청구 금액</span>
                  {getRevenueSortIcon('amount')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleRevenueSort('due_date')}
              >
                <div className="flex items-center space-x-1">
                  <span>납기일</span>
                  {getRevenueSortIcon('due_date')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleRevenueSort('status')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>상태</span>
                  {getRevenueSortIcon('status')}
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRevenues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {selectedPeriod ? `${selectedPeriod} 기간의 매출 데이터가 없습니다.` : '매출 데이터가 없습니다.'}
                </td>
              </tr>
            ) : (
              paginatedRevenues.map((revenue) => {
                // Revenue별 receipts 계산
                const revenueReceipts = receipts.filter(r => r.revenue_id === revenue.id)
                const totalReceived = revenueReceipts.reduce((sum, r) => sum + r.amount, 0)
                const unpaid = revenue.amount - totalReceived
                
                // Revenue 상태 계산 로직
                let revenueStatus: 'unregistered' | 'unpaid' | 'partial' | 'paid' | 'no_revenue'
                let revenueRowBgColor = ''
                
                if (revenue.amount === 0) {
                  revenueStatus = 'no_revenue'
                  revenueRowBgColor = ''
                } else if (totalReceived === 0) {
                  revenueStatus = 'unregistered'
                  revenueRowBgColor = 'bg-orange-50'
                } else if (unpaid === 0) {
                  revenueStatus = 'paid'
                  revenueRowBgColor = ''
                } else {
                  revenueStatus = 'partial'
                  revenueRowBgColor = 'bg-yellow-50'
                }
                
                return (
                  <tr key={revenue.id} className={`hover:bg-gray-50 ${revenueRowBgColor}`}>
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
                      {getStatusBadge(revenueStatus)}
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
                )
              })
            )}
          </tbody>
        </table>
        
        {/* 페이지네이션 */}
        {revenueTotalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {revenueStartIndex + 1} - {Math.min(revenueEndIndex, sortedRevenues.length)} / {sortedRevenues.length}건
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setRevenueCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={revenueCurrentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                이전
              </button>
              {Array.from({ length: revenueTotalPages }, (_, i) => i + 1).map((page) => {
                // 페이지 번호 표시 로직: 현재 페이지 주변만 표시
                if (
                  page === 1 ||
                  page === revenueTotalPages ||
                  (page >= revenueCurrentPage - 2 && page <= revenueCurrentPage + 2)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setRevenueCurrentPage(page)}
                      className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                        revenueCurrentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  page === revenueCurrentPage - 3 ||
                  page === revenueCurrentPage + 3
                ) {
                  return <span key={page} className="px-2 text-gray-500">...</span>
                }
                return null
              })}
              <button
                onClick={() => setRevenueCurrentPage(prev => Math.min(revenueTotalPages, prev + 1))}
                disabled={revenueCurrentPage === revenueTotalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                다음
              </button>
            </div>
          </div>
        )}
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="lg:hidden p-4 space-y-3">
          {sortedRevenues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedPeriod ? `${selectedPeriod} 기간의 매출 데이터가 없습니다.` : '매출 데이터가 없습니다.'}
            </div>
          ) : (
            paginatedRevenues.map((revenue) => {
              const revenueReceipts = receipts.filter(r => r.revenue_id === revenue.id)
              const totalReceived = revenueReceipts.reduce((sum, r) => sum + r.amount, 0)
              const unpaid = revenue.amount - totalReceived
              
              let revenueStatus: 'unregistered' | 'unpaid' | 'partial' | 'paid' | 'no_revenue'
              if (revenue.amount === 0) {
                revenueStatus = 'no_revenue'
              } else if (totalReceived === 0) {
                revenueStatus = 'unregistered'
              } else if (unpaid === 0) {
                revenueStatus = 'paid'
              } else {
                revenueStatus = 'partial'
              }

              return (
                <div
                  key={revenue.id}
                  className={`bg-white rounded-xl shadow-md border-2 p-4 transition-all duration-200 ${
                    revenueStatus === 'unregistered' ? 'border-orange-200 bg-orange-50/50' :
                    revenueStatus === 'partial' ? 'border-yellow-200 bg-yellow-50/50' :
                    revenueStatus === 'paid' ? 'border-green-200 bg-green-50/50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {(revenue as any).stores?.name || '-'}
                      </h3>
                      <p className="text-sm text-gray-600">{revenue.service_period}</p>
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(revenueStatus)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-blue-50/50 rounded-lg p-2">
                      <p className="text-xs text-gray-600 mb-1">청구 금액</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(revenue.amount)}</p>
                    </div>
                    <div className="bg-gray-50/50 rounded-lg p-2">
                      <p className="text-xs text-gray-600 mb-1">납기일</p>
                      <p className="text-sm font-semibold text-gray-900">{revenue.due_date.split('T')[0]}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditRevenue(revenue)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteRevenue(revenue.id)}
                      className="flex-1 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* 모바일 페이지네이션 */}
          {revenueTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                {revenueStartIndex + 1} - {Math.min(revenueEndIndex, sortedRevenues.length)} / {sortedRevenues.length}건
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRevenueCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={revenueCurrentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  이전
                </button>
                <button
                  onClick={() => setRevenueCurrentPage(prev => Math.min(revenueTotalPages, prev + 1))}
                  disabled={revenueCurrentPage === revenueTotalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
