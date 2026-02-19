'use client'

const SECTIONS = [
  { id: 'start', title: '시작하기' },
  { id: 'staff-app', title: '직원앱 안내' },
  { id: 'dashboard', title: '대시보드' },
  { id: 'attendance-report', title: '미관리 매장 확인' },
  { id: 'stores', title: '매장 관리' },
  { id: 'payrolls', title: '인건비 관리' },
  { id: 'financial', title: '재무' },
  { id: 'users', title: '사용자 관리' },
  { id: 'operations', title: '운영' },
  { id: 'settings', title: '설정' },
] as const

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function BusinessManualPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">사용 설명서</h1>
      <p className="text-sm text-gray-500 mb-6">업체관리자앱과 직원앱 사용 방법을 안내합니다.</p>

      {/* 목차 */}
      <nav className="bg-white rounded-lg border border-gray-200 p-4 mb-8 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">목차</h2>
        <ul className="space-y-1.5">
          {SECTIONS.map(({ id, title }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollToSection(id)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
              >
                {title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10">
        {/* 1. 시작하기 */}
        <section id="start" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">1. 시작하기</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>이 설명서는 <strong>업체관리자앱</strong>에서 제공하는 기능과, 직원이 사용하는 <strong>직원앱</strong>에 대해 안내합니다.</p>
            <p>상단 목차를 클릭하면 해당 항목으로 이동합니다.</p>
          </div>
        </section>

        {/* 2. 직원앱 안내 */}
        <section id="staff-app" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">2. 직원앱 안내</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p><strong>직원앱</strong>은 현장 직원이 출퇴근, 체크리스트, 요청·이슈 등을 입력할 때 사용하는 앱입니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>출퇴근</strong>: 매장별 출근 시각 기록</li>
              <li><strong>체크리스트</strong>: 관리전·관리후 사진 촬영 및 점검 항목 작성</li>
              <li><strong>요청·이슈</strong>: 물품 요청, 문제 보고 등</li>
            </ul>
            <p>업체관리자앱의 <strong>대시보드</strong>, <strong>매장 상태</strong>, <strong>체크리스트</strong> 등에서 직원이 입력한 결과를 확인할 수 있습니다.</p>
          </div>
        </section>

        {/* 3. 대시보드 */}
        <section id="dashboard" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">3. 대시보드</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>전체 현황을 한눈에 보는 메인 화면입니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>오늘의 작업</strong>: 오늘 수금·인건비 지급 등 할 일 요약</li>
              <li><strong>재무 현황</strong>: 매출·수금·인건비·지출 요약</li>
            </ul>
            <p>메뉴에서 <strong>대시보드</strong>를 선택하면 이동합니다.</p>
          </div>
        </section>

        {/* 4. 미관리 매장 확인 */}
        <section id="attendance-report" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">4. 미관리 매장 확인</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>어제 근무일 기준으로 출근 기록이 없는 매장을 확인할 수 있습니다.</p>
            <p>직원이 직원앱에서 출근을 기록하면 해당 매장은 &quot;관리 완료&quot;로 집계됩니다.</p>
            <p>메뉴에서 <strong>미관리 매장 확인</strong>을 선택하면 이동합니다.</p>
          </div>
        </section>

        {/* 5. 매장 관리 */}
        <section id="stores" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">5. 매장 관리</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>매장 목록, 매장별 상태, 프렌차이즈를 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>매장 관리</strong>: 매장 등록·수정·상세 보기</li>
              <li><strong>매장 상태</strong>: 매장별 출근·체크리스트·요청 현황</li>
              <li><strong>프렌차이즈 관리</strong>: 프렌차이즈 등록 및 관리</li>
            </ul>
            <p>메뉴 <strong>매장</strong> 하위에서 선택합니다.</p>
          </div>
        </section>

        {/* 6. 인건비 관리 */}
        <section id="payrolls" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">6. 인건비 관리</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>정규 직원과 일당 근로자의 급여·인건비를 등록하고 지급 완료 처리합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>월별·직원별 인건비 조회</li>
              <li>지급 완료 처리 (대시보드 오늘의 작업에서도 가능)</li>
            </ul>
            <p>메뉴에서 <strong>인건비 관리</strong>를 선택하면 이동합니다.</p>
          </div>
        </section>

        {/* 7. 재무 */}
        <section id="financial" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">7. 재무</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>수금·미수금, 매출·지출·재무 현황을 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>수금/미수금 관리</strong>: 수금 등록, 미수금 조회</li>
              <li><strong>재무 현황</strong>: 매출·수금·인건비·지출 통합 보기</li>
            </ul>
            <p>메뉴 <strong>재무</strong> 하위에서 선택합니다.</p>
          </div>
        </section>

        {/* 8. 사용자 관리 */}
        <section id="users" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">8. 사용자 관리</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>직원·매장관리자·프렌차이즈관리자 등 사용자를 등록하고 역할·매장 배정을 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>사용자 추가·수정·역할 변경</li>
              <li>매장 배정 (어느 매장을 담당하는지)</li>
              <li>가입 승인 대기 목록 확인</li>
            </ul>
            <p>메뉴에서 <strong>사용자 관리</strong>를 선택하면 이동합니다.</p>
          </div>
        </section>

        {/* 9. 운영 */}
        <section id="operations" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">9. 운영</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>일상 운영에 필요한 제품·체크리스트·공지·리포트·물품 요청을 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>바코드 제품 등록</strong>: 제품 등록 및 바코드 매핑</li>
              <li><strong>체크리스트</strong>: 점검 항목·템플릿 관리</li>
              <li><strong>공지사항 관리</strong>: 직원 대상 공지 작성</li>
              <li><strong>리포트</strong>: 리포트 조회</li>
              <li><strong>물품 요청</strong>: 직원 물품 요청 확인·처리</li>
            </ul>
            <p>메뉴 <strong>운영</strong> 하위에서 선택합니다.</p>
          </div>
        </section>

        {/* 10. 설정 */}
        <section id="settings" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">10. 설정</h2>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
            <p>회사 정보를 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>회사 관리</strong>: 회사명·연락처 등 기본 정보 수정</li>
            </ul>
            <p>메뉴 <strong>설정</strong> 하위에서 선택합니다.</p>
          </div>
        </section>
      </div>

      <p className="mt-10 text-xs text-gray-400">본 설명서는 앱 버전에 따라 일부 화면이 다를 수 있습니다.</p>
    </div>
  )
}
