'use client'

import { useState, useEffect } from 'react'

interface Expense {
  id: string
  date: string
  category: string
  amount: number
  memo: string | null
  store_id: string | null
  stores: {
    id: string
    name: string
  } | null
}

interface ExpenseDetailSectionProps {
  period: string
  onRefresh: () => void
}

// 기본 카테고리 목록
const DEFAULT_CATEGORIES = [
  '소모품',
  '약품비',
  '주유비',
  '식대',
  '임대료',
  '통신비',
  '소프트웨어·구독비',
  '유지·관리비',
  '비품·자산구입',
  '물류·운송비',
  '마케팅·광고비',
  '세무·행정비',
  '금융비용',
  '보험료',
  '기타',
]

export default function ExpenseDetailSection({ period, onRefresh }: ExpenseDetailSectionProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)
  const [statsTab, setStatsTab] = useState<'category' | 'store'>('category') // 통계 탭 상태

  // 빠른 입력 폼 상태
  const [quickDate, setQuickDate] = useState(new Date().toISOString().slice(0, 10))
  const [quickCategory, setQuickCategory] = useState('')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickMemo, setQuickMemo] = useState('')
  const [quickStoreId, setQuickStoreId] = useState<string>('')
  const [quickStoreCustom, setQuickStoreCustom] = useState<string>('') // 직접 입력 매장명

  // 수정 모달 상태
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [editStoreId, setEditStoreId] = useState<string>('')
  const [editStoreCustom, setEditStoreCustom] = useState<string>('') // 직접 입력 매장명

  // 매장 목록
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadExpenses()
    loadStores()
  }, [period])

  const loadStores = async () => {
    try {
      const response = await fetch('/api/business/stores')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStores(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading stores:', error)
    }
  }

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/expenses?period=${period}`)
      if (!response.ok) {
        throw new Error('지출 데이터를 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success) {
        setExpenses(data.data || [])
      }
    } catch (error: any) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!quickDate || !quickCategory || !quickAmount) {
      alert('날짜, 카테고리, 금액을 모두 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)
      
      // 직접 입력한 매장명이 있으면 memo에 포함
      let finalMemo = quickMemo.trim()
      if (quickStoreCustom.trim()) {
        finalMemo = `[${quickStoreCustom.trim()}] ${finalMemo}`.trim()
      }
      
      const response = await fetch('/api/business/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: quickDate,
          category: quickCategory,
          amount: parseFloat(quickAmount),
          memo: finalMemo || null,
          store_id: quickStoreId || null, // 직접 입력 시에는 null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '지출 등록 실패')
      }

      // 폼 초기화
      setQuickDate(new Date().toISOString().slice(0, 10))
      setQuickCategory('')
      setQuickAmount('')
      setQuickMemo('')
      setQuickStoreId('')
      setQuickStoreCustom('')

      loadExpenses()
      onRefresh()
      alert('지출이 등록되었습니다.')
    } catch (err: any) {
      alert(err.message || '지출 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense)
    setEditDate(expense.date)
    setEditCategory(expense.category)
    setEditAmount(expense.amount.toString())
    
    // memo에서 직접 입력 매장명 추출 (형식: [매장명] 메모)
    let memo = expense.memo || ''
    let customStore = ''
    if (memo.startsWith('[')) {
      const match = memo.match(/^\[([^\]]+)\]\s*(.*)$/)
      if (match) {
        customStore = match[1]
        memo = match[2]
      }
    }
    
    setEditMemo(memo)
    // 직접 입력 매장명이 있으면 __custom__으로 설정, 없으면 기존 store_id 사용
    if (customStore) {
      setEditStoreId('__custom__')
      setEditStoreCustom(customStore)
    } else {
      setEditStoreId(expense.store_id || '')
      setEditStoreCustom('')
    }
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExpense) return

    if (!editDate || !editCategory || !editAmount) {
      alert('날짜, 카테고리, 금액을 모두 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)
      
      // 직접 입력한 매장명이 있으면 memo에 포함
      let finalMemo = editMemo.trim()
      if (editStoreCustom.trim()) {
        finalMemo = `[${editStoreCustom.trim()}] ${finalMemo}`.trim()
      }
      
      const response = await fetch(`/api/business/expenses/${selectedExpense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editDate,
          category: editCategory,
          amount: parseFloat(editAmount),
          memo: finalMemo || null,
          store_id: editStoreId || null, // 직접 입력 시에는 null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '지출 수정 실패')
      }

      setShowEditModal(false)
      setSelectedExpense(null)
      setEditStoreId('')
      setEditStoreCustom('')
      loadExpenses()
      onRefresh()
      alert('지출이 수정되었습니다.')
    } catch (err: any) {
      alert(err.message || '지출 수정 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`이 지출 항목을 삭제하시겠습니까?`)) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/business/expenses/${expense.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '지출 삭제 실패')
      }

      loadExpenses()
      onRefresh()
      alert('지출이 삭제되었습니다.')
    } catch (err: any) {
      alert(err.message || '지출 삭제 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 카테고리별 집계
  const categoryStats = expenses.reduce((acc, expense) => {
    const cat = expense.category
    if (!acc[cat]) {
      acc[cat] = { count: 0, total: 0 }
    }
    acc[cat].count++
    acc[cat].total += expense.amount
    return acc
  }, {} as Record<string, { count: number; total: number }>)

  // 매장별 집계
  const storeStats = expenses.reduce((acc, expense) => {
    // 매장명 추출: stores 테이블의 name 또는 memo에서 직접 입력한 매장명
    let storeName = expense.stores?.name
    if (!storeName && expense.memo) {
      const match = expense.memo.match(/^\[([^\]]+)\]/)
      if (match) {
        storeName = match[1]
      }
    }
    storeName = storeName || '미지정'
    
    if (!acc[storeName]) {
      acc[storeName] = { count: 0, total: 0 }
    }
    acc[storeName].count++
    acc[storeName].total += expense.amount
    return acc
  }, {} as Record<string, { count: number; total: number }>)

  // 필터링된 지출 목록
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.memo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.stores?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // 총 지출액
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  // 일평균 지출액
  const daysInMonth = new Date(new Date(period + '-01').getFullYear(), new Date(period + '-01').getMonth() + 1, 0).getDate()
  const today = new Date().getDate()
  const daysPassed = Math.min(today, daysInMonth)
  const dailyAverage = daysPassed > 0 ? totalAmount / daysPassed : 0

  // 모든 카테고리 목록 (기본 순서 유지 + 새로운 카테고리는 뒤에 추가)
  const usedCategories = expenses.map((e) => e.category)
  const newCategories = usedCategories.filter(cat => !DEFAULT_CATEGORIES.includes(cat))
  const allCategories = [...DEFAULT_CATEGORIES, ...newCategories]

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">지출 데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      {/* 빠른 입력 폼 */}
      <div className="bg-orange-50 rounded-lg p-4 mb-6 border-l-4 border-orange-500">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">빠른 지출 등록</h3>
        <form onSubmit={handleQuickSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="date"
            value={quickDate}
            onChange={(e) => setQuickDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            required
            disabled={submitting}
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            required
            disabled={submitting}
          >
            <option value="">카테고리 선택</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={quickAmount}
            onChange={(e) => setQuickAmount(e.target.value)}
            placeholder="금액"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            required
            disabled={submitting}
            min="0"
            step="1"
          />
          <input
            type="text"
            value={quickMemo}
            onChange={(e) => setQuickMemo(e.target.value)}
            placeholder="메모 (선택)"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            disabled={submitting}
          />
          {quickStoreId === '__custom__' ? (
            <div className="relative">
              <input
                type="text"
                value={quickStoreCustom}
                onChange={(e) => setQuickStoreCustom(e.target.value)}
                placeholder="매장명 직접 입력"
                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => {
                  setQuickStoreId('')
                  setQuickStoreCustom('')
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={submitting}
                title="선택으로 돌아가기"
              >
                선택
              </button>
            </div>
          ) : (
            <select
              value={quickStoreId}
              onChange={(e) => {
                setQuickStoreId(e.target.value)
                if (e.target.value !== '__custom__') {
                  setQuickStoreCustom('') // 드롭다운 선택 시 직접 입력 초기화
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              disabled={submitting}
            >
              <option value="">매장 선택 (선택)</option>
              <option value="__custom__">직접 입력</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            disabled={submitting}
          >
            {submitting ? '등록 중...' : '추가'}
          </button>
        </form>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <h3 className="text-sm font-medium text-gray-600 mb-1">총 지출</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-gray-500 mt-1">{filteredExpenses.length}건</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-600 mb-1">일평균 지출</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(dailyAverage)}</p>
          <p className="text-xs text-gray-500 mt-1">이번 달 기준</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-600 mb-1">카테고리 수</h3>
          <p className="text-2xl font-bold text-gray-900">{Object.keys(categoryStats).length}개</p>
          <p className="text-xs text-gray-500 mt-1">사용된 카테고리</p>
        </div>
      </div>

      {/* 카테고리별 / 매장별 통계 탭 */}
      <div className="mb-6">
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-4">
            <button
              onClick={() => setStatsTab('category')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                statsTab === 'category'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              카테고리별 지출
            </button>
            <button
              onClick={() => setStatsTab('store')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                statsTab === 'store'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              매장별 지출
            </button>
          </nav>
        </div>

        {/* 카테고리별 통계 */}
        {statsTab === 'category' && Object.keys(categoryStats).length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(categoryStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([category, stats]) => (
                  <div key={category} className="bg-white rounded p-3 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">{category}</div>
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(stats.total)}</div>
                    <div className="text-xs text-gray-400">{stats.count}건</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 매장별 통계 */}
        {statsTab === 'store' && Object.keys(storeStats).length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(storeStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([storeName, stats]) => (
                  <div key={storeName} className="bg-white rounded p-3 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">{storeName}</div>
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(stats.total)}</div>
                    <div className="text-xs text-gray-400">{stats.count}건</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 데이터가 없을 때 */}
        {statsTab === 'category' && Object.keys(categoryStats).length === 0 && (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
            카테고리별 지출 데이터가 없습니다.
          </div>
        )}

        {statsTab === 'store' && Object.keys(storeStats).length === 0 && (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
            매장별 지출 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* 필터 및 검색 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">지출 목록</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="검색 (메모, 매장, 카테고리)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
          >
            <option value="all">전체 카테고리</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 지출 목록 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                날짜
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매장
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
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  지출 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(expense.date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {expense.stores?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {expense.memo || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submitting}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(expense)}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submitting}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 수정 모달 */}
      {showEditModal && selectedExpense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">지출 수정</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700 mb-1">
                  날짜
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리
                </label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={submitting}
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700 mb-1">
                  금액
                </label>
                <input
                  id="edit-amount"
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={submitting}
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <label htmlFor="edit-store" className="block text-sm font-medium text-gray-700 mb-1">
                  매장 (선택)
                </label>
                {editStoreId === '__custom__' ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={editStoreCustom}
                      onChange={(e) => setEditStoreCustom(e.target.value)}
                      placeholder="매장명 직접 입력"
                      className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditStoreId('')
                        setEditStoreCustom('')
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      disabled={submitting}
                      title="선택으로 돌아가기"
                    >
                      선택
                    </button>
                  </div>
                ) : (
                  <select
                    id="edit-store"
                    value={editStoreId}
                    onChange={(e) => {
                      setEditStoreId(e.target.value)
                      if (e.target.value !== '__custom__') {
                        setEditStoreCustom('') // 드롭다운 선택 시 직접 입력 초기화
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  >
                    <option value="">매장 선택 안함</option>
                    <option value="__custom__">직접 입력</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label htmlFor="edit-memo" className="block text-sm font-medium text-gray-700 mb-1">
                  메모 (선택사항)
                </label>
                <input
                  id="edit-memo"
                  type="text"
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedExpense(null)
                    setEditStoreId('')
                    setEditStoreCustom('')
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
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

