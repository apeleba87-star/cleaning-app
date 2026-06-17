'use client'

import { useEffect, useState } from 'react'
import { v2Fetch } from '@/lib/v2/client'

export default function V2WorkIssuesPage() {
  const [issues, setIssues] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [storeId, setStoreId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    v2Fetch<TodayType>('/api/v2/work/today').then((d) => {
      const list = (d.assignments || []).map((a: any) => ({
        id: a.store_id,
        name: a.v2_stores?.name,
      }))
      setStores(list)
      if (list[0]) setStoreId(list[0].id)
    })
    v2Fetch<{ issues: any[] }>('/api/v2/issues').then((d) => setIssues(d.issues || []))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await v2Fetch<{ issue: any }>('/api/v2/issues', {
        method: 'POST',
        body: JSON.stringify({
          store_id: storeId,
          title,
          description,
          issue_type: 'problem',
          needs_approval: false,
        }),
      })
      setIssues((prev) => [res.issue, ...prev])
      setTitle('')
      setDescription('')
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">이슈 등록</h1>
      <form onSubmit={submit} className="bg-white border rounded-xl p-4 space-y-3">
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="w-full border rounded-lg px-3 py-2"
          placeholder="설명"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">
          등록
        </button>
      </form>
      <div className="space-y-2">
        <h2 className="font-medium">최근 이슈</h2>
        {issues.map((i) => (
          <div key={i.id} className="bg-white border rounded-lg p-3 text-sm">
            <p className="font-medium">{i.title}</p>
            <p className="text-gray-500">{i.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

type TodayType = { assignments: any[] }
