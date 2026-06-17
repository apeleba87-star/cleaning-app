'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { v2Fetch } from '@/lib/v2/client'
import { V2_NOTE_LABELS, V2_STORE_NOTE_KEYS } from '@/types/v2'

export default function V2ManageStoreDetailPage() {
  const params = useParams()
  const storeId = params.id as string
  const [store, setStore] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dayData, setDayData] = useState<any>(null)
  const [templateItems, setTemplateItems] = useState('')
  const [assignments, setAssignments] = useState<any[]>([])

  useEffect(() => {
    v2Fetch<{ store: any }>(`/api/v2/stores/${storeId}`).then((d) => setStore(d.store))
    v2Fetch<{ notes: any[] }>(`/api/v2/stores/${storeId}/notes`).then((d) => setNotes(d.notes || []))
    v2Fetch<{ assignments: any[] }>(`/api/v2/stores/${storeId}/assignments`).then((d) =>
      setAssignments(d.assignments || [])
    )
    v2Fetch<{ templates: any[] }>(`/api/v2/checklist-templates?store_id=${storeId}`).then((d) => {
      const t = d.templates?.[0]
      if (t?.items) setTemplateItems(JSON.stringify(t.items, null, 2))
    })
  }, [storeId])

  useEffect(() => {
    v2Fetch(`/api/v2/stores/${storeId}/day?date=${date}`).then(setDayData).catch(() => setDayData(null))
  }, [storeId, date])

  const saveNotes = async () => {
    await v2Fetch(`/api/v2/stores/${storeId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({
        notes: notes.map((n) => ({
          note_key: n.note_key,
          content: n.content,
          visible_to_staff: n.visible_to_staff,
        })),
      }),
    })
    alert('저장되었습니다.')
  }

  const saveTemplate = async () => {
    let items
    try {
      items = JSON.parse(templateItems)
    } catch {
      alert('JSON 형식이 올바르지 않습니다.')
      return
    }
    await v2Fetch('/api/v2/checklist-templates', {
      method: 'POST',
      body: JSON.stringify({ store_id: storeId, title: '기본', items }),
    })
    alert('체크리스트 템플릿 저장됨')
  }

  if (!store) return <div className="p-4">로딩 중...</div>

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/v2/manage/stores" className="text-blue-600 text-sm">
        ← 매장 목록
      </Link>
      <h1 className="text-2xl font-bold">{store.name}</h1>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">특이사항</h2>
        {V2_STORE_NOTE_KEYS.map((key) => {
          const note = notes.find((n) => n.note_key === key) || {
            note_key: key,
            content: '',
            visible_to_staff: key === 'entrance_password' || key === 'cleaning_notes',
          }
          return (
            <div key={key} className="mb-3">
              <label className="text-sm font-medium">{V2_NOTE_LABELS[key]}</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                rows={2}
                value={note.content || ''}
                onChange={(e) => {
                  setNotes((prev) => {
                    const rest = prev.filter((n) => n.note_key !== key)
                    return [...rest, { ...note, content: e.target.value }]
                  })
                }}
              />
            </div>
          )
        })}
        <button type="button" onClick={saveNotes} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
          특이사항 저장
        </button>
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-2">체크리스트 템플릿 (JSON)</h2>
        <p className="text-xs text-gray-500 mb-2">
          예: [{'{'}&quot;id&quot;:&quot;1&quot;,&quot;label&quot;:&quot;바닥 청소&quot;,&quot;checked&quot;:false{'}'}]
        </p>
        <textarea
          className="w-full border rounded-lg px-3 py-2 font-mono text-xs h-32"
          value={templateItems}
          onChange={(e) => setTemplateItems(e.target.value)}
        />
        <button type="button" onClick={saveTemplate} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
          템플릿 저장
        </button>
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-2">배정 인원</h2>
        <ul className="text-sm space-y-1">
          {assignments.map((a) => (
            <li key={a.id}>
              {a.v2_users?.name} ({a.assignment_role})
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">일별 이력</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-lg px-3 py-2 mb-3"
        />
        {dayData ? (
          <div className="text-sm space-y-2">
            <p>출근 {(dayData.attendance || []).length}건</p>
            <p>체크리스트 {(dayData.checklist_runs || []).length}건</p>
            <p>이슈 {(dayData.issues || []).length}건</p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">데이터 없음</p>
        )}
      </section>
    </div>
  )
}
