'use client'

import { useState, FormEvent } from 'react'
import { Company } from '@/types/db'

interface CompanyFormProps {
  company: Company
}

export default function CompanyForm({ company }: CompanyFormProps) {
  const [name, setName] = useState(company.name)
  const [address, setAddress] = useState(company.address || '')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(
    company.business_registration_number || ''
  )
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/business/company/${company.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          business_registration_number: businessRegistrationNumber.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '수정에 실패했습니다.')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">회사 정보 설정</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-800 text-sm">회사 정보가 수정되었습니다.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            회사 ID
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={company.id}
              readOnly
              className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(company.id)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                } catch (_) {
                  setCopied(false)
                }
              }}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200"
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">API 연동 시 회사 구분용으로 사용됩니다.</p>
        </div>

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

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">요금제 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">현재 요금제:</span>
              <span className="font-medium">{company.subscription_plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">상태:</span>
              <span className="font-medium">{company.subscription_status}</span>
            </div>
            {company.trial_ends_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">무료체험 종료일:</span>
                <span className="font-medium">
                  {new Date(company.trial_ends_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            요금제 변경은 시스템 관리자에게 문의하세요.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
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

