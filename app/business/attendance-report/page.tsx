import DailyAttendanceReport from '../dashboard/DailyAttendanceReport'

export default function AttendanceReportPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">매장 관리 현황 리포트</h1>
          <p className="text-sm text-gray-500 mt-1">
            어제 오후 1시 기준으로 각 매장의 관리 현황을 확인할 수 있습니다.
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
