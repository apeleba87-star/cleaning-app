'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/Toast'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { parseCurrencyNumber } from '@/lib/utils/currency'

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

interface QuickExpenseFormProps {
  onSuccess?: () => void
}

export default function QuickExpenseForm({ onSuccess }: QuickExpenseFormProps) {
  const { showToast, ToastContainer } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quickDate, setQuickDate] = useState(new Date().toISOString().slice(0, 10))
  const [quickCategory, setQuickCategory] = useState('')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickMemo, setQuickMemo] = useState('')
  const [quickStoreId, setQuickStoreId] = useState<string>('')
  const [quickStoreCustom, setQuickStoreCustom] = useState<string>('')
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadStores()
  }, [])

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

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!quickDate || !quickCategory || !quickAmount) {
      showToast('날짜, 카테고리, 금액을 모두 입력해주세요.', 'error')
      return
    }

    // 낙관적 업데이트: 즉시 폼 초기화하여 연속 등록 가능
    const formData = {
      date: quickDate,
      category: quickCategory,
      amount: parseCurrencyNumber(quickAmount),
      memo: quickMemo.trim(),
      storeId: (quickStoreId && quickStoreId !== '__custom__' && quickStoreId.trim() !== '') ? quickStoreId : null,
      storeCustom: quickStoreCustom.trim(),
    }

    // 직접 입력한 매장명이 있으면 memo에 포함
    let finalMemo = formData.memo
    if (formData.storeCustom) {
      finalMemo = `[${formData.storeCustom}] ${finalMemo}`.trim()
    }

    // 폼 즉시 초기화 (낙관적 업데이트)
    setQuickDate(new Date().toISOString().slice(0, 10))
    setQuickCategory('')
    setQuickAmount('')
    setQuickMemo('')
    setQuickStoreId('')
    setQuickStoreCustom('')

    // 백그라운드에서 API 호출
    setSubmitting(true)
    
    try {
      const response = await fetch('/api/business/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          category: formData.category,
          amount: formData.amount,
          memo: finalMemo || null,
          store_id: formData.storeId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '지출 등록 실패')
      }

      // 성공 시 토스트만 표시 (새로고침 없음)
      showToast('지출이 등록되었습니다.', 'success')
      
      // 부분 업데이트: 재무 요약만 업데이트 (전체 새로고침 없음)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      // 실패 시 롤백: 폼 데이터 복원
      setQuickDate(formData.date)
      setQuickCategory(formData.category)
      setQuickAmount(formData.amount.toString())
      setQuickMemo(formData.memo)
      setQuickStoreId(formData.storeId || '')
      setQuickStoreCustom(formData.storeCustom)
      
      showToast(err.message || '지출 등록 중 오류가 발생했습니다.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <div className="bg-orange-50 rounded-lg border-l-4 border-orange-500 mb-6">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">빠른 지출 등록</h3>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-orange-600 hover:text-orange-800 font-medium"
            >
              {isExpanded ? '접기 ▲' : '펼치기 ▼'}
            </button>
          </div>
          
          {isExpanded && (
            <form onSubmit={handleQuickSubmit} className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
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
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <CurrencyInput
              value={quickAmount}
              onChange={setQuickAmount}
              placeholder="금액"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              required
              disabled={submitting}
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
                    setQuickStoreCustom('')
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
          )}
        </div>
      </div>
    </>
  )
}

