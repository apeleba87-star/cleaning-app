'use client'

import Link from 'next/link'

export default function SignupPendingPage() {
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">가입 신청이 완료되었습니다</h1>
        </div>

        <div className="space-y-4 text-gray-700 mb-6">
          <p>가입 신청이 접수되었습니다.</p>
          <p className="text-sm">
            관리자 승인 후 로그인하실 수 있습니다.
          </p>
          <p className="text-sm text-gray-500">
            승인 완료 시 이메일로 알림이 발송될 수 있습니다.
          </p>
        </div>

        <Link
          href="/login"
          className="inline-block w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          로그인 페이지로
        </Link>
      </div>
    </div>
  )
}


