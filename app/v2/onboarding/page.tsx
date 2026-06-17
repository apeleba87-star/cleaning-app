'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v2Fetch } from '@/lib/v2/client'

export default function V2OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [regionSido, setRegionSido] = useState('')
  const [regionSigungu, setRegionSigungu] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await v2Fetch('/api/v2/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          name,
          company_name: companyName,
          region_sido: regionSido,
          region_sigungu: regionSigungu,
          role: 'business_owner',
        }),
      })
      router.push('/v2/manage')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">무플 V2 시작하기</h1>
      <p className="text-gray-600 text-sm mb-6">
        로그인 정보는 기존과 동일합니다. 운영 데이터는 V2에서 새로 시작합니다.
      </p>
      <form onSubmit={submit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <label className="block text-sm font-medium mb-1">이름</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">회사명</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">시/도</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="서울"
              value={regionSido}
              onChange={(e) => setRegionSido(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">구/군</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="마포"
              value={regionSigungu}
              onChange={(e) => setRegionSigungu(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? '처리 중...' : 'V2 업체 등록'}
        </button>
      </form>
    </div>
  )
}
