'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [phone, setPhone] = useState('')
  const [signupCode, setSignupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeValidation, setCodeValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid'
    message: string
    companyName?: string
  }>({ status: 'idle', message: '' })
  const router = useRouter()

  // 코드 검증 (실시간)
  const validateCode = async (code: string) => {
    if (!code || code.trim().length === 0) {
      setCodeValidation({ status: 'idle', message: '' })
      return
    }

    setCodeValidation({ status: 'validating', message: '코드를 확인 중...' })

    try {
      const response = await fetch(`/api/auth/validate-code?code=${encodeURIComponent(code.trim())}`)
      const data = await response.json()

      if (response.ok && data.valid) {
        setCodeValidation({
          status: 'valid',
          message: `✓ 올바른 코드입니다`,
          companyName: data.companyName,
        })
      } else {
        setCodeValidation({
          status: 'invalid',
          message: data.error || '올바른 코드를 입력해주세요',
        })
      }
    } catch (err) {
      setCodeValidation({
        status: 'invalid',
        message: '코드 확인 중 오류가 발생했습니다',
      })
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSignupCode(value)
    validateCode(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 비밀번호 확인
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    // 코드 검증 상태 확인
    if (codeValidation.status !== 'valid') {
      setError('올바른 업체 코드를 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password,
          phone: phone.trim() || null,
          signup_code: signupCode.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.')
      }

      // 성공 시 안내 페이지로 이동
      if (data.requires_approval) {
        router.push('/signup/pending')
      } else {
        router.push('/signup/success')
      }
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || '회원가입 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">회원가입</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="이메일을 입력하세요"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="비밀번호를 입력하세요 (최소 6자)"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              placeholder="비밀번호를 다시 입력하세요"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              전화번호
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="signupCode" className="block text-sm font-medium text-gray-700">
              업체 코드 <span className="text-red-500">*</span>
            </label>
            <input
              id="signupCode"
              type="text"
              value={signupCode}
              onChange={handleCodeChange}
              required
              placeholder="소속 업체에서 받은 코드를 입력하세요"
              className={`w-full px-4 py-3 border-2 rounded-md focus:outline-none focus:ring-2 ${
                codeValidation.status === 'valid'
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-200'
                  : codeValidation.status === 'invalid'
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
            />
            {codeValidation.message && (
              <p
                className={`text-sm ${
                  codeValidation.status === 'valid'
                    ? 'text-green-600'
                    : codeValidation.status === 'invalid'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {codeValidation.message}
                {codeValidation.companyName && (
                  <span className="block mt-1">→ {codeValidation.companyName}</span>
                )}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              ℹ️ 소속 업체에서 받은 코드를 입력하세요
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || codeValidation.status !== 'valid'}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-base"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600 pt-2">
            <p className="mb-2">
              ℹ️ 가입 신청 후 관리자 승인이 필요할 수 있습니다.
            </p>
            <Link href="/login" className="text-blue-600 hover:text-blue-800">
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}


