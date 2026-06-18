'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { v2Fetch, v2GetCached, v2InvalidateCache } from '@/lib/v2/client'
import { uploadV2Photo, type V2PhotoKind } from '@/lib/v2/photos'

type StoreOption = { id: string; name: string }
type PhotoRow = {
  id: string
  url: string
  kind: V2PhotoKind
  status: 'queued' | 'uploading' | 'uploaded' | 'failed'
  file?: File
  error?: string
  created_at?: string
}

const KIND_LABELS: Record<V2PhotoKind, string> = {
  before: '작업 전',
  after: '작업 후',
  issue: '문제',
  extra: '기타',
}

export default function V2WorkPhotosPage() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [stores, setStores] = useState<StoreOption[]>([])
  const [storeId, setStoreId] = useState('')
  const [kind, setKind] = useState<V2PhotoKind>('before')
  const [memo, setMemo] = useState('')
  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === storeId),
    [stores, storeId]
  )

  useEffect(() => {
    v2GetCached<any>('/api/v2/work/today', 30_000)
      .then((d) => {
        const rows = (d.assignments || [])
          .map((a: any) => ({ id: a.store_id, name: a.v2_stores?.name || '매장' }))
          .filter((s: StoreOption) => s.id)
        setStores(rows)
        const activeStoreId = d.active_attendance?.[0]?.store_id
        setStoreId(activeStoreId || rows[0]?.id || '')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!storeId) return
    v2Fetch<{ photos: any[] }>(`/api/v2/photos?store_id=${storeId}`)
      .then((d) =>
        setPhotos(
          (d.photos || []).map((p: any) => ({
            id: p.id,
            url: p.url,
            kind: p.kind,
            status: 'uploaded',
            created_at: p.created_at,
          }))
        )
      )
      .catch(() => setPhotos([]))
  }, [storeId])

  const uploadQueued = async (rows: PhotoRow[]) => {
    if (!storeId || uploading) return
    setUploading(true)
    try {
      for (const row of rows) {
        if (!row.file) continue
        setPhotos((prev) =>
          prev.map((p) => (p.id === row.id ? { ...p, status: 'uploading' } : p))
        )
        try {
          const uploaded = await uploadV2Photo({
            file: row.file,
            storeId,
            kind: row.kind,
            memo,
          })
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === row.id
                ? { ...p, ...uploaded, id: uploaded.id, url: uploaded.url || p.url, status: 'uploaded', file: undefined }
                : p
            )
          )
          v2InvalidateCache('/api/v2/photos')
        } catch (e: any) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === row.id ? { ...p, status: 'failed', error: e.message || '업로드 실패' } : p
            )
          )
        }
      }
    } finally {
      setUploading(false)
    }
  }

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const rows = Array.from(files).map((file) => ({
      id: `local-${crypto.randomUUID()}`,
      url: URL.createObjectURL(file),
      kind,
      status: 'queued' as const,
      file,
    }))
    setPhotos((prev) => [...rows, ...prev])
    uploadQueued(rows)
    if (inputRef.current) inputRef.current.value = ''
  }

  const retry = (photo: PhotoRow) => {
    if (!photo.file) return
    uploadQueued([photo])
  }

  if (loading) return <div className="p-6 text-center text-gray-500">로딩 중...</div>

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold">사진 남기기</h1>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(KIND_LABELS) as V2PhotoKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-lg border py-2 text-sm ${
                kind === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
              }`}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="사진 메모 선택 입력"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={!storeId}
          onClick={() => inputRef.current?.click()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {selectedStore ? `${KIND_LABELS[kind]} 사진 추가` : '매장을 먼저 선택하세요'}
        </button>
        <p className="text-xs text-gray-500">
          사진은 즉시 목록에 표시되고, 업로드는 한 장씩 순차 진행됩니다.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">사진 목록</h2>
          {uploading && <span className="text-xs text-blue-600">업로드 중</span>}
        </div>
        {photos.length === 0 && (
          <div className="bg-white border rounded-xl p-4 text-sm text-gray-500">
            아직 등록된 사진이 없습니다.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white border rounded-xl overflow-hidden">
              {photo.url ? (
                <img src={photo.url} alt="" className="w-full aspect-square object-cover bg-gray-100" />
              ) : (
                <div className="w-full aspect-square bg-gray-100" />
              )}
              <div className="p-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{KIND_LABELS[photo.kind] || photo.kind}</span>
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
                </div>
                {photo.status === 'failed' && (
                  <button type="button" onClick={() => retry(photo)} className="mt-2 text-red-600 font-medium">
                    재시도
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
