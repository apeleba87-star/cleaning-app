import Link from 'next/link'

export default function BillingPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">결제 관리</h1>
        <a
          href="/platform/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-yellow-800">개발 예정 기능</h2>
        <ul className="space-y-2 text-sm text-yellow-700">
          <li>• 요금제 생성 및 가격 설정</li>
          <li>• 무료체험 기간 설정</li>
          <li>• 결제 실패 알림</li>
          <li>• 결제 내역 조회</li>
          <li>• 청구서 생성 및 발송</li>
        </ul>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">현재 요금제</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">무료</h3>
            <p className="text-2xl font-bold mb-2">₩0</p>
            <p className="text-sm text-gray-500">기본 기능 제공</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">베이직</h3>
            <p className="text-2xl font-bold mb-2">₩50,000</p>
            <p className="text-sm text-gray-500">월간</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">프리미엄</h3>
            <p className="text-2xl font-bold mb-2">₩100,000</p>
            <p className="text-sm text-gray-500">월간</p>
          </div>
        </div>
      </div>
    </div>
  )
}

