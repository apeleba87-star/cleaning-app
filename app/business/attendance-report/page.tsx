import DailyAttendanceReport from '../dashboard/DailyAttendanceReport'

export default function AttendanceReportPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">미관리 매장 확인</h1>
          <p className="text-sm text-gray-500 mt-1">
            각 매장의 미관리 현황을 확인할 수 있습니다. 일반 매장은 매일 오전 6시, 야간 매장은 매일 오후 1시에 집계 완료
          </p>
        </div>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>

      <DailyAttendanceReport />
    </div>
  )
}
