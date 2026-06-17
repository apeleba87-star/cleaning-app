'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { v2Fetch } from '@/lib/v2/client'

export default function V2StoreManagerStorePage() {
  const params = useParams()
  const storeId = params.id as string
  const [store, setStore] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dayData, setDayData] = useState<any>(null)

  useEffect(() => {
    v2Fetch<{ store: any }>(`/api/v2/stores/${storeId}`).then((d) => setStore(d.store))
    v2Fetch<{ notes: any[] }>(`/api/v2/stores/${storeId}/notes`).then((d) => setNotes(d.notes || []))
  }, [storeId])

  useEffect(() => {
    v2Fetch(`/api/v2/stores/${storeId}/day?date=${date}`).then(setDayData)
  }, [storeId, date])

  if (!store) return <div>로딩 중...</div>

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Link href="/v2-store-manager" className="text-emerald-700 text-sm">
        ← 목록
      </Link>
      <h1 className="text-xl font-bold">{store.name}</h1>

      <section className="bg-white border rounded-xl p-4 text-sm">
        <h2 className="font-semibold mb-2">특이사항</h2>
        {notes.map((n) => (
          <div key={n.note_key} className="mb-2">
            <p className="text-gray-500 text-xs">{n.note_key}</p>
            <p>{n.content || '-'}</p>
          </div>
        ))}
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-2">이력</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-2 py-1 mb-2"
        />
        {dayData && (
          <div className="text-sm space-y-1">
            {(dayData.attendance || []).map((a: any) => (
              <p key={a.id}>
                출근 {a.v2_users?.name}:{' '}
                {a.clock_in_at ? new Date(a.clock_in_at).toLocaleTimeString('ko-KR') : '-'}
              </p>
            ))}
            <p>체크리스트 {(dayData.checklist_runs || []).length}건</p>
          </div>
        )}
      </section>
    </div>
  )
}
