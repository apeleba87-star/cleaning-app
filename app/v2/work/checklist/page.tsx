'use client'

import { useEffect, useState } from 'react'
import { v2Fetch } from '@/lib/v2/client'

export default function V2WorkChecklistPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    v2Fetch<{ checklist_runs: any[] }>('/api/v2/work/today')
      .then((d) => setRuns(d.checklist_runs || []))
      .finally(() => setLoading(false))
  }, [])

  const toggleItem = async (runId: string, items: any[], index: number) => {
    const next = items.map((it, i) =>
      i === index ? { ...it, checked: !it.checked } : it
    )
    setRuns((prev) =>
      prev.map((r) => (r.id === runId ? { ...r, items: next } : r))
    )
    try {
      const res = await v2Fetch<{ run: any }>(`/api/v2/checklist-runs/${runId}`, {
        method: 'PATCH',
        body: JSON.stringify({ items: next }),
      })
      setRuns((prev) => prev.map((r) => (r.id === runId ? res.run : r)))
    } catch (e: any) {
      alert(e.message)
      v2Fetch<{ checklist_runs: any[] }>('/api/v2/work/today').then((d) =>
        setRuns(d.checklist_runs || [])
      )
    }
  }

  if (loading) return <div className="p-6 text-center">로딩 중...</div>

  if (!runs.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>진행 중인 체크리스트가 없습니다.</p>
        <p className="text-sm mt-2">먼저 매장에 출근하세요.</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">체크리스트</h1>
      {runs.map((run) => (
        <div key={run.id} className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-3">작업일: {run.work_date}</p>
          <ul className="space-y-2">
            {(run.items || []).map((item: any, idx: number) => (
              <li key={item.id || idx}>
                <label className="flex items-center gap-3 py-2 border-b last:border-0">
                  <input
                    type="checkbox"
                    checked={!!item.checked}
                    onChange={() => toggleItem(run.id, run.items, idx)}
                    className="w-5 h-5"
                  />
                  <span className={item.checked ? 'line-through text-gray-400' : ''}>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2">상태: {run.status}</p>
        </div>
      ))}
    </div>
  )
}
