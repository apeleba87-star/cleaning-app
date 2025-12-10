import Link from 'next/link'

export default function AdminDashboardPage() {
  const sections = [
    { title: '매장 관리', href: '/admin/stores', description: '매장 정보 및 설정 관리' },
    { title: '직원 관리', href: '/admin/users', description: '직원 계정 및 권한 관리' },
    { title: '카테고리 관리', href: '/admin/categories', description: '이슈/물품 카테고리 관리' },
    { title: '리포트', href: '/admin/reports', description: '월간 리포트 및 통계' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">관리자 대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
            <p className="text-gray-600 text-sm">{section.description}</p>
          </Link>
        ))}
      </div>

      {/* TODO 섹션 */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-yellow-800">개발 예정 기능</h2>
        <ul className="space-y-2 text-sm text-yellow-700">
          <li>• 월간 리포트 (승인/발송)</li>
          <li>• 체크리스트 bad → issue 자동생성 (매니저 리뷰 단계에서 RPC로)</li>
          <li>• 사진 재촬영 요청 워크플로우 추가</li>
          <li>• 오프라인 제출 큐 (선택)</li>
        </ul>
      </div>
    </div>
  )
}

