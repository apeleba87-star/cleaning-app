import DailyAttendanceReport from '../dashboard/DailyAttendanceReport'

export default function AttendanceReportPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">미관리 매장 확인</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
            각 매장의 미관리 현황을 확인할 수 있습니다.<br className="sm:hidden" /> 일반 매장은 매일 오전 6시, 야간 매장은 매일 오후 1시에 집계 완료
          </p>
        </div>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm self-start sm:self-auto"
        >
          ← 대시보드로
        </a>
      </div>

      <DailyAttendanceReport />
    </div>
  )
}
