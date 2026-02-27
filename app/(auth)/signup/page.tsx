'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [companyName, setCompanyName] = useState('')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailValidation, setEmailValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid'
    message: string
  }>({ status: 'idle', message: '' })
  const router = useRouter()

  // 이메일 중복 확인 (디바운스)
  useEffect(() => {
    if (!email || email.trim().length === 0) {
      setEmailValidation({ status: 'idle', message: '' })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setEmailValidation({ status: 'invalid', message: '올바른 이메일 형식이 아닙니다.' })
      return
    }

    const timer = setTimeout(async () => {
      setEmailValidation({ status: 'validating', message: '이메일을 확인 중...' })

      try {
        const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email.trim())}`)
        const data = await response.json()

        if (response.ok && data.available) {
          setEmailValidation({
            status: 'valid',
            message: '사용 가능한 이메일입니다.',
          })
        } else {
          setEmailValidation({
            status: 'invalid',
            message: data.error || data.message || '이미 가입된 이메일입니다.',
          })
        }
      } catch {
        setEmailValidation({
          status: 'invalid',
          message: '이메일 확인 중 오류가 발생했습니다.',
        })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [email])

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

    // 이메일 중복 확인 상태
    if (emailValidation.status !== 'valid') {
      setError('사용 가능한 이메일을 입력해주세요.')
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
          company_name: companyName.trim(),
          business_registration_number: businessRegistrationNumber.trim() || null,
          name: name.trim(),
          email: email.trim(),
          password: password,
          phone: phone.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.')
      }

      // 업체관리자 가입은 승인 대기 페이지로 이동
      router.push('/signup/pending')
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || '회원가입 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">업체관리자 회원가입</h1>
        <p className="text-sm text-center text-gray-600 mb-6">
          직원/프렌차이즈/점주 계정은 가입 후 관리자 화면에서 직접 등록합니다.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              회사명 <span className="text-red-500">*</span>
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="회사명을 입력하세요"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="organization"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-gray-700">
              사업자등록번호
            </label>
            <input
              id="businessRegistrationNumber"
              type="text"
              value={businessRegistrationNumber}
              onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
              placeholder="예: 123-45-67890"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              담당자 이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="담당자 이름을 입력하세요"
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
              className={`w-full px-4 py-3 border-2 rounded-md focus:outline-none focus:ring-2 ${
                emailValidation.status === 'valid'
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-200'
                  : emailValidation.status === 'invalid'
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
              autoComplete="email"
            />
            {emailValidation.message && (
              <p
                className={`text-sm ${
                  emailValidation.status === 'valid'
                    ? 'text-green-600'
                    : emailValidation.status === 'invalid'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {emailValidation.message}
              </p>
            )}
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || emailValidation.status !== 'valid'}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-base"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600 pt-2">
            <p className="mb-2">
              ℹ️ 가입 신청 후 시스템 관리자 승인이 필요합니다.
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


