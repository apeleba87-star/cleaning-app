'use client'

import { useState, useCallback } from 'react'

interface OperationMemoSectionProps {
  storeId: string
  storeName: string
  className?: string
}

interface MemoData {
  access_info: string | null
  special_notes: string | null
  has_memo: boolean
}

export default function OperationMemoSection({
  storeId,
  storeName,
  className = '',
}: OperationMemoSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<MemoData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchMemo = useCallback(async () => {
    if (data !== null) return // 이미 로드됨
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/stores/${storeId}/operation-memo`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || '운영 메모를 불러오는데 실패했습니다.')
      }
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '운영 메모를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [storeId, data])

  const handleToggle = () => {
    if (!expanded) {
      fetchMemo()
    }
    setExpanded((prev) => !prev)
  }

  return (
    <div className={`mt-2 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-gray-500">📋</span>
          출입키 정보 {expanded ? '접기' : '보기'}
        </span>
        <span className={`inline-block transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm">
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
              <span>로딩 중...</span>
            </div>
          )}
          {error && (
            <p className="text-red-600 py-2">{error}</p>
          )}
          {!loading && !error && data && (
            <>
              {!data.has_memo ? (
                <p className="text-gray-500">등록된 운영 메모가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    ⚠️ 출입정보는 외부에 공유하지 마세요.
                  </p>
                  {data.access_info && (
                    <div>
                      <p className="font-medium text-gray-700 mb-1">출입 정보</p>
                      <p className="text-gray-800 whitespace-pre-wrap">{data.access_info}</p>
                    </div>
                  )}
                  {data.special_notes && (
                    <div>
                      <p className="font-medium text-gray-700 mb-1">특이사항/주의사항</p>
                      <p className="text-gray-800 whitespace-pre-wrap">{data.special_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
