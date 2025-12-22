'use client'

import { useState, FormEvent } from 'react'
import { UserRole, Store } from '@/types/db'

// CreateUserForm에서 사용하는 최소 필드 타입
type CreateUserFormStore = Pick<Store, 'id' | 'name'>

interface CreateUserFormProps {
  stores: CreateUserFormStore[]
  onSuccess: () => void
  onCancel: () => void
}

export default function CreateUserForm({ stores, onSuccess, onCancel }: CreateUserFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('staff')
  const [phone, setPhone] = useState('')
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [employmentContractDate, setEmploymentContractDate] = useState('')
  const [salaryDate, setSalaryDate] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [employmentActive, setEmploymentActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
          role,
          phone: phone.trim() || null,
          employment_contract_date: employmentContractDate || null,
          salary_date: salaryDate ? parseInt(salaryDate) : null,
          salary_amount: salaryAmount ? parseFloat(salaryAmount) : null,
          employment_active: employmentActive,
          store_ids: selectedStoreIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '사용자 추가에 실패했습니다.')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">새 사용자 추가</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일 <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이메일을 입력하세요"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="비밀번호를 입력하세요 (최소 6자)"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이름을 입력하세요"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            역할 <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="staff">직원</option>
            <option value="manager">매니저</option>
            <option value="admin">관리자</option>
          </select>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            전화번호
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="전화번호를 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배정 매장
          </label>
          <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
            {stores.length === 0 ? (
              <p className="text-gray-500 text-sm">등록된 매장이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {stores.map((store) => (
                  <label
                    key={store.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStoreIds.includes(store.id)}
                      onChange={() => handleToggleStore(store.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{store.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {selectedStoreIds.length}개 매장이 선택되었습니다.
          </p>
        </div>

        <div>
          <label htmlFor="employment_contract_date" className="block text-sm font-medium text-gray-700 mb-1">
            근로계약일
          </label>
          <input
            id="employment_contract_date"
            type="date"
            value={employmentContractDate}
            onChange={(e) => setEmploymentContractDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="salary_date" className="block text-sm font-medium text-gray-700 mb-1">
              급여일
            </label>
            <input
              id="salary_date"
              type="number"
              min="1"
              max="31"
              value={salaryDate}
              onChange={(e) => setSalaryDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1-31"
            />
            <p className="mt-1 text-xs text-gray-500">월 급여일 (1-31)</p>
          </div>

          <div>
            <label htmlFor="salary_amount" className="block text-sm font-medium text-gray-700 mb-1">
              급여액
            </label>
            <input
              id="salary_amount"
              type="number"
              step="0.01"
              value={salaryAmount}
              onChange={(e) => setSalaryAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="급여액을 입력하세요"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={employmentActive}
              onChange={(e) => setEmploymentActive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">근무 여부</span>
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
            {loading ? '추가 중...' : '추가'}
          </button>
        </div>
      </form>
    </div>
  )
}

