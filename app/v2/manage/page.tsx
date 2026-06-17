'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import V2AdSlot from '@/components/v2/AdSlot'
import { v2Fetch } from '@/lib/v2/client'

export default function V2ManageDashboardPage() {
  const [stores, setStores] = useState<any[]>([])
  const [date, setDate] = useState('')

  useEffect(() => {
    v2Fetch<{ stores: any[]; date: string }>('/api/v2/stores/summary')
      .then((d) => {
        setStores(d.stores || [])
        setDate(d.date)
      })
      .catch(console.error)
  }, [])

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">오늘 운영</h1>
      <p className="text-sm text-gray-500">{date}</p>

      <V2AdSlot slot="manage_dashboard" forcedDelaySeconds={2} />

      <div className="grid gap-3 sm:grid-cols-2">
        {stores.map((s) => (
          <Link
            key={s.id}
            href={`/v2/manage/stores/${s.id}`}
            className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <p className="font-semibold">{s.name}</p>
            <p className="text-sm mt-2">
              출근:{' '}
              <span className={s.clocked_in_today ? 'text-green-600' : 'text-gray-400'}>
                {s.clocked_in_today ? '완료' : '미출근'}
              </span>
            </p>
            <p className="text-sm">미처리 이슈: {s.open_issues}건</p>
          </Link>
        ))}
      </div>
      {stores.length === 0 && (
        <p className="text-gray-500">
          등록된 매장이 없습니다.{' '}
          <Link href="/v2/manage/stores" className="text-blue-600">
            매장 등록
          </Link>
        </p>
      )}
    </div>
  )
}
