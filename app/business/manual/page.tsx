'use client'

const SECTIONS = [
  { id: 'quick-start', title: '빠른 시작' },
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

const QUICK_STEPS = [
  { label: '매장 등록', steps: '매장 → 매장 등록/관리 → 새 매장 추가 → 기본정보 / 결제·정산 / 거래처 담당자 / 계약·문서 / 운영 메모 순서로 작성' },
  { label: '사용자 등록·관리', steps: '사용자 등록/관리 → 새 사용자 초대 → 기본정보 입력 → 매장 배정 → 급여 방식 → 근로 상태 입력' },
  { label: '인건비 등록·관리', steps: '인건비 등록/관리 → 직원 정규 인건비 생성 (인건비는 매월 생성 필요) → 일당 관리 → 도급 관리' },
  { label: '매장 수금 관리', steps: '수금/미수금 관리 → 자동 추가 (기존 거래처 자동 수금 생성)' },
  { label: '재무 현황', steps: '지출 상세 → 고정비 관리 등록 (등록 시 매월 고정비 자동 등록) → 지출 장부 등록' },
  { label: '매장 체크리스트 등록', steps: '운영 → 체크리스트 등록/관리 → 매장 선택 → 체크리스트 등록' },
] as const

export default function BusinessManualPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* 헤더 */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">사용 설명서</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            처음 사용하시는 분은 아래 <span className="font-medium text-slate-700">&quot;빠른 시작&quot;</span>부터 보시면 자주 쓰는 작업 순서를 바로 따라 하실 수 있습니다.
          </p>
        </header>

        {/* 목차 카드 */}
        <nav
          className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 mb-8 shadow-sm shadow-slate-200/50"
          aria-label="목차"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">목차</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SECTIONS.map(({ id, title }, i) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className="w-full text-left text-sm py-2.5 px-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                >
                  <span className="text-slate-400 tabular-nums mr-2">{i + 1}.</span>
                  {title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-8">
          {/* 1. 빠른 시작 */}
          <section
            id="quick-start"
            className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden"
          >
            <div className="border-l-4 border-blue-500 bg-slate-50/80 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-800">1. 빠른 시작</h2>
              <p className="mt-1 text-sm text-slate-500">
                처음 사용하시는 분이 시스템을 빠르게 익힐 수 있도록, 자주 쓰는 작업 흐름만 정리했습니다.
              </p>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              {QUICK_STEPS.map(({ label, steps }) => (
                <div
                  key={label}
                  className="rounded-xl bg-slate-50/60 border border-slate-100 p-4 hover:border-slate-200 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">{label}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{steps}</p>
                </div>
              ))}
            </div>
          </section>

        {/* 2. 시작하기 */}
        <section id="start" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">2. 시작하기</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>이 설명서는 <strong className="text-slate-800">업체관리자앱</strong>에서 제공하는 기능과, 직원이 사용하는 <strong className="text-slate-800">직원앱</strong>에 대해 안내합니다.</p>
            <p>상단 목차를 클릭하면 해당 항목으로 이동합니다.</p>
          </div>
        </section>

        {/* 3. 직원앱 안내 */}
        <section id="staff-app" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">3. 직원앱 안내</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p><strong className="text-slate-800">직원앱</strong>은 현장 직원이 출퇴근, 체크리스트, 요청·이슈 등을 입력할 때 사용하는 앱입니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-slate-700">출퇴근</strong>: 매장별 출근 시각 기록</li>
              <li><strong className="text-slate-700">체크리스트</strong>: 관리전·관리후 사진 촬영 및 점검 항목 작성</li>
              <li><strong className="text-slate-700">요청·이슈</strong>: 물품 요청, 문제 보고 등</li>
            </ul>
            <p>업체관리자앱의 <strong className="text-slate-800">대시보드</strong>, <strong className="text-slate-800">매장 상태</strong>, <strong className="text-slate-800">체크리스트</strong> 등에서 직원이 입력한 결과를 확인할 수 있습니다.</p>
          </div>
        </section>

        {/* 4. 대시보드 */}
        <section id="dashboard" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">4. 대시보드</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>전체 현황을 한눈에 보는 메인 화면입니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-slate-700">오늘의 작업</strong>: 오늘 수금·인건비 지급 등 할 일 요약</li>
              <li><strong className="text-slate-700">재무 현황</strong>: 매출·수금·인건비·지출 요약</li>
            </ul>
            <p>메뉴에서 <strong className="text-slate-800">대시보드</strong>를 선택하면 이동합니다.</p>
          </div>
        </section>

        {/* 5. 미관리 매장 확인 */}
        <section id="attendance-report" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">5. 미관리 매장 확인</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>어제 근무일 기준으로 출근 기록이 없는 매장을 확인할 수 있습니다.</p>
            <p>직원이 직원앱에서 출근을 기록하면 해당 매장은 &quot;관리 완료&quot;로 집계됩니다.</p>
            <p>메뉴에서 <strong className="text-slate-800">미관리 매장 확인</strong>을 선택하면 이동합니다.</p>
          </div>
        </section>

        {/* 6. 매장 관리 */}
        <section id="stores" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">6. 매장 관리</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>매장 목록, 매장별 상태, 프렌차이즈를 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-slate-700">매장 관리</strong>: 매장 등록·수정·상세 보기</li>
              <li><strong className="text-slate-700">매장 상태</strong>: 매장별 출근·체크리스트·요청 현황</li>
              <li><strong className="text-slate-700">프렌차이즈 관리</strong>: 프렌차이즈 등록 및 관리</li>
            </ul>
            <p>메뉴 <strong className="text-slate-800">매장</strong> 하위에서 선택합니다.</p>
          </div>
        </section>

        {/* 7. 인건비 관리 */}
        <section id="payrolls" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">7. 인건비 관리</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>정규 직원과 일당 근로자의 급여·인건비를 등록하고 지급 완료 처리합니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>월별·직원별 인건비 조회</li>
              <li>지급 완료 처리 (대시보드 오늘의 작업에서도 가능)</li>
            </ul>
            <p>메뉴에서 <strong className="text-slate-800">인건비 관리</strong>를 선택하면 이동합니다.</p>
          </div>
        </section>

        {/* 8. 재무 */}
        <section id="financial" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">8. 재무</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>수금·미수금, 매출·지출·재무 현황을 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-slate-700">수금/미수금 관리</strong>: 수금 등록, 미수금 조회</li>
              <li><strong className="text-slate-700">재무 현황</strong>: 매출·수금·인건비·지출 통합 보기</li>
            </ul>
            <p>메뉴 <strong className="text-slate-800">재무</strong> 하위에서 선택합니다.</p>
          </div>
        </section>

        {/* 9. 사용자 관리 */}
        <section id="users" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">9. 사용자 관리</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>직원·매장관리자·프렌차이즈관리자 등 사용자를 등록하고 역할·매장 배정을 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>사용자 추가·수정·역할 변경</li>
              <li>매장 배정 (어느 매장을 담당하는지)</li>
              <li>가입 승인 대기 목록 확인</li>
            </ul>
            <p>메뉴에서 <strong className="text-slate-800">사용자 관리</strong>를 선택하면 이동합니다.</p>
          </div>
        </section>

        {/* 10. 운영 */}
        <section id="operations" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">10. 운영</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>일상 운영에 필요한 제품·체크리스트·공지·리포트·물품 요청을 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-slate-700">바코드 제품 등록</strong>: 제품 등록 및 바코드 매핑</li>
              <li><strong className="text-slate-700">체크리스트</strong>: 점검 항목·템플릿 관리</li>
              <li><strong className="text-slate-700">공지사항 관리</strong>: 직원 대상 공지 작성</li>
              <li><strong className="text-slate-700">리포트</strong>: 리포트 조회</li>
              <li><strong className="text-slate-700">물품 요청</strong>: 직원 물품 요청 확인·처리</li>
            </ul>
            <p>메뉴 <strong className="text-slate-800">운영</strong> 하위에서 선택합니다.</p>
          </div>
        </section>

        {/* 11. 설정 */}
        <section id="settings" className="scroll-mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
          <div className="border-l-4 border-slate-300 bg-slate-50/80 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">11. 설정</h2>
          </div>
          <div className="p-5 sm:p-6 text-sm text-slate-600 space-y-3">
            <p>회사 정보를 관리합니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-slate-700">회사 관리</strong>: 회사명·연락처 등 기본 정보 수정</li>
            </ul>
            <p>메뉴 <strong className="text-slate-800">설정</strong> 하위에서 선택합니다.</p>
          </div>
        </section>
        </div>

        <p className="mt-8 text-xs text-slate-400">본 설명서는 앱 버전에 따라 일부 화면이 다를 수 있습니다.</p>
      </div>
    </div>
  )
}
