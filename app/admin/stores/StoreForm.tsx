'use client'

import { useState, FormEvent } from 'react'
import { Store } from '@/types/db'

interface StoreFormProps {
  store: Store | null
  onSuccess: (store: Store) => void
  onCancel: () => void
}

export default function StoreForm({ store, onSuccess, onCancel }: StoreFormProps) {
  const [headOfficeName, setHeadOfficeName] = useState(store?.head_office_name || '개인')
  const [parentStoreName, setParentStoreName] = useState(store?.parent_store_name || '')
  const [name, setName] = useState(store?.name || '')
  const [address, setAddress] = useState(store?.address || '')
  const [managementDays, setManagementDays] = useState(store?.management_days || '')
  const [serviceAmount, setServiceAmount] = useState(store?.service_amount?.toString() || '')
  const [category, setCategory] = useState(store?.category || '')
  const [contractStartDate, setContractStartDate] = useState(
    store?.contract_start_date ? store.contract_start_date.split('T')[0] : ''
  )
  const [contractEndDate, setContractEndDate] = useState(
    store?.contract_end_date ? store.contract_end_date.split('T')[0] : ''
  )
  const [serviceActive, setServiceActive] = useState(store?.service_active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = store
        ? `/api/admin/stores/${store.id}`
        : '/api/admin/stores'
      const method = store ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          head_office_name: headOfficeName.trim() || '개인',
          parent_store_name: parentStoreName.trim() || null,
          name: name.trim(),
          address: address.trim() || null,
          management_days: managementDays.trim() || null,
          service_amount: serviceAmount ? parseFloat(serviceAmount) : null,
          category: category.trim() || null,
          contract_start_date: contractStartDate || null,
          contract_end_date: contractEndDate || null,
          service_active: serviceActive,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.')
      }

      onSuccess(data.store)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        {store ? '매장 수정' : '새 매장 추가'}
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="head_office_name" className="block text-sm font-medium text-gray-700 mb-1">
            본사명 <span className="text-red-500">*</span>
          </label>
          <input
            id="head_office_name"
            type="text"
            value={headOfficeName}
            onChange={(e) => setHeadOfficeName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="본사명 (없는 경우 '개인')"
          />
          <p className="mt-1 text-xs text-gray-500">없는 경우 "개인"으로 입력하세요</p>
        </div>

        <div>
          <label htmlFor="parent_store_name" className="block text-sm font-medium text-gray-700 mb-1">
            상위매장명
          </label>
          <input
            id="parent_store_name"
            type="text"
            value={parentStoreName}
            onChange={(e) => setParentStoreName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 청주1, 청주3"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            매장명 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="매장명을 입력하세요"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            주소
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="주소를 입력하세요"
          />
        </div>

        <div>
          <label htmlFor="management_days" className="block text-sm font-medium text-gray-700 mb-1">
            관리 요일
          </label>
          <input
            id="management_days"
            type="text"
            value={managementDays}
            onChange={(e) => setManagementDays(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 월,수,금 또는 월수금"
          />
          <p className="mt-1 text-xs text-gray-500">요일을 입력하세요 (예: 월,수,금)</p>
        </div>

        <div>
          <label htmlFor="service_amount" className="block text-sm font-medium text-gray-700 mb-1">
            서비스 금액
          </label>
          <input
            id="service_amount"
            type="number"
            step="0.01"
            value={serviceAmount}
            onChange={(e) => setServiceAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="서비스 금액을 입력하세요"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            카테고리
          </label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 무인매장, 서울형키즈카페"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contract_start_date" className="block text-sm font-medium text-gray-700 mb-1">
              계약시작일
            </label>
            <input
              id="contract_start_date"
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="contract_end_date" className="block text-sm font-medium text-gray-700 mb-1">
              계약종료일
            </label>
            <input
              id="contract_end_date"
              type="date"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={serviceActive}
              onChange={(e) => setServiceActive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">서비스 진행 여부</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

