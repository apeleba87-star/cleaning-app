'use client'

import { useEffect, useState } from 'react'
import V2AdSlot from '@/components/v2/AdSlot'
import { v2Fetch } from '@/lib/v2/client'

type TodayData = {
  assignments: any[]
  active_attendance: any[]
  checklist_runs: any[]
}

export default function V2WorkHomePage() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [showPostClockAd, setShowPostClockAd] = useState(false)

  const load = () => {
    v2Fetch<TodayData>('/api/v2/work/today')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const active = data?.active_attendance?.[0]
  const stores = data?.assignments || []

  const clockIn = async (storeId: string) => {
    setClocking(true)
    try {
      await v2Fetch('/api/v2/attendance', {
        method: 'POST',
        body: JSON.stringify({ store_id: storeId }),
      })
      setShowPostClockAd(true)
      load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setClocking(false)
    }
  }

  const clockOut = async (storeId: string) => {
    setClocking(true)
    try {
      await v2Fetch('/api/v2/attendance', {
        method: 'PATCH',
        body: JSON.stringify({ store_id: storeId }),
      })
      load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setClocking(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">로딩 중...</div>
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <V2AdSlot slot="staff_home" forcedDelaySeconds={2} className="mb-2" />

      {showPostClockAd && (
        <V2AdSlot slot="staff_clock_in" forcedDelaySeconds={3} />
      )}

      <h1 className="text-xl font-bold">오늘의 근무</h1>

      {active ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="font-medium text-green-800">
            출근 중: {active.v2_stores?.name || '매장'}
          </p>
          <p className="text-sm text-green-700 mt-1">
            {new Date(active.clock_in_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button
            type="button"
            disabled={clocking}
            onClick={() => clockOut(active.store_id)}
            className="mt-3 w-full bg-green-600 text-white py-3 rounded-lg font-medium"
          >
            퇴근하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">배정 매장에서 출근하세요.</p>
          {stores.map((a: any) => {
            const store = a.v2_stores
            if (!store?.service_active) return null
            return (
              <div key={a.store_id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{store.name}</p>
                  {store.management_days && (
                    <p className="text-xs text-gray-500">관리일: {store.management_days}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={clocking}
                  onClick={() => clockIn(a.store_id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  출근
                </button>
              </div>
            )
          })}
          {stores.length === 0 && (
            <p className="text-gray-500 text-sm">배정된 매장이 없습니다. 관리자에게 문의하세요.</p>
          )}
        </div>
      )}

      {data?.checklist_runs?.length ? (
        <div className="bg-white border rounded-xl p-4">
          <p className="font-medium mb-2">진행 중 체크리스트</p>
          <a href="/v2/work/checklist" className="text-blue-600 text-sm font-medium">
            체크리스트 열기 →
          </a>
        </div>
      ) : null}
    </div>
  )
}
