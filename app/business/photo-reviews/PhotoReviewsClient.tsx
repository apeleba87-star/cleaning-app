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

export default function PhotoReviewsClient() {
  const [entries, setEntries] = useState<PhotoReviewEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/business/photo-reviews')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '목록 조회 실패')
      setEntries(json.data || [])
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

  const handleConfirm = async (entry: PhotoReviewEntry) => {
    const key = `${entry.checklist_id}-${entry.item_index}-${entry.photo_type}`
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
      await fetchList()
    } catch (e: any) {
      alert(e?.message || '확인 처리에 실패했습니다.')
    } finally {
      setConfirming(null)
    }
  }

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
    <div className="space-y-4">
      {entries.map((entry) => {
        const key = `${entry.checklist_id}-${entry.item_index}-${entry.photo_type}`
        const isConfirmed = !!entry.reviewed_at
        const isConfirming = confirming === key
        return (
          <div
            key={key}
            className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
          >
            <div className="flex-shrink-0 w-24 h-24 rounded overflow-hidden bg-gray-100">
              {entry.photo_url ? (
                <img
                  src={entry.photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">미리보기 없음</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{entry.store_name}</p>
              <p className="text-sm text-gray-500">
                {entry.work_date} · {entry.item_area} · {entry.photo_type === 'before' ? '관리전' : '관리후'}
              </p>
              {entry.user_name && (
                <p className="text-xs text-gray-500">직원: {entry.user_name}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              {isConfirmed ? (
                <span className="text-sm text-green-600 font-medium">
                  검수 완료 ({entry.reviewed_at ? new Date(entry.reviewed_at).toLocaleString('ko-KR') : ''})
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
  )
}
