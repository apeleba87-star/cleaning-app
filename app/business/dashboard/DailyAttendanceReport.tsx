'use client'

import { useState, useEffect } from 'react'

interface StoreReport {
  store_id: string
  store_name: string
  is_night_shift: boolean
  has_attendance: boolean
  is_not_counted?: boolean // 미집계 여부
  clock_in_at: string | null
  user_id: string | null
}

interface AttendanceReport {
  report_date: string
  report_time: string
  is_morning_report?: boolean
  include_night_shift: boolean
  total_stores: number
  attended_stores: number
  not_attended_stores: number
  not_counted_stores?: number
  stores: StoreReport[]
}

export default function DailyAttendanceReport() {
  const [report, setReport] = useState<AttendanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [includeNightShift, setIncludeNightShift] = useState(false)

  useEffect(() => {
    loadReport()
  }, [includeNightShift])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/business/attendance-report?include_night_shift=${includeNightShift}`
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '리포트를 불러올 수 없습니다.')
      }
      const data = await response.json()
      console.log('Attendance report API response:', data)
      if (data.success && data.data) {
        setReport(data.data)
      } else {
        console.error('API response error:', data)
        // 에러가 있어도 빈 리포트를 표시
        setReport({
          report_date: '',
          report_time: '',
          include_night_shift: includeNightShift,
          total_stores: 0,
          attended_stores: 0,
          not_attended_stores: 0,
          stores: []
        })
      }
    } catch (error: any) {
      console.error('Error loading attendance report:', error)
      // 에러 발생 시에도 빈 리포트를 표시하여 에러 메시지를 보여줌
      setReport({
        report_date: '',
        report_time: '',
        include_night_shift: includeNightShift,
        total_stores: 0,
        attended_stores: 0,
        not_attended_stores: 0,
        stores: []
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">리포트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">리포트 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const notAttendedStores = report.stores.filter(s => !s.has_attendance && !s.is_not_counted)
  const notCountedStores = report.stores.filter(s => s.is_not_counted)
  const attendedStores = report.stores.filter(s => s.has_attendance)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">어제 매장 관리 현황</h2>
          <p className="text-sm text-gray-500 mt-1">
            {report.report_date} {report.report_time} 기준
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeNightShift}
            onChange={(e) => setIncludeNightShift(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">야간 매장 포함</span>
        </label>
      </div>

      {/* 요약 통계 */}
      <div className={`grid gap-4 mb-6 ${report.not_counted_stores && report.not_counted_stores > 0 ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">전체 매장</p>
          <p className="text-3xl font-bold text-blue-600">{report.total_stores}곳</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <p className="text-sm text-gray-600 mb-1">관리 완료</p>
          <p className="text-3xl font-bold text-green-600">{report.attended_stores}곳</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
          <p className="text-sm text-gray-600 mb-1">미관리</p>
          <p className="text-3xl font-bold text-red-600">{report.not_attended_stores}곳</p>
        </div>
        {report.not_counted_stores && report.not_counted_stores > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-1">미집계</p>
            <p className="text-3xl font-bold text-gray-600">{report.not_counted_stores}곳</p>
            <p className="text-xs text-gray-500 mt-1">(야간 매장)</p>
          </div>
        )}
      </div>

      {/* 미집계 매장 목록 (오전 리포트일 때만) */}
      {notCountedStores.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            미집계 매장 ({notCountedStores.length}곳)
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            야간 매장은 오후 1시에 집계됩니다.
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notCountedStores.map((store) => (
              <div
                key={store.store_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500 text-white rounded">
                    야간
                  </span>
                  <span className="font-medium text-gray-900">{store.store_name}</span>
                </div>
                <span className="text-sm text-gray-600 font-semibold">미집계</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 미관리 매장 목록 */}
      {notAttendedStores.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            미관리 매장 ({notAttendedStores.length}곳)
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notAttendedStores.map((store) => (
              <div
                key={store.store_id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
              >
                <div className="flex items-center gap-2">
                  {store.is_night_shift && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500 text-white rounded">
                      야간
                    </span>
                  )}
                  <span className="font-medium text-gray-900">{store.store_name}</span>
                </div>
                <span className="text-sm text-red-600 font-semibold">미관리</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 관리 완료 매장 목록 (접을 수 있게) */}
      {attendedStores.length > 0 && (
        <details className="border-t border-gray-200 pt-4">
          <summary className="cursor-pointer text-base font-semibold text-gray-900 mb-3">
            관리 완료 매장 ({attendedStores.length}곳) ▼
          </summary>
          <div className="space-y-2 max-h-60 overflow-y-auto mt-3">
            {attendedStores.map((store) => (
              <div
                key={store.store_id}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <div className="flex items-center gap-2">
                  {store.is_night_shift && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500 text-white rounded">
                      야간
                    </span>
                  )}
                  <span className="font-medium text-gray-900">{store.store_name}</span>
                </div>
                <span className="text-sm text-green-600 font-semibold">관리 완료</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {notAttendedStores.length === 0 && notCountedStores.length === 0 && attendedStores.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">표시할 매장이 없습니다.</p>
          <p className="text-sm">어제 근무일이 아닌 매장이거나, 매장 데이터가 없을 수 있습니다.</p>
        </div>
      )}

      {notAttendedStores.length === 0 && notCountedStores.length === 0 && attendedStores.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">모든 매장이 관리되었습니다! 🎉</p>
        </div>
      )}
    </div>
  )
}
