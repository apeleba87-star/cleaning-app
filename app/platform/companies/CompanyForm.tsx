'use client'

import { useState, FormEvent } from 'react'
import { Company } from '@/types/db'

interface CompanyWithStats extends Company {
  storeCount?: number
  userCount?: number
}

interface CompanyFormProps {
  company: CompanyWithStats | null
  onSuccess: (company: Company) => void
  onCancel: () => void
}

export default function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const [companyId, setCompanyId] = useState(company?.id || '')
  const [name, setName] = useState(company?.name || '')
  const [address, setAddress] = useState(company?.address || '')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(
    company?.business_registration_number || ''
  )
  const [subscriptionPlan, setSubscriptionPlan] = useState<'free' | 'basic' | 'premium'>(
    (company?.subscription_plan as 'free' | 'basic' | 'premium') || 'free'
  )
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'suspended' | 'cancelled'>(
    (company?.subscription_status as 'active' | 'suspended' | 'cancelled') || 'active'
  )
  const [trialEndsAt, setTrialEndsAt] = useState(
    company?.trial_ends_at ? company.trial_ends_at.split('T')[0] : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = company
        ? `/api/platform/companies/${company.id}`
        : '/api/platform/companies'
      const method = company ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: companyId.trim() || undefined,
          name: name.trim(),
          address: address.trim() || null,
          business_registration_number: businessRegistrationNumber.trim() || null,
          subscription_plan: subscriptionPlan,
          subscription_status: subscriptionStatus,
          trial_ends_at: trialEndsAt || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.')
      }

      onSuccess(data.company)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        {company ? '회사 정보 수정' : '새 회사 추가'}
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!company && (
          <div>
            <label htmlFor="company_id" className="block text-sm font-medium text-gray-700 mb-1">
              회사 ID (UUID)
            </label>
            <input
              id="company_id"
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="UUID 형식 (예: 550e8400-e29b-41d4-a716-446655440000) - 비워두면 자동 생성"
            />
            <p className="mt-1 text-xs text-gray-500">
              UUID 형식으로 입력하세요. 비워두면 자동으로 생성됩니다.
            </p>
          </div>
        )}

        {company && (
          <div>
            <label htmlFor="company_id_display" className="block text-sm font-medium text-gray-700 mb-1">
              회사 ID
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="company_id_display"
                type="text"
                value={company.id}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(company.id)
                  alert('회사 ID가 복사되었습니다.')
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                복사
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              회사 ID는 수정할 수 없습니다.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            회사명 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="회사명을 입력하세요"
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
            placeholder="회사 주소를 입력하세요"
          />
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="subscription_plan" className="block text-sm font-medium text-gray-700 mb-1">
              요금제 <span className="text-red-500">*</span>
            </label>
            <select
              id="subscription_plan"
              value={subscriptionPlan}
              onChange={(e) => setSubscriptionPlan(e.target.value as 'free' | 'basic' | 'premium')}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="free">무료</option>
              <option value="basic">베이직</option>
              <option value="premium">프리미엄</option>
            </select>
          </div>

          <div>
            <label htmlFor="subscription_status" className="block text-sm font-medium text-gray-700 mb-1">
              상태 <span className="text-red-500">*</span>
            </label>
            <select
              id="subscription_status"
              value={subscriptionStatus}
              onChange={(e) => setSubscriptionStatus(e.target.value as 'active' | 'suspended' | 'cancelled')}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">활성</option>
              <option value="suspended">중지</option>
              <option value="cancelled">취소</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="trial_ends_at" className="block text-sm font-medium text-gray-700 mb-1">
            무료체험 종료일
          </label>
          <input
            id="trial_ends_at"
            type="date"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

