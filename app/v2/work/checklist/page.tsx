'use client'

import { useEffect, useState } from 'react'
import { v2Fetch, v2GetCached, v2InvalidateCache } from '@/lib/v2/client'

export default function V2WorkChecklistPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    v2GetCached<{ checklist_runs: any[]; checklist_guides?: any[] }>('/api/v2/work/today', 30_000)
      .then((d) => setRuns([...(d.checklist_runs || []), ...(d.checklist_guides || [])]))
      .finally(() => setLoading(false))
  }, [])

  const completeRun = async (runId: string, items: any[]) => {
    const next = (items || []).map((it) => ({ ...it, checked: true }))
    setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, items: next, status: 'completed' } : r)))
    try {
      const res = await v2Fetch<{ run: any }>(`/api/v2/checklist-runs/${runId}`, {
        method: 'PATCH',
        body: JSON.stringify({ items: next }),
      })
      v2InvalidateCache('/api/v2/work/today')
      setRuns((prev) => prev.map((r) => (r.id === runId ? res.run : r)))
    } catch (e: any) {
      alert(e.message)
      v2InvalidateCache('/api/v2/work/today')
      v2GetCached<{ checklist_runs: any[]; checklist_guides?: any[] }>('/api/v2/work/today', 30_000).then((d) =>
        setRuns([...(d.checklist_runs || []), ...(d.checklist_guides || [])])
      )
    }
  }

  if (loading) return <div className="p-6 text-center">로딩 중...</div>

  if (!runs.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>등록된 청소 안내가 없습니다.</p>
        <p className="text-sm mt-2">관리자에게 매장 청소 안내 등록을 요청하세요.</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">청소 안내</h1>
      {runs.map((run) => (
        <div key={run.id} className="bg-white border rounded-xl p-4">
          <p className="font-semibold">{run.v2_stores?.name || '매장'}</p>
          {run.work_date && <p className="text-sm text-gray-500 mt-1 mb-3">작업일: {run.work_date}</p>}
          {!run.work_date && <p className="text-sm text-gray-500 mt-1 mb-3">상시 확인용 청소 안내</p>}
          <ul className="space-y-3">
            {(run.items || []).map((item: any, idx: number) => (
              <li key={item.id || idx}>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.cleaning_area || item.label || `항목 ${idx + 1}`}
                  </p>
                  {item.cleaning_method && (
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{item.cleaning_method}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {run.status === 'guide' ? null : run.status === 'completed' ? (
            <p className="text-xs text-green-600 mt-3">작업 완료됨</p>
          ) : (
            <button
              type="button"
              onClick={() => completeRun(run.id, run.items || [])}
              className="mt-3 w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
            >
              안내 확인 후 작업 완료
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
