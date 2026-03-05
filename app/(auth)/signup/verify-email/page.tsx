'use client'

import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">이메일을 확인해 주세요</h1>
        </div>

        <div className="space-y-4 text-gray-700 mb-6">
          <p>가입하신 이메일 주소로 인증 메일을 보냈습니다.</p>
          <p className="text-sm">
            메일의 링크를 클릭해 인증을 완료한 뒤 로그인하시면 가입이 완료됩니다.
          </p>
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3 text-left">
            로그인 시 <span className="font-semibold">1주일 무료 체험</span>이 자동으로 적용되며,
            기간 종료 후에는 플랜 변경이 필요합니다.
          </div>
        </div>

        <div className="space-y-2">
          <Link
            href="/login"
            className="inline-block w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            로그인 페이지로
          </Link>
          <Link
            href="/"
            className="inline-block w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            랜딩페이지로 이동
          </Link>
        </div>
      </div>
    </div>
  )
}
