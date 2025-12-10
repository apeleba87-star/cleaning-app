import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">시스템 설정</h1>
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
          <li>• 정책 및 제한 설정 (예: 사진 저장 용량 제한)</li>
          <li>• 전체 로그 모니터링</li>
          <li>• 버그/장애 모니터링</li>
          <li>• 고객사 설정 초기화</li>
          <li>• 시스템 백업 및 복원</li>
        </ul>
      </div>
    </div>
  )
}

