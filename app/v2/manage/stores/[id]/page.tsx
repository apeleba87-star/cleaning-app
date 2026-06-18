'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { v2Fetch, v2GetCached, v2InvalidateCache } from '@/lib/v2/client'

export default function V2ManageStoreDetailPage() {
  const params = useParams()
  const storeId = params.id as string
  const [store, setStore] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [cleaningGuide, setCleaningGuide] = useState('')
  const [assignments, setAssignments] = useState<any[]>([])
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [photos, setPhotos] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timer = window.setTimeout(() => setSaveStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [saveStatus])

  useEffect(() => {
    v2GetCached<{ store: any }>(`/api/v2/stores/${storeId}`, 60_000).then((d) => setStore(d.store))
    v2GetCached<{ notes: any[] }>(`/api/v2/stores/${storeId}/notes`, 60_000).then((d) => setNotes(d.notes || []))
    v2GetCached<{ assignments: any[] }>(`/api/v2/stores/${storeId}/assignments`, 60_000).then((d) =>
      setAssignments(d.assignments || [])
    )
    v2GetCached<{ templates: any[] }>(`/api/v2/checklist-templates?store_id=${storeId}`, 60_000).then((d) => {
      const t = d.templates?.[0]
      if (Array.isArray(t?.items) && t.items.length > 0) {
        setCleaningGuide(
          t.items
            .map((item: any) => [item.cleaning_area || item.label, item.cleaning_method].filter(Boolean).join('\n'))
            .filter(Boolean)
            .join('\n\n')
        )
      }
    })
  }, [storeId])

  useEffect(() => {
    v2Fetch<{ photos: any[] }>(`/api/v2/photos?store_id=${storeId}&work_date=${photoDate}`)
      .then((d) => setPhotos(d.photos || []))
      .catch(() => setPhotos([]))
  }, [storeId, photoDate])

  const getNote = (key: string) => notes.find((n) => n.note_key === key)
  const paymentDay = (getNote('payment_date')?.content || '').replace(/\D/g, '').slice(0, 2)
  const paymentAmount = (() => {
    const raw = getNote('payment_amount')?.content || ''
    const digits = raw.replace(/\D/g, '')
    return digits ? Number(digits).toLocaleString('ko-KR') : ''
  })()

  const updateNote = (key: string, content: string, visibleToStaff?: boolean) => {
    setSaveStatus('idle')
    setSaveError('')
    const current = getNote(key) || {
      note_key: key,
      content: '',
      visible_to_staff: visibleToStaff ?? false,
      visible_to_store_manager: true,
      visible_to_owner: true,
    }
    setNotes((prev) => {
      const rest = prev.filter((n) => n.note_key !== key)
      return [
        ...rest,
        {
          ...current,
          content,
          visible_to_staff: visibleToStaff ?? current.visible_to_staff,
        },
      ]
    })
  }

  const saveAll = async () => {
    setSaving(true)
    setSaveStatus('saved')
    setSaveError('')
    try {
      const normalizedNotes = ['entrance_password', 'cleaning_notes', 'payment_date', 'payment_amount', 'manager_memo'].map((key) => {
        const note = getNote(key)
        return {
          note_key: key,
          content: key === 'manager_memo' ? '' : note?.content || '',
          visible_to_staff: key === 'entrance_password' || key === 'cleaning_notes',
          visible_to_store_manager: true,
          visible_to_owner: true,
        }
      })

      const guide = cleaningGuide.trim()
      const items = guide
        ? [
            {
              id: 'cleaning-guide',
              label: '청소 안내',
              cleaning_area: '청소 안내',
              cleaning_method: guide,
              checked: false,
            },
          ]
        : []

      await Promise.all([
        v2Fetch(`/api/v2/stores/${storeId}/notes`, {
          method: 'PATCH',
          body: JSON.stringify({ notes: normalizedNotes }),
        }),
        v2Fetch('/api/v2/checklist-templates', {
          method: 'POST',
          body: JSON.stringify({ store_id: storeId, title: '청소 안내', items }),
        }),
      ])

      v2InvalidateCache(`/api/v2/stores/${storeId}/notes`)
      v2InvalidateCache('/api/v2/checklist-templates')
    } catch (e: any) {
      setSaveStatus('error')
      setSaveError(e.message || '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (!store) return <div className="p-4">로딩 중...</div>

  return (
    <div className="max-w-3xl space-y-6">
      {saveStatus === 'saved' && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          저장완료
        </div>
      )}

      <Link href="/v2/manage/stores" className="text-blue-600 text-sm">
        ← 매장 목록
      </Link>
      <h1 className="text-2xl font-bold">{store.name}</h1>
      <p className="text-sm text-gray-500">
        {[store.region_sido, store.region_sigungu].filter(Boolean).join(' ')}
        {store.address ? ` · ${store.address}` : ''}
      </p>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">특이사항</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">출입 비밀번호</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              rows={2}
              value={getNote('entrance_password')?.content || ''}
              onChange={(e) => updateNote('entrance_password', e.target.value, true)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">청소 특이사항 / 관리자 메모</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              rows={4}
              value={getNote('cleaning_notes')?.content || ''}
              onChange={(e) => updateNote('cleaning_notes', e.target.value, true)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">결제일</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-gray-600">매월</span>
              <input
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                className="w-20 border rounded-lg px-3 py-2 text-sm"
                value={paymentDay}
                onChange={(e) => updateNote('payment_date', e.target.value.replace(/\D/g, '').slice(0, 2), false)}
              />
              <span className="text-sm text-gray-600">일</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">결제금액</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                inputMode="numeric"
                className="w-40 border rounded-lg px-3 py-2 text-sm"
                value={paymentAmount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '')
                  const formatted = digits ? Number(digits).toLocaleString('ko-KR') : ''
                  updateNote('payment_amount', formatted, false)
                }}
              />
              <span className="text-sm text-gray-600">원(vat포함)</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold">청소 위치 / 방법</h2>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          직원이 읽고 작업할 내용을 메모처럼 길게 적어주세요.
        </p>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={8}
          placeholder={'예)\n홀 바닥: 마른 걸레 후 물걸레\n화장실 세면대: 약품 사용 금지, 물자국 제거\n주방 입구: 쓰레기 분리수거 확인'}
          value={cleaningGuide}
          onChange={(e) => {
            setSaveStatus('idle')
            setSaveError('')
            setCleaningGuide(e.target.value)
          }}
        />
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
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold">사진 확인</h2>
          <input
            type="date"
            value={photoDate}
            onChange={(e) => setPhotoDate(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm"
          />
        </div>
        {(['before', 'after', 'issue', 'extra'] as const).map((kind) => {
          const rows = photos.filter((photo) => photo.kind === kind)
          const label =
            kind === 'before' ? '작업 전' : kind === 'after' ? '작업 후' : kind === 'issue' ? '문제' : '기타'
          return (
            <div key={kind} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{label}</p>
                <span className="text-xs text-gray-500">{rows.length}장</span>
              </div>
              {rows.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {rows.map((photo) => (
                    <a key={photo.id} href={photo.url || '#'} target="_blank" rel="noreferrer" className="block">
                      <img src={photo.url} alt="" className="aspect-square w-full rounded-lg object-cover bg-gray-100" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">사진 없음</p>
              )}
            </div>
          )
        })}
      </section>

      <div className="sticky bottom-4 z-10">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium shadow-lg disabled:opacity-60"
        >
          {saveStatus === 'saved' ? '저장됨' : saving ? '저장 중...' : '전체 저장'}
        </button>
        {saveStatus === 'error' && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {saveError}
          </p>
        )}
      </div>
    </div>
  )
}
