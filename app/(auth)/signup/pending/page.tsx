'use client'

import Link from 'next/link'
import { KAKAO_CHAT_URL } from '@/lib/constants'

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
            시스템 관리자 승인 후 로그인하실 수 있습니다.
          </p>
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3 text-left">
            랜딩페이지의 <span className="font-semibold">카카오톡 상담하기</span>로 승인 요청을 남기면
            더 빠르게 승인 처리가 가능합니다.
          </div>
        </div>

        <div className="space-y-2">
          <a
            href={KAKAO_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full px-4 py-3 bg-yellow-400 text-black rounded-md hover:bg-yellow-300 transition-colors font-medium"
          >
            카카오톡 상담하기
          </a>
          <Link
            href="/"
            className="inline-block w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            랜딩페이지로 이동
          </Link>
          <Link
            href="/login"
            className="inline-block w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            로그인 페이지로
          </Link>
        </div>
      </div>
    </div>
  )
}


