'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // 환경 변수 확인
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Supabase 설정이 올바르지 않습니다. 환경 변수를 확인해주세요.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        
        // 에러 메시지를 한국어로 번역
        let errorMessage = '로그인에 실패했습니다.'
        if (error.message) {
          const errorMsg = error.message.toLowerCase()
          if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid credentials')) {
            errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
          } else if (errorMsg.includes('email not confirmed')) {
            errorMessage = '이메일 인증이 완료되지 않았습니다.'
          } else if (errorMsg.includes('too many requests')) {
            errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
          } else if (errorMsg.includes('user not found')) {
            errorMessage = '등록되지 않은 이메일입니다.'
          } else {
            errorMessage = error.message
          }
        }
        
        setError(errorMessage)
        setLoading(false)
      } else if (data.session) {
        // 승인 상태 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('approval_status, rejection_reason')
          .eq('id', data.session.user.id)
          .single()

        if (userError || !userData) {
          // 사용자 정보가 없는 경우 (일반적으로 발생하지 않음)
          console.error('User data error:', userError)
        } else {
          // 승인 상태 확인
          if (userData.approval_status === 'pending') {
            // 로그아웃 (승인 대기 중이면 세션 삭제)
            await supabase.auth.signOut()
            setError('가입 신청이 승인 대기 중입니다. 관리자 승인 후 로그인하실 수 있습니다.')
            setLoading(false)
            return
          }

          if (userData.approval_status === 'rejected') {
            // 로그아웃 (거절된 경우 세션 삭제)
            await supabase.auth.signOut()
            const reasonMessage = userData.rejection_reason
              ? ` 가입 신청이 거절되었습니다. 사유: ${userData.rejection_reason}`
              : ' 가입 신청이 거절되었습니다.'
            setError(reasonMessage)
            setLoading(false)
            return
          }
        }

        // 승인된 사용자는 로그인 성공
        // 세션이 생성되면 router.refresh()를 호출하여 서버 컴포넌트가 세션을 읽을 수 있도록 함
        router.refresh()
        // 잠시 대기 후 홈으로 이동
        await new Promise(resolve => setTimeout(resolve, 500))
        window.location.href = '/'
      } else {
        setError('로그인에 실패했습니다. 세션을 생성할 수 없습니다.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Login exception:', err)
      
      // 예외 에러 메시지를 한국어로 번역
      let errorMessage = '로그인 중 오류가 발생했습니다.'
      if (err.message) {
        const errorMsg = err.message.toLowerCase()
        if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid credentials')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center text-blue-600">무플(MUPL)</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">무인 현장 운영 관리 플랫폼</p>
        <h2 className="text-xl font-semibold mb-6 text-center">로그인</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일
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
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-base"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link href="/signup" className="text-blue-600 hover:text-blue-800">
            계정이 없으신가요? 회원가입
          </Link>
        </div>
      </div>
    </div>
  )
}

