'use client'

import { useEffect, useState } from 'react'

export type PhotoReviewEntry = {
  checklist_id: string
  store_id: string
  store_name: string
  work_date: string
  user_name: string | null
  item_index: number
  item_area: string
  item_type: string
  photo_type: 'before' | 'after'
  photo_url: string
  reviewed_at: string | null
}

function entryKey(entry: PhotoReviewEntry) {
  return `${entry.checklist_id}-${entry.item_index}-${entry.photo_type}`
}

export default function PhotoReviewsClient() {
  const [entries, setEntries] = useState<PhotoReviewEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [confirmingBatch, setConfirmingBatch] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [viewingEntry, setViewingEntry] = useState<PhotoReviewEntry | null>(null)

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/business/photo-reviews')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '목록 조회 실패')
      setEntries(json.data || [])
      setSelectedKeys(new Set())
    } catch (e: any) {
      console.error(e)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const updateEntryReviewed = (key: string, reviewedAt: string) => {
    setEntries((prev) =>
      prev.map((e) => (entryKey(e) === key ? { ...e, reviewed_at: reviewedAt } : e))
    )
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const handleConfirm = async (entry: PhotoReviewEntry) => {
    const key = entryKey(entry)
    setConfirming(key)
    try {
      const res = await fetch('/api/business/photo-reviews/confirm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_id: entry.checklist_id,
          item_index: entry.item_index,
          photo_type: entry.photo_type,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '확인 처리 실패')
      const reviewedAt = json.reviewed_at || new Date().toISOString()
      updateEntryReviewed(key, reviewedAt)
    } catch (e: any) {
      alert(e?.message || '확인 처리에 실패했습니다.')
    } finally {
      setConfirming(null)
    }
  }

  const handleConfirmSelected = async () => {
    const toConfirm = entries.filter((e) => !e.reviewed_at && selectedKeys.has(entryKey(e)))
    if (toConfirm.length === 0) return
    setConfirmingBatch(true)
    const reviewedAt = new Date().toISOString()
    let failed = 0
    for (const entry of toConfirm) {
      try {
        const res = await fetch('/api/business/photo-reviews/confirm', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checklist_id: entry.checklist_id,
            item_index: entry.item_index,
            photo_type: entry.photo_type,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        updateEntryReviewed(entryKey(entry), json.reviewed_at || reviewedAt)
      } catch {
        failed++
      }
    }
    setConfirmingBatch(false)
    if (failed > 0) alert(`${failed}건 확인 처리에 실패했습니다.`)
  }

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedCount = selectedKeys.size

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center text-gray-600">
        검수할 갤러리 선택 사진이 없습니다.
      </div>
    )
  }

  return (
    <>
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center justify-between gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedCount}건 선택됨
          </span>
          <button
            type="button"
            onClick={handleConfirmSelected}
            disabled={confirmingBatch}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {confirmingBatch ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                처리 중...
              </>
            ) : (
              `선택 항목 확인 (${selectedCount}건)`
            )}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => {
          const key = entryKey(entry)
          const isConfirmed = !!entry.reviewed_at
          const isConfirming = confirming === key
          const isSelected = selectedKeys.has(key)
          return (
            <div
              key={key}
              className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
            >
              {!isConfirmed && (
                <div className="flex-shrink-0 flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(key)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => entry.photo_url && setViewingEntry(entry)}
                className="flex-shrink-0 w-24 h-24 rounded overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                {entry.photo_url ? (
                  <img
                    src={entry.photo_url}
                    alt=""
                    className="w-full h-full object-cover hover:opacity-90"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    미리보기 없음
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{entry.store_name}</p>
                <p className="text-sm text-gray-500">
                  {entry.work_date} · {entry.item_area} ·{' '}
                  {entry.photo_type === 'before' ? '관리전' : '관리후'}
                </p>
                {entry.user_name && (
                  <p className="text-xs text-gray-500">직원: {entry.user_name}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {isConfirmed ? (
                  <span className="text-sm text-green-600 font-medium">
                    검수 완료 (
                    {entry.reviewed_at
                      ? new Date(entry.reviewed_at).toLocaleString('ko-KR')
                      : ''}
                    )
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConfirm(entry)}
                    disabled={isConfirming}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isConfirming ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        처리 중...
                      </>
                    ) : (
                      '확인'
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 큰 이미지 보기 모달 */}
      {viewingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setViewingEntry(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewingEntry(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-200 text-sm font-medium"
            >
              닫기
            </button>
            <img
              src={viewingEntry.photo_url}
              alt=""
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded shadow-lg"
            />
            <p className="absolute -bottom-8 left-0 right-0 text-center text-white text-sm">
              {viewingEntry.store_name} · {viewingEntry.work_date} ·{' '}
              {viewingEntry.item_area} ·{' '}
              {viewingEntry.photo_type === 'before' ? '관리전' : '관리후'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
