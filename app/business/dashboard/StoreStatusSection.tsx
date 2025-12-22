'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface StoreStatusData {
  store_id: string
  store_name: string
  is_work_day: boolean
  attendance_status: 'not_clocked_in' | 'clocked_in' | 'clocked_out'
  has_problem: boolean
  store_problem_count: number
  unprocessed_store_problems: number
  unconfirmed_vending_problems: number
  unconfirmed_lost_items: number
  unconfirmed_completed_request_count: number
  unconfirmed_rejected_request_count: number
}

interface StoreStatusSummary {
  todayAttended: number
  todayShouldAttend: number
  totalStores: number
  warning: number
  urgent: number
  stores: StoreStatusData[]
}

export default function StoreStatusSection() {
  const [statusSummary, setStatusSummary] = useState<StoreStatusSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStoreStatus()
  }, [])

  const loadStoreStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/business/stores/status')
      if (!response.ok) {
        throw new Error('매장 상태를 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success && data.data) {
        // 매장 상태 분류
        const stores: StoreStatusData[] = data.data.map((store: any) => ({
          store_id: store.store_id,
          store_name: store.store_name,
          is_work_day: store.is_work_day || false,
          attendance_status: store.attendance_status || 'not_clocked_in',
          has_problem: store.has_problem || false,
          store_problem_count: store.store_problem_count || 0,
          unprocessed_store_problems: store.unprocessed_store_problems || 0,
          unconfirmed_vending_problems: store.unconfirmed_vending_problems || 0,
          unconfirmed_lost_items: store.unconfirmed_lost_items || 0,
          unconfirmed_completed_request_count: store.unconfirmed_completed_request_count || 0,
          unconfirmed_rejected_request_count: store.unconfirmed_rejected_request_count || 0,
        }))

        // 오늘 출근한 매장 수 계산
        const todayAttended = stores.filter(
          (store) => store.attendance_status === 'clocked_in' || store.attendance_status === 'clocked_out'
        ).length

        // 오늘 출근해야 할 매장 수 계산
        const todayShouldAttend = stores.filter((store) => store.is_work_day).length

        const totalStores = stores.length

        // 상태 분류 로직
        let warning = 0
        let urgent = 0

        stores.forEach((store) => {
          const totalUnresolved =
            store.unprocessed_store_problems +
            store.unconfirmed_vending_problems +
            store.unconfirmed_lost_items +
            store.unconfirmed_completed_request_count +
            store.unconfirmed_rejected_request_count

          if (totalUnresolved >= 3 || store.unprocessed_store_problems >= 2) {
            urgent++
          } else if (totalUnresolved > 0) {
            warning++
          }
        })

        setStatusSummary({ todayAttended, todayShouldAttend, totalStores, warning, urgent, stores })
      }
    } catch (error: any) {
      console.error('Error loading store status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">매장 상태를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!statusSummary || statusSummary.stores.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">매장 상태 현황</h2>
        <Link
          href="/business/stores/status"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          전체보기 →
        </Link>
      </div>

      {/* 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* 금일 운영 */}
        <Link
          href="/business/stores/status?filter=today"
          className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200 hover:bg-blue-100 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">금일 운영</p>
              <p className="text-3xl font-bold text-blue-600">
                {statusSummary.todayAttended}/{statusSummary.todayShouldAttend}곳
              </p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </Link>

        {/* 주의 */}
        <Link
          href="/business/stores/status?filter=warning"
          className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200 hover:bg-yellow-100 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">주의</p>
              <p className="text-3xl font-bold text-yellow-600">{statusSummary.warning}</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </Link>

        {/* 긴급 */}
        <Link
          href="/business/stores/status?filter=urgent"
          className="bg-red-50 rounded-lg p-4 border-2 border-red-200 hover:bg-red-100 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">긴급</p>
              <p className="text-3xl font-bold text-red-600">{statusSummary.urgent}</p>
            </div>
            <div className="text-3xl">🚨</div>
          </div>
        </Link>
      </div>

      {/* 최근 이슈 매장 미리보기 */}
      {(statusSummary.warning > 0 || statusSummary.urgent > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">주의/긴급 매장</h3>
          <div className="space-y-2">
            {statusSummary.stores
              .filter((store) => {
                const totalUnresolved =
                  store.unprocessed_store_problems +
                  store.unconfirmed_vending_problems +
                  store.unconfirmed_lost_items +
                  store.unconfirmed_completed_request_count +
                  store.unconfirmed_rejected_request_count
                return totalUnresolved > 0
              })
              .sort((a, b) => {
                const aTotal =
                  a.unprocessed_store_problems +
                  a.unconfirmed_vending_problems +
                  a.unconfirmed_lost_items +
                  a.unconfirmed_completed_request_count +
                  a.unconfirmed_rejected_request_count
                const bTotal =
                  b.unprocessed_store_problems +
                  b.unconfirmed_vending_problems +
                  b.unconfirmed_lost_items +
                  b.unconfirmed_completed_request_count +
                  b.unconfirmed_rejected_request_count
                return bTotal - aTotal
              })
              .slice(0, 3)
              .map((store) => {
                const totalUnresolved =
                  store.unprocessed_store_problems +
                  store.unconfirmed_vending_problems +
                  store.unconfirmed_lost_items +
                  store.unconfirmed_completed_request_count +
                  store.unconfirmed_rejected_request_count

                const isUrgent = totalUnresolved >= 3 || store.unprocessed_store_problems >= 2

                return (
                  <Link
                    key={store.store_id}
                    href={`/business/stores/status?store_id=${store.store_id}`}
                    className={`block p-3 rounded-lg border-2 transition-all ${
                      isUrgent
                        ? 'bg-red-50 border-red-200 hover:bg-red-100'
                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{store.store_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          미처리 이슈: {totalUnresolved}건
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          isUrgent
                            ? 'bg-red-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}
                      >
                        {isUrgent ? '긴급' : '주의'}
                      </span>
                    </div>
                  </Link>
                )
              })}
          </div>
          {statusSummary.warning + statusSummary.urgent > 3 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              외 {statusSummary.warning + statusSummary.urgent - 3}곳
            </p>
          )}
        </div>
      )}

      {/* 전체 통계 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">전체 매장</span>
          <span className="font-semibold text-gray-900">{statusSummary.totalStores}개</span>
        </div>
      </div>
    </div>
  )
}

