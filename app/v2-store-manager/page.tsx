'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import V2AdSlot from '@/components/v2/AdSlot'
import { v2Fetch } from '@/lib/v2/client'

export default function V2StoreManagerHomePage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])

  useEffect(() => {
    v2Fetch<{ assignments: any[] }>('/api/v2/work/today').then((d) =>
      setAssignments(d.assignments || [])
    )
    v2Fetch<{ issues: any[] }>('/api/v2/issues').then((d) => setIssues(d.issues || []))
  }, [])

  const acknowledge = async (id: string) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'acknowledged' } : i))
    )
    try {
      await v2Fetch(`/api/v2/issues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'acknowledge' }),
      })
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold">내 매장</h1>
      <V2AdSlot slot="store_mgr_dashboard" forcedDelaySeconds={2} />

      {assignments.map((a) => (
        <Link
          key={a.store_id}
          href={`/v2-store-manager/stores/${a.store_id}`}
          className="block bg-white border rounded-xl p-4"
        >
          <p className="font-semibold">{a.v2_stores?.name}</p>
          <p className="text-sm text-blue-600 mt-1">상세 보기 →</p>
        </Link>
      ))}

      <div>
        <h2 className="font-medium mb-2">확인할 이슈</h2>
        {issues
          .filter((i) => i.status === 'approved')
          .map((i) => (
            <div key={i.id} className="bg-white border rounded-lg p-3 mb-2">
              <p className="font-medium text-sm">{i.title}</p>
              <button
                type="button"
                onClick={() => acknowledge(i.id)}
                className="mt-2 text-sm bg-emerald-600 text-white px-3 py-1 rounded"
              >
                확인함
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
