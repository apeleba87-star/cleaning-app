'use client'

import { useEffect, useRef, useState } from 'react'
import { v2Fetch, v2GetCached, v2InvalidateCache } from '@/lib/v2/client'
import { uploadV2Photo } from '@/lib/v2/photos'

export default function V2WorkIssuesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [issues, setIssues] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [storeId, setStoreId] = useState('')
  const [issueType, setIssueType] = useState<'problem' | 'shortage' | 'other'>('problem')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [itemName, setItemName] = useState('')
  const [requestedQuantity, setRequestedQuantity] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    v2GetCached<TodayType>('/api/v2/work/today', 30_000).then((d) => {
      const list = (d.assignments || []).map((a: any) => ({
        id: a.store_id,
        name: a.v2_stores?.name,
      }))
      setStores(list)
      if (list[0]) setStoreId(list[0].id)
    })
    v2GetCached<{ issues: any[] }>('/api/v2/issues', 30_000).then((d) => setIssues(d.issues || []))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('등록 중...')
    try {
      const res = await v2Fetch<{ issue: any }>('/api/v2/issues', {
        method: 'POST',
        body: JSON.stringify({
          store_id: storeId,
          title: title || (issueType === 'shortage' ? `${itemName || '물품'} 부족` : ''),
          description,
          issue_type: issueType,
          needs_approval: false,
          item_name: issueType === 'shortage' ? itemName : null,
          requested_quantity: issueType === 'shortage' ? requestedQuantity : null,
          urgency,
          resolution_type: issueType === 'shortage' ? 'supply_request' : null,
        }),
      })

      for (const file of files) {
        await uploadV2Photo({
          file,
          storeId,
          kind: 'issue',
          issueId: res.issue.id,
          memo: title || description,
        })
      }

      v2InvalidateCache('/api/v2/issues')
      v2InvalidateCache('/api/v2/stores/summary')
      v2InvalidateCache('/api/v2/photos')
      setIssues((prev) => [res.issue, ...prev])
      setIssueType('problem')
      setTitle('')
      setDescription('')
      setItemName('')
      setRequestedQuantity('')
      setUrgency('normal')
      setFiles([])
      setMessage('등록완료')
      window.setTimeout(() => setMessage(''), 1800)
    } catch (err: any) {
      setMessage(err.message || '등록 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">이슈 등록</h1>
      <form onSubmit={submit} className="bg-white border rounded-xl p-4 space-y-3">
        {message && (
          <p className={`rounded-lg px-3 py-2 text-sm ${message.includes('실패') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {message}
          </p>
        )}
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
        <div className="grid grid-cols-3 gap-2">
          {[
            ['problem', '문제'],
            ['shortage', '물품 부족'],
            ['other', '기타'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setIssueType(value as 'problem' | 'shortage' | 'other')}
              className={`rounded-lg border py-2 text-sm ${
                issueType === value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {issueType === 'shortage' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="품목 (예: 화장지)"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="요청 수량"
              value={requestedQuantity}
              onChange={(e) => setRequestedQuantity(e.target.value)}
            />
          </div>
        )}
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder={issueType === 'shortage' ? '제목 (비워두면 품목 부족으로 등록)' : '제목'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required={issueType !== 'shortage'}
        />
        <textarea
          className="w-full border rounded-lg px-3 py-2"
          placeholder="설명"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
        >
          <option value="normal">보통</option>
          <option value="urgent">긴급</option>
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border border-blue-200 text-blue-700 py-2 rounded-lg"
        >
          사진 선택 {files.length ? `(${files.length}장)` : '(선택)'}
        </button>
        <button type="submit" disabled={saving || !storeId} className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50">
          {saving ? '등록 중...' : '등록'}
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
