'use client'

import { useEffect, useState } from 'react'
import { v2Fetch, v2GetCached, v2InvalidateCache } from '@/lib/v2/client'

export default function V2ManageIssuesPage() {
  const [issues, setIssues] = useState<any[]>([])

  const load = () => {
    v2GetCached<{ issues: any[] }>('/api/v2/issues', 60_000).then((d) => setIssues(d.issues || []))
  }

  useEffect(() => {
    load()
  }, [])

  const act = async (id: string, action: string) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status:
                action === 'approve'
                  ? 'approved'
                  : action === 'reject'
                    ? 'rejected'
                    : i.status,
            }
          : i
      )
    )
    try {
      await v2Fetch(`/api/v2/issues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      v2InvalidateCache('/api/v2/issues')
      v2InvalidateCache('/api/v2/stores/summary')
    } catch (e: any) {
      alert(e.message)
      load()
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">이슈 관리</h1>
      {issues.map((i) => (
        <div key={i.id} className="bg-white border rounded-xl p-4">
          <p className="font-medium">{i.title}</p>
          <p className="text-sm text-gray-600 mt-1">{i.description}</p>
          <p className="text-xs text-gray-400 mt-2">상태: {i.status}</p>
          {i.status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => act(i.id, 'approve')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                승인
              </button>
              <button
                type="button"
                onClick={() => act(i.id, 'reject')}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                반려
              </button>
            </div>
          )}
        </div>
      ))}
      {issues.length === 0 && <p className="text-gray-500">이슈가 없습니다.</p>}
    </div>
  )
}
