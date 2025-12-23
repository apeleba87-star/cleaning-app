'use client'

import { useState, FormEvent } from 'react'
import { Store } from '@/types/db'
import { ChecklistItem } from '@/types/db'

interface User {
  id: string
  name: string
  role: string
}

interface ChecklistFormProps {
  storeId: string
  stores: Store[]
  staffUsers: User[]
  onSuccess: () => void
  onCancel: () => void
  initialChecklist?: Checklist | null // 수정용
}

interface Checklist {
  id: string
  store_id: string
  items: ChecklistItem[]
  note: string | null
  requires_photos?: boolean
  work_date?: string
}

export default function ChecklistForm({
  storeId,
  stores,
  staffUsers,
  onSuccess,
  onCancel,
  initialChecklist = null,
}: ChecklistFormProps) {
  const isEditMode = !!initialChecklist
  const [items, setItems] = useState<ChecklistItem[]>(
    initialChecklist?.items?.length > 0
      ? initialChecklist.items.map((item) => {
          // 기존 'photo' 타입을 'before_after_photo'로 변환
          if (item.type === 'photo') {
            return { ...item, type: 'before_after_photo' as const }
          }
          return item
        })
      : [{ area: '', type: 'check', status: 'good', checked: false, comment: '' }]
  )
  const [note, setNote] = useState(initialChecklist?.note || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedStore = stores.find((s) => s.id === storeId)

  const handleAddItem = () => {
    setItems([...items, { area: '', type: 'check', status: 'good', checked: false, comment: '' }])
  }

  const handleItemTypeChange = (index: number, type: 'check' | 'before_photo' | 'after_photo' | 'before_after_photo') => {
    const newItems = [...items]
    if (type === 'check') {
      newItems[index] = { ...newItems[index], type: 'check', status: 'good', checked: false, before_photo_url: null, after_photo_url: null }
    } else {
      newItems[index] = { ...newItems[index], type, status: undefined, checked: undefined, before_photo_url: null, after_photo_url: null }
    }
    setItems(newItems)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof ChecklistItem, value: string | boolean) => {
    const newItems = [...items]
    if (field === 'checked') {
      newItems[index] = { ...newItems[index], [field]: value as boolean }
    } else {
      newItems[index] = { ...newItems[index], [field]: value as string }
    }
    setItems(newItems)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 유효성 검사
    const validItems = items.filter((item) => item.area.trim() !== '')
    if (validItems.length === 0) {
      setError('최소 하나의 체크리스트 항목을 입력해주세요.')
      setLoading(false)
      return
    }

    // bad 상태인 경우 comment 필수
    const invalidItems = validItems.filter(
      (item) => item.status === 'bad' && !item.comment?.trim()
    )
    if (invalidItems.length > 0) {
      setError('"불량" 상태인 항목은 코멘트를 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      const url = isEditMode
        ? `/api/business/checklists/${initialChecklist.id}`
        : '/api/business/checklists'
      
      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: storeId,
          items: validItems.map((item) => ({
            area: item.area.trim(),
            type: item.type,
            status: item.type === 'check' ? item.status : undefined,
            checked: item.type === 'check' ? item.checked || false : undefined,
            comment: item.comment?.trim() || undefined,
            before_photo_url: (item.type === 'before_photo' || item.type === 'before_after_photo') ? item.before_photo_url : undefined,
            after_photo_url: (item.type === 'after_photo' || item.type === 'before_after_photo') ? item.after_photo_url : undefined,
          })),
          note: note.trim() || null,
        }),
      })

      // Content-Type 확인
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`서버 오류가 발생했습니다. (${response.status} ${response.statusText})`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || (isEditMode ? '체크리스트 수정에 실패했습니다.' : '체크리스트 생성에 실패했습니다.'))
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        {isEditMode ? '체크리스트 수정' : '새 체크리스트 생성'} - {selectedStore?.name}
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            체크리스트 항목 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-start space-x-2 p-3 border border-gray-200 rounded-md">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="항목명 (예: 홀 바닥, 주방 싱크)"
                    value={item.area}
                    onChange={(e) => handleItemChange(index, 'area', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2">
                    <select
                      value={item.type}
                      onChange={(e) => handleItemTypeChange(index, e.target.value as 'check' | 'before_photo' | 'after_photo' | 'before_after_photo')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="check">일반 체크</option>
                      <option value="before_photo">관리 전 사진</option>
                      <option value="after_photo">관리 후 사진</option>
                      <option value="before_after_photo">관리 전/후 사진</option>
                    </select>
                    {item.type === 'check' && (
                      <>
                        <select
                          value={item.status || 'good'}
                          onChange={(e) =>
                            handleItemChange(index, 'status', e.target.value as 'good' | 'bad')
                          }
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="good">양호</option>
                          <option value="bad">불량</option>
                        </select>
                        <input
                          type="text"
                          placeholder={item.status === 'bad' ? '코멘트 (필수)' : '코멘트 (선택)'}
                          value={item.comment || ''}
                          onChange={(e) => handleItemChange(index, 'comment', e.target.value)}
                          className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            item.status === 'bad' && !item.comment?.trim()
                              ? 'border-red-300'
                              : ''
                          }`}
                        />
                      </>
                    )}
                    {(item.type === 'before_photo' || item.type === 'after_photo' || item.type === 'before_after_photo') && (
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 mb-2">
                          {item.type === 'before_photo' && '관리 전 사진만 촬영합니다.'}
                          {item.type === 'after_photo' && '관리 후 사진만 촬영합니다.'}
                          {item.type === 'before_after_photo' && '관리 전/후 사진을 모두 촬영해야 합니다.'}
                        </div>
                        <input
                          type="text"
                          placeholder="코멘트 입력 (선택)"
                          value={item.comment || ''}
                          onChange={(e) => handleItemChange(index, 'comment', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    )}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md"
          >
            + 항목 추가
          </button>
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
            비고
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="특이사항이나 참고사항을 입력하세요"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (isEditMode ? '수정 중...' : '생성 중...') : (isEditMode ? '수정' : '생성')}
          </button>
        </div>
      </form>
    </div>
  )
}

