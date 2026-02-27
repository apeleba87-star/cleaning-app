import { KAKAO_CHAT_URL } from '@/lib/constants'

export default function TrialExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">무료체험 기간이 종료되었습니다</h1>
          <p className="text-sm text-gray-600 mt-2">
            현재 계정은 무료체험 만료로 인해 기능이 비활성화되었습니다.
            플랜 변경은 시스템 관리자에게 문의해 주세요.
          </p>
        </div>

        <div className="space-y-2">
          <a
            href={KAKAO_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium"
          >
            결제 문의하기
          </a>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 font-medium"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
