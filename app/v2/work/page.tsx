'use client'

import { useEffect, useRef, useState } from 'react'
import V2AdSlot from '@/components/v2/AdSlot'
import { v2Fetch, v2GetCached, v2InvalidateCache } from '@/lib/v2/client'
import { uploadV2Photo, type V2PhotoKind } from '@/lib/v2/photos'

type TodayData = {
  role?: string
  assignments: any[]
  today_stores?: any[]
  upcoming_stores?: any[]
  active_attendance: any[]
  checklist_runs: any[]
  checklist_guides?: any[]
}

type InlinePhoto = {
  id: string
  url: string
  kind: 'before' | 'after'
  status: 'queued' | 'uploading' | 'uploaded' | 'failed'
  file?: File
  error?: string
}

type IssuePreviewPhoto = {
  id: string
  url: string
  file: File
}

type IssueType = 'problem' | 'shortage' | 'other'

type IssueDraft = {
  content: string
  urgency: string
  files: IssuePreviewPhoto[]
}

const createIssueDraft = (): IssueDraft => ({
  content: '',
  urgency: 'normal',
  files: [],
})

export default function V2WorkHomePage() {
  const beforeInputRef = useRef<HTMLInputElement | null>(null)
  const afterInputRef = useRef<HTMLInputElement | null>(null)
  const issueInputRef = useRef<HTMLInputElement | null>(null)
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [showPostClockAd, setShowPostClockAd] = useState(false)
  const [confirmClockInStoreId, setConfirmClockInStoreId] = useState('')
  const [confirmClockOut, setConfirmClockOut] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(true)
  const [message, setMessage] = useState('')
  const [photoCounts, setPhotoCounts] = useState({ before: 0, after: 0 })
  const [inlinePhotos, setInlinePhotos] = useState<InlinePhoto[]>([])
  const [photoUploading, setPhotoUploading] = useState<V2PhotoKind | null>(null)
  const [workTab, setWorkTab] = useState<'before' | 'after' | 'issue'>('before')
  const [issueType, setIssueType] = useState<IssueType>('problem')
  const [issueDrafts, setIssueDrafts] = useState<Record<IssueType, IssueDraft>>({
    problem: createIssueDraft(),
    shortage: createIssueDraft(),
    other: createIssueDraft(),
  })
  const [issueSaving, setIssueSaving] = useState(false)

  const load = () => {
    v2GetCached<TodayData>('/api/v2/work/today', 30_000)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const active = data?.active_attendance?.[0]
  const todayStores = data?.today_stores || []
  const upcomingStores = data?.upcoming_stores || []
  const stores = todayStores.length || upcomingStores.length ? [...todayStores, ...upcomingStores] : data?.assignments || []
  const isOwner = data?.role === 'business_owner'
  const activeStore = active?.v2_stores
  const activeChecklist = [
    ...(data?.checklist_runs || []),
    ...(data?.checklist_guides || []),
  ].find((run: any) => run.store_id === active?.store_id)
  const currentIssueDraft = issueDrafts[issueType]

  const updateIssueDraft = (patch: Partial<IssueDraft>) => {
    setIssueDrafts((prev) => ({
      ...prev,
      [issueType]: {
        ...prev[issueType],
        ...patch,
      },
    }))
  }

  useEffect(() => {
    if (!active?.store_id) {
      setPhotoCounts({ before: 0, after: 0 })
      return
    }
    const query = active.work_date
      ? `/api/v2/photos?store_id=${active.store_id}&work_date=${active.work_date}`
      : `/api/v2/photos?store_id=${active.store_id}`
    v2Fetch<{ photos: any[] }>(query)
      .then((d) => {
        const rows = (d.photos || [])
          .filter((p) => p.kind === 'before' || p.kind === 'after')
          .map((p) => ({
            id: p.id,
            url: p.url,
            kind: p.kind,
            status: 'uploaded' as const,
          }))
        setInlinePhotos(rows)
        setPhotoCounts({
          before: (d.photos || []).filter((p) => p.kind === 'before').length,
          after: (d.photos || []).filter((p) => p.kind === 'after').length,
        })
      })
      .catch(() => {
        setInlinePhotos([])
        setPhotoCounts({ before: 0, after: 0 })
      })
  }, [active?.store_id, active?.work_date])

  const renderStorePublicNotes = (store: any) => {
    const notes = store?.public_notes || {}
    if (!notes.entrance_password && !notes.cleaning_notes) return null
    return (
      <div className="mt-2 space-y-1 text-xs text-gray-600">
        {notes.entrance_password && (
          <p><span className="font-medium text-gray-700">출입:</span> {notes.entrance_password}</p>
        )}
        {notes.cleaning_notes && (
          <p><span className="font-medium text-gray-700">특이사항:</span> {notes.cleaning_notes}</p>
        )}
      </div>
    )
  }

  const renderStoreCard = (a: any, showNextDay = false) => {
    const store = a.v2_stores
    if (!store?.service_active) return null
    const confirming = confirmClockInStoreId === a.store_id

    return (
      <div key={a.store_id} className="bg-white border rounded-xl p-4">
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <p className="font-medium">{store.name}</p>
            {showNextDay && a.next_day_label && (
              <p className="text-xs text-blue-600 mt-1">{a.next_day_label}</p>
            )}
            {store.management_days && (
              <p className="text-xs text-gray-500 mt-1">관리일: {store.management_days}</p>
            )}
          </div>
          {!confirming && (
            <button
              type="button"
              disabled={clocking}
              onClick={() => setConfirmClockInStoreId(a.store_id)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            >
              출근
            </button>
          )}
        </div>
        {renderStorePublicNotes(store)}
        {confirming && (
          <div className="mt-3 rounded-lg bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">{store.name} 출근할까요?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmClockInStoreId('')}
                className="rounded-lg border border-blue-200 bg-white py-2 text-sm text-blue-700"
              >
                취소
              </button>
              <button
                type="button"
                disabled={clocking}
                onClick={() => clockIn(a.store_id)}
                className="rounded-lg bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                출근 확정
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const uploadPhotos = async (files: FileList | null, kind: V2PhotoKind) => {
    if (!files?.length || !active?.store_id) return
    if (kind !== 'before' && kind !== 'after') return
    const localRows: InlinePhoto[] = Array.from(files).map((file) => ({
      id: `local-${crypto.randomUUID()}`,
      url: URL.createObjectURL(file),
      kind,
      status: 'queued',
      file,
    }))
    setInlinePhotos((prev) => [...localRows, ...prev])
    setPhotoUploading(kind)
    setMessage(kind === 'before' ? '관리전 사진 업로드 중...' : '관리후 사진 업로드 중...')
    try {
      let failedCount = 0
      for (const row of localRows) {
        if (!row.file) continue
        setInlinePhotos((prev) =>
          prev.map((p) => (p.id === row.id ? { ...p, status: 'uploading' } : p))
        )
        try {
          const uploaded = await uploadV2Photo({
            file: row.file,
            storeId: active.store_id,
            kind,
          })
          setInlinePhotos((prev) =>
            prev.map((p) =>
              p.id === row.id
                ? {
                    ...p,
                    id: uploaded.id || p.id,
                    url: uploaded.url || p.url,
                    status: 'uploaded',
                    file: undefined,
                  }
                : p
            )
          )
          setPhotoCounts((prev) => ({
            ...prev,
            [kind]: prev[kind] + 1,
          }))
        } catch (e: any) {
          failedCount += 1
          setInlinePhotos((prev) =>
            prev.map((p) =>
              p.id === row.id ? { ...p, status: 'failed', error: e.message || '업로드 실패' } : p
            )
          )
        }
      }
      v2InvalidateCache('/api/v2/photos')
      setMessage(failedCount > 0 ? '일부 사진 업로드 실패' : '사진 저장완료')
      window.setTimeout(() => setMessage(''), 1800)
    } finally {
      setPhotoUploading(null)
      if (beforeInputRef.current) beforeInputRef.current.value = ''
      if (afterInputRef.current) afterInputRef.current.value = ''
    }
  }

  const retryInlinePhoto = async (photo: InlinePhoto) => {
    if (!photo.file || !active?.store_id) return
    setInlinePhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, status: 'uploading', error: undefined } : p))
    )
    try {
      const uploaded = await uploadV2Photo({
        file: photo.file,
        storeId: active.store_id,
        kind: photo.kind,
      })
      setInlinePhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id
            ? { ...p, id: uploaded.id || p.id, url: uploaded.url || p.url, status: 'uploaded', file: undefined }
            : p
        )
      )
      setPhotoCounts((prev) => ({ ...prev, [photo.kind]: prev[photo.kind] + 1 }))
      v2InvalidateCache('/api/v2/photos')
    } catch (e: any) {
      setInlinePhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, status: 'failed', error: e.message || '업로드 실패' } : p
        )
      )
    }
  }

  const renderInlinePhotoGrid = (kind: 'before' | 'after') => {
    const rows = inlinePhotos.filter((photo) => photo.kind === kind)
    if (!rows.length) return null
    return (
      <div className="grid grid-cols-3 gap-2">
        {rows.map((photo) => (
          <div key={photo.id} className="overflow-hidden rounded-lg border bg-white">
            <img src={photo.url} alt="" className="aspect-square w-full object-cover bg-gray-100" />
            <div className="px-2 py-1 text-[11px]">
              <span
                className={
                  photo.status === 'uploaded'
                    ? 'text-green-600'
                    : photo.status === 'failed'
                      ? 'text-red-600'
                      : 'text-blue-600'
                }
              >
                {photo.status === 'queued'
                  ? '대기'
                  : photo.status === 'uploading'
                    ? '업로드 중'
                    : photo.status === 'failed'
                      ? '실패'
                      : '완료'}
              </span>
              {photo.status === 'failed' && (
                <button type="button" onClick={() => retryInlinePhoto(photo)} className="ml-2 text-red-600 underline">
                  재시도
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!active?.store_id || issueSaving) return
    const draft = issueDrafts[issueType]
    const content = draft.content.trim()
    if (!content) {
      setMessage('이슈 내용을 입력하세요.')
      return
    }
    setIssueSaving(true)
    setMessage('이슈 등록 중...')
    try {
      const title = content.split('\n')[0].slice(0, 30) || '이슈'
      const res = await v2Fetch<{ issue: any }>('/api/v2/issues', {
        method: 'POST',
        body: JSON.stringify({
          store_id: active.store_id,
          title,
          description: content,
          issue_type: issueType,
          needs_approval: false,
          item_name: null,
          requested_quantity: null,
          urgency: draft.urgency,
          resolution_type: issueType === 'shortage' ? 'supply_request' : null,
        }),
      })

      for (const photo of draft.files) {
        await uploadV2Photo({
          file: photo.file,
          storeId: active.store_id,
          kind: 'issue',
          issueId: res.issue.id,
          memo: content,
        })
      }

      v2InvalidateCache('/api/v2/issues')
      v2InvalidateCache('/api/v2/stores/summary')
      v2InvalidateCache('/api/v2/photos')
      setIssueDrafts((prev) => ({
        ...prev,
        [issueType]: createIssueDraft(),
      }))
      if (issueInputRef.current) issueInputRef.current.value = ''
      setMessage('이슈 등록완료')
      window.setTimeout(() => setMessage(''), 1800)
    } catch (e: any) {
      setMessage(e.message || '이슈 등록 실패')
    } finally {
      setIssueSaving(false)
    }
  }

  const renderActiveWorkFlow = () => {
    const guideItems = activeChecklist?.items || []
    const tabs = [
      { key: 'before', label: '관리전 사진', count: photoCounts.before },
      { key: 'after', label: '관리후 사진', count: photoCounts.after },
      { key: 'issue', label: '이슈', count: currentIssueDraft.files.length },
    ] as const
    return (
      <div className="space-y-4">
        {message && (
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
        )}

        <section className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="font-medium text-green-800">
            출근 중: {activeStore?.name || '매장'}
          </p>
          <p className="text-sm text-green-700 mt-1">
            {new Date(active.clock_in_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {renderStorePublicNotes(activeStore)}
        </section>

        <section className="bg-white border rounded-xl p-4">
          <button
            type="button"
            onClick={() => setChecklistOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="font-semibold">청소 안내</span>
            <span className="text-sm text-blue-600">{checklistOpen ? '접기 ▲' : '보기 ▼'}</span>
          </button>
          {checklistOpen && (
            <div className="mt-3 space-y-2">
              {guideItems.length ? (
                guideItems.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="font-medium">{item.cleaning_area || item.label || `항목 ${idx + 1}`}</p>
                    {item.cleaning_method && <p className="mt-1 whitespace-pre-wrap text-gray-700">{item.cleaning_method}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">등록된 청소 안내가 없습니다.</p>
              )}
            </div>
          )}
        </section>

        <section className="bg-white border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setWorkTab(tab.key)}
                className={`rounded-lg border py-2 text-sm font-medium ${
                  workTab === tab.key
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
              </button>
            ))}
          </div>

          {workTab === 'before' && (
            <div className="space-y-3">
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => uploadPhotos(e.target.files, 'before')}
              />
              <button
                type="button"
                disabled={photoUploading !== null}
                onClick={() => beforeInputRef.current?.click()}
                className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white disabled:opacity-60"
              >
                {photoUploading === 'before' ? '업로드 중...' : '관리전 사진 추가'}
              </button>
              {renderInlinePhotoGrid('before')}
            </div>
          )}

          {workTab === 'after' && (
            <div className="space-y-3">
              <input
                ref={afterInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => uploadPhotos(e.target.files, 'after')}
              />
              <button
                type="button"
                disabled={photoUploading !== null}
                onClick={() => afterInputRef.current?.click()}
                className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white disabled:opacity-60"
              >
                {photoUploading === 'after' ? '업로드 중...' : '관리후 사진 추가'}
              </button>
              {renderInlinePhotoGrid('after')}
            </div>
          )}

          {workTab === 'issue' && (
            <form onSubmit={submitIssue} className="space-y-3">
              <p className="text-sm text-gray-600">물품 부족, 파손, 특이사항은 이슈로 남겨주세요.</p>
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
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                placeholder={
                  issueType === 'shortage'
                    ? '부족한 품목과 수량을 적어주세요. 예: 화장지 2박스 부족'
                    : '무엇이 문제인지 적어주세요.'
                }
                rows={5}
                value={currentIssueDraft.content}
                onChange={(e) => updateIssueDraft({ content: e.target.value })}
                required
              />
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={currentIssueDraft.urgency}
                onChange={(e) => updateIssueDraft({ urgency: e.target.value })}
              >
                <option value="normal">보통</option>
                <option value="urgent">긴급</option>
              </select>
              <input
                ref={issueInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  const rows = Array.from(e.target.files || []).map((file) => ({
                    id: `issue-${crypto.randomUUID()}`,
                    url: URL.createObjectURL(file),
                    file,
                  }))
                  updateIssueDraft({ files: rows })
                }}
              />
              <button
                type="button"
                onClick={() => issueInputRef.current?.click()}
                className="w-full border border-blue-200 text-blue-700 py-2 rounded-lg"
              >
                이슈 사진 선택 {currentIssueDraft.files.length ? `(${currentIssueDraft.files.length}장)` : '(선택)'}
              </button>
              {currentIssueDraft.files.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {currentIssueDraft.files.map((photo) => (
                    <div key={photo.id} className="relative overflow-hidden rounded-lg border bg-white">
                      <img src={photo.url} alt="" className="aspect-square w-full object-cover bg-gray-100" />
                      <button
                        type="button"
                        onClick={() =>
                          updateIssueDraft({
                            files: currentIssueDraft.files.filter((p) => p.id !== photo.id),
                          })
                        }
                        className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="submit"
                disabled={issueSaving}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-60"
              >
                {issueSaving ? '등록 중...' : '이슈 등록'}
              </button>
            </form>
          )}
        </section>

        <section className="bg-white border rounded-xl p-4">
          {!confirmClockOut ? (
            <button
              type="button"
              disabled={clocking}
              onClick={() => setConfirmClockOut(true)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium disabled:opacity-60"
            >
              퇴근하기
            </button>
          ) : (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-sm font-medium text-green-900">정말 퇴근할까요?</p>
              {photoCounts.after === 0 && (
                <p className="mt-1 text-xs text-amber-700">관리후 사진이 아직 없습니다. 그래도 퇴근할 수 있습니다.</p>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClockOut(false)}
                  className="rounded-lg border border-green-200 bg-white py-2 text-sm text-green-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={clocking}
                  onClick={() => clockOut(active.store_id)}
                  className="rounded-lg bg-green-600 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  퇴근 확정
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    )
  }

  const clockIn = async (storeId: string) => {
    setClocking(true)
    setMessage('')
    try {
      await v2Fetch('/api/v2/attendance', {
        method: 'POST',
        body: JSON.stringify({ store_id: storeId }),
      })
      v2InvalidateCache('/api/v2/work/today')
      setConfirmClockInStoreId('')
      setShowPostClockAd(true)
      load()
    } catch (e: any) {
      setMessage(e.message || '출근 실패')
    } finally {
      setClocking(false)
    }
  }

  const clockOut = async (storeId: string) => {
    setClocking(true)
    setMessage('')
    try {
      await v2Fetch('/api/v2/attendance', {
        method: 'PATCH',
        body: JSON.stringify({ store_id: storeId }),
      })
      v2InvalidateCache('/api/v2/work/today')
      setConfirmClockOut(false)
      load()
    } catch (e: any) {
      setMessage(e.message || '퇴근 실패')
    } finally {
      setClocking(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">로딩 중...</div>
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <V2AdSlot slot="staff_home" className="mb-2" />

      {showPostClockAd && (
        <V2AdSlot slot="staff_clock_in" />
      )}

      <h1 className="text-xl font-bold">오늘의 근무</h1>

      {active ? (
        renderActiveWorkFlow()
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {isOwner ? '관리자는 회사 전체 매장에서 출근할 수 있습니다.' : '배정 매장에서 출근하세요.'}
          </p>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">오늘 근무지</h2>
              <span className="text-xs text-gray-500">{todayStores.length}곳</span>
            </div>
            {todayStores.length ? (
              todayStores.map((a: any) => renderStoreCard(a))
            ) : (
              <div className="bg-white border rounded-xl p-4 text-sm text-gray-500">
                오늘 관리일인 매장이 없습니다.
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">대기중 근무지</h2>
              <span className="text-xs text-gray-500">{upcomingStores.length}곳</span>
            </div>
            {upcomingStores.length ? (
              upcomingStores.map((a: any) => renderStoreCard(a, true))
            ) : (
              <div className="bg-white border rounded-xl p-4 text-sm text-gray-500">
                대기중인 근무지가 없습니다.
              </div>
            )}
          </section>

          {stores.length === 0 && (
            <p className="text-gray-500 text-sm">
              {isOwner ? '등록된 매장이 없습니다.' : '배정된 매장이 없습니다. 관리자에게 문의하세요.'}
            </p>
          )}
        </div>
      )}

      {!active && (data?.checklist_runs?.length || data?.checklist_guides?.length) ? (
        <div className="bg-white border rounded-xl p-4">
          <p className="font-medium mb-2">청소 안내</p>
          <a href="/v2/work/checklist" className="text-blue-600 text-sm font-medium">
            청소 안내 열기 →
          </a>
        </div>
      ) : null}
    </div>
  )
}
