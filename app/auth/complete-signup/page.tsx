'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CompleteSignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/auth/complete-signup', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(data?.error || '회원가입 완료 처리에 실패했습니다.')
          setLoading(false)
          return
        }
        const role = data?.role === 'business_owner' ? 'business_owner' : null
        router.refresh()
        window.location.href = role === 'business_owner' ? '/business/dashboard' : '/'
      } catch {
        if (!cancelled) {
          setError('요청 처리 중 오류가 발생했습니다.')
          setLoading(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="animate-pulse text-gray-600">회원가입을 완료하는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-xl font-bold mb-4">가입 완료 실패</h1>
        <p className="text-gray-700 mb-6">{error}</p>
        <div className="space-y-2">
          <Link
            href="/login"
            className="inline-block w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="inline-block w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
          >
            다시 가입하기
          </Link>
        </div>
      </div>
    </div>
  )
}
