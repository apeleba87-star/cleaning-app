'use client'

import { useState, useEffect } from 'react'
import { ChecklistItem } from '@/types/db'
import { createClient } from '@/lib/supabase/client'
import { Checklist } from '@/types/db'
import { ChecklistTable } from './ChecklistTable'
import { ChecklistCalendar } from '@/components/ChecklistCalendar'
import { PhotoUploader } from '@/components/PhotoUploader'

export default function ChecklistPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  // 체크리스트 수행 폼 상태
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | null>(null)
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    loadAssignedChecklists()
  }, [])

  const loadAssignedChecklists = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    // 자신에게 배정된 체크리스트 조회 (pending 상태만, 또는 모든 상태)
    const { data, error } = await supabase
      .from('checklist')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .eq('assigned_user_id', session.user.id)
      .order('work_date', { ascending: false })

    if (error) {
      console.error('Error loading checklists:', error)
      setError('체크리스트를 불러오는 중 오류가 발생했습니다.')
    } else {
      setChecklists(data || [])
    }
    setLoading(false)
  }

  const handleSelectChecklist = (checklist: Checklist) => {
    setSelectedChecklist(checklist)
    // 기존 항목이 있으면 사용, 없으면 빈 배열
    const checklistItems = Array.isArray(checklist.items) ? checklist.items : []
    // 타입이 없는 경우 기본값 설정
    const normalizedItems = checklistItems.map((item: any) => ({
      ...item,
      type: item.type || 'check',
      checked: item.checked || false,
    }))
    setItems(normalizedItems)
    setBeforePhotoUrl(checklist.before_photo_url || null)
    setAfterPhotoUrl(checklist.after_photo_url || null)
    setNote(checklist.note || '')
    setError(null)
  }

  const handleItemsChange = (updatedItems: ChecklistItem[]) => {
    setItems(updatedItems)
  }

  const handleSubmit = async () => {
    if (!selectedChecklist) return

    // 유효성 검사
    const validItems = items.filter((item) => item.area.trim() !== '')
    if (validItems.length === 0) {
      setError('최소 하나의 체크리스트 항목을 입력해주세요.')
      return
    }

    // 필수 사진 검증 (체크리스트 레벨)
    if (selectedChecklist.requires_photos) {
      if (!beforePhotoUrl || !afterPhotoUrl) {
        setError('이 체크리스트는 관리 전/후 사진이 필수입니다.')
        return
      }
    }

    // 사진 필요 항목 검증
    const photoItems = validItems.filter((item) => item.type === 'photo')
    const incompletePhotoItems = photoItems.filter(
      (item) => !item.before_photo_url || !item.after_photo_url
    )
    if (incompletePhotoItems.length > 0) {
      setError('사진 필요 항목은 관리 전/후 사진을 모두 촬영해야 합니다.')
      return
    }

    // bad 상태인 경우 comment 필수
    const invalidItems = validItems.filter(
      (item) => item.type === 'check' && item.status === 'bad' && !item.comment?.trim()
    )
    if (invalidItems.length > 0) {
      setError('"불량" 상태인 항목은 코멘트를 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/staff/checklists/${selectedChecklist.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: validItems.map((item) => {
            if (item.type === 'check') {
              return {
                area: item.area.trim(),
                type: 'check',
                status: item.status,
                checked: item.checked || false,
                comment: item.comment?.trim() || undefined,
              }
            } else {
              return {
                area: item.area.trim(),
                type: 'photo',
                before_photo_url: item.before_photo_url,
                after_photo_url: item.after_photo_url,
                comment: item.comment?.trim() || undefined,
              }
            }
          }),
          before_photo_url: beforePhotoUrl,
          after_photo_url: afterPhotoUrl,
          note: note.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '체크리스트 제출에 실패했습니다.')
      }

      alert('체크리스트가 제출되었습니다.')
      setSelectedChecklist(null)
      loadAssignedChecklists()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    const checklist = checklists.find((c) => c.work_date === date)
    if (checklist) {
      handleSelectChecklist(checklist)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (selectedChecklist) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mb-20 md:mb-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">체크리스트 수행</h1>
          <button
            onClick={() => setSelectedChecklist(null)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← 목록으로
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">
              {(selectedChecklist as any).stores?.name || '매장'} - 체크리스트
            </h2>
            <p className="text-sm text-gray-500">
              작업일: {new Date(selectedChecklist.work_date).toLocaleDateString('ko-KR')}
            </p>
            {selectedChecklist.note && (
              <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                비고: {selectedChecklist.note}
              </p>
            )}
            {selectedChecklist.requires_photos && (
              <p className="text-sm text-red-600 mt-2 p-2 bg-red-50 rounded font-medium">
                ⚠️ 이 체크리스트는 관리 전/후 사진 촬영이 필수입니다.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* 체크리스트 테이블 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              체크리스트 항목 <span className="text-red-500">*</span>
            </label>
            <ChecklistTable
              items={items}
              storeId={selectedChecklist.store_id}
              onItemsChange={handleItemsChange}
            />
          </div>

          {/* 전체 전후 사진 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전체 청소 전 사진 {selectedChecklist.requires_photos && <span className="text-red-500">* (필수)</span>}
              </label>
              {beforePhotoUrl ? (
                <div className="relative">
                  <img
                    src={beforePhotoUrl}
                    alt="청소 전"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <button
                    onClick={() => setBeforePhotoUrl(null)}
                    className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white rounded text-sm"
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <>
                  {selectedChecklist.requires_photos ? (
                    <PhotoUploader
                      storeId={selectedChecklist.store_id}
                      entity="checklist_before"
                      onUploadComplete={setBeforePhotoUrl}
                      onUploadError={setError}
                    />
                  ) : (
                    <div className="text-sm text-gray-500">
                      전체 청소 전 사진은 선택사항입니다. 개별 항목의 사진을 우선 촬영하세요.
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전체 청소 후 사진 {selectedChecklist.requires_photos && <span className="text-red-500">* (필수)</span>}
              </label>
              {afterPhotoUrl ? (
                <div className="relative">
                  <img
                    src={afterPhotoUrl}
                    alt="청소 후"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <button
                    onClick={() => setAfterPhotoUrl(null)}
                    className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white rounded text-sm"
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <>
                  {selectedChecklist.requires_photos ? (
                    <PhotoUploader
                      storeId={selectedChecklist.store_id}
                      entity="checklist_after"
                      onUploadComplete={setAfterPhotoUrl}
                      onUploadError={setError}
                    />
                  ) : (
                    <div className="text-sm text-gray-500">
                      전체 청소 후 사진은 선택사항입니다. 개별 항목의 사진을 우선 촬영하세요.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 비고 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              특이사항 (비고)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="특이사항이나 참고사항을 입력하세요"
            />
          </div>

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
          >
            {submitting ? '제출 중...' : '체크리스트 제출'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mb-20 md:mb-0">
      <h1 className="text-2xl font-bold">배정된 체크리스트</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 달력 */}
        <div className="lg:col-span-1">
          <ChecklistCalendar
            checklists={checklists}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate || undefined}
          />
        </div>

        {/* 체크리스트 목록 */}
        <div className="lg:col-span-2">
          {checklists.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">배정된 체크리스트가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold mb-2">
                        {(checklist as any).stores?.name || '매장'}
                      </h2>
                      <p className="text-sm text-gray-500 mb-2">
                        작업일: {new Date(checklist.work_date).toLocaleDateString('ko-KR')}
                      </p>
                      <p className="text-sm text-gray-600">
                        항목 수: {Array.isArray(checklist.items) ? checklist.items.length : 0}개
                      </p>
                      {checklist.requires_photos && (
                        <p className="text-sm text-red-600 mt-2 font-medium">
                          ⚠️ 필수 사진 촬영
                        </p>
                      )}
                      {checklist.note && (
                        <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                          비고: {checklist.note}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSelectChecklist(checklist)}
                      className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                      수행하기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



