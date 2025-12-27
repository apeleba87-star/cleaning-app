'use client'

import { useState, FormEvent } from 'react'
import { Franchise } from '@/types/db'

interface FranchiseFormProps {
  franchise: Franchise | null
  companyId: string
  onSuccess: (franchise: Franchise) => void
  onCancel: () => void
}

export default function FranchiseForm({ franchise, companyId, onSuccess, onCancel }: FranchiseFormProps) {
  const [name, setName] = useState(franchise?.name || '')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(
    franchise?.business_registration_number || ''
  )
  const [address, setAddress] = useState(franchise?.address || '')
  const [phone, setPhone] = useState(franchise?.phone || '')
  const [email, setEmail] = useState(franchise?.email || '')
  const [managerName, setManagerName] = useState(franchise?.manager_name || '')
  const [contractStartDate, setContractStartDate] = useState(
    franchise?.contract_start_date ? franchise.contract_start_date.split('T')[0] : ''
  )
  const [contractEndDate, setContractEndDate] = useState(
    franchise?.contract_end_date ? franchise.contract_end_date.split('T')[0] : ''
  )
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>(
    franchise?.status || 'active'
  )
  const [notes, setNotes] = useState(franchise?.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = franchise
        ? `/api/business/franchises/${franchise.id}`
        : '/api/business/franchises'
      const method = franchise ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          name: name.trim(),
          business_registration_number: businessRegistrationNumber.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          manager_name: managerName.trim() || null,
          contract_start_date: contractStartDate || null,
          contract_end_date: contractEndDate || null,
          status,
          notes: notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || (franchise ? '수정에 실패했습니다.' : '등록에 실패했습니다.'))
      }

      onSuccess(data.franchise)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        {franchise ? '프렌차이즈 정보 수정' : '새 프렌차이즈 등록'}
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            프렌차이즈명 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="프렌차이즈명을 입력하세요"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="business_registration_number" className="block text-sm font-medium text-gray-700 mb-1">
              사업자등록번호
            </label>
            <input
              id="business_registration_number"
              type="text"
              value={businessRegistrationNumber}
              onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="사업자등록번호를 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              상태 <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'suspended')}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="suspended">정지</option>
            </select>
          </div>
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

        <div className="grid grid-cols-2 gap-4">
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이메일을 입력하세요"
            />
          </div>
        </div>

        <div>
          <label htmlFor="manager_name" className="block text-sm font-medium text-gray-700 mb-1">
            담당자명
          </label>
          <input
            id="manager_name"
            type="text"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="담당자명을 입력하세요"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contract_start_date" className="block text-sm font-medium text-gray-700 mb-1">
              계약 시작일
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
              계약 종료일
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
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            비고
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="비고를 입력하세요"
          />
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









