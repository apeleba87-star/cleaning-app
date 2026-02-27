'use client'

import { useState, FormEvent } from 'react'
import { Store } from '@/types/db'
import { ChecklistItem } from '@/types/db'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

interface ChecklistItemWithId extends ChecklistItem {
  _tempId: string // 드래그 앤 드롭을 위한 임시 ID
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
  
  // 초기 items에 임시 ID 추가
  const initializeItems = (): ChecklistItemWithId[] => {
    const baseItems = initialChecklist?.items?.length > 0
      ? initialChecklist.items.map((item: any) => {
          // 기존 'photo' 타입을 'before_after_photo'로 변환 (하위 호환성)
          if (item.type === 'photo') {
            return { ...item, type: 'before_after_photo' as const }
          }
          return item
        })
      : [{ area: '', type: 'check', status: 'good', checked: false, comment: '' }]
    
    return baseItems.map((item, index) => ({
      ...item,
      _tempId: `item-${Date.now()}-${index}`, // 고유 ID 생성
    }))
  }
  
  const [items, setItems] = useState<ChecklistItemWithId[]>(initializeItems())
  const [note, setNote] = useState(initialChecklist?.note || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedStore = stores.find((s) => s.id === storeId)

  // 드래그 앤 드롭 센서 설정 (모바일: 스크롤과 구분 위해 거리 8px 이상일 때만 드래그)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item._tempId === active.id)
        const newIndex = items.findIndex((item) => item._tempId === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        area: '',
        type: 'check',
        status: 'good',
        checked: false,
        comment: '',
        _tempId: `item-${Date.now()}-${items.length}`,
      },
    ])
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
          items: validItems.map((item) => {
            // _tempId 제거하고 저장
            const { _tempId, ...itemWithoutId } = item
            const itemToSave = {
              area: itemWithoutId.area.trim(),
              type: itemWithoutId.type,
              status: itemWithoutId.type === 'check' ? itemWithoutId.status : undefined,
              checked: itemWithoutId.type === 'check' ? itemWithoutId.checked || false : undefined,
              comment: itemWithoutId.comment?.trim() || undefined,
              before_photo_url: (itemWithoutId.type === 'before_photo' || itemWithoutId.type === 'before_after_photo') ? itemWithoutId.before_photo_url : undefined,
              after_photo_url: (itemWithoutId.type === 'after_photo' || itemWithoutId.type === 'before_after_photo') ? itemWithoutId.after_photo_url : undefined,
            }
            // 디버깅: 저장되는 타입 확인
            console.log('💾 Saving checklist item:', {
              area: itemToSave.area,
              type: itemToSave.type,
              before_photo_url: itemToSave.before_photo_url ? 'exists' : 'null',
              after_photo_url: itemToSave.after_photo_url ? 'exists' : 'null'
            })
            return itemToSave
          }),
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
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 max-w-full">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 break-words">
        {isEditMode ? '체크리스트 수정' : '새 체크리스트 생성'}
        <span className="block text-base font-normal text-gray-600 mt-1 sm:inline sm:ml-2 sm:mt-0">
          {selectedStore?.name}
        </span>
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(item => item._tempId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <SortableItem
                    key={item._tempId}
                    item={item}
                    index={index}
                    onItemChange={handleItemChange}
                    onItemTypeChange={handleItemTypeChange}
                    onRemoveItem={handleRemoveItem}
                    itemsLength={items.length}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={handleAddItem}
            className="mt-2 w-full sm:w-auto px-4 py-2.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md touch-manipulation"
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
            className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
            placeholder="특이사항이나 참고사항을 입력하세요"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sm:space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 touch-manipulation"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed touch-manipulation"
          >
            {loading ? (isEditMode ? '수정 중...' : '생성 중...') : (isEditMode ? '수정' : '생성')}
          </button>
        </div>
      </form>
    </div>
  )
}

// SortableItem 컴포넌트
interface SortableItemProps {
  item: ChecklistItemWithId
  index: number
  onItemChange: (index: number, field: keyof ChecklistItem, value: string | boolean) => void
  onItemTypeChange: (index: number, type: 'check' | 'before_photo' | 'after_photo' | 'before_after_photo') => void
  onRemoveItem: (index: number) => void
  itemsLength: number
}

function SortableItem({
  item,
  index,
  onItemChange,
  onItemTypeChange,
  onRemoveItem,
  itemsLength,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._tempId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-2 p-3 border border-gray-200 rounded-md min-w-0 ${
        isDragging ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      {/* 드래그 핸들: 모바일 터치 영역 44px 이상 */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 sm:mt-1 rounded-md cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-100 touch-manipulation self-start"
        title="드래그하여 순서 변경"
        aria-label="순서 변경"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </div>

      {/* 항목명 + 타입/상태/코멘트: 모바일 세로 배치, 데스크톱 기존처럼 */}
      <div className="flex-1 min-w-0 space-y-2">
        <input
          type="text"
          placeholder="항목명 (예: 홀 바닥, 주방 싱크)"
          value={item.area}
          onChange={(e) => onItemChange(index, 'area', e.target.value)}
          className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:gap-2">
        <select
          value={item.type}
          onChange={(e) =>
            onItemTypeChange(index, e.target.value as 'check' | 'before_photo' | 'after_photo' | 'before_after_photo')
          }
          className="w-full sm:w-auto min-w-0 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              onChange={(e) => onItemChange(index, 'status', e.target.value as 'good' | 'bad')}
              className="w-full sm:w-auto min-w-0 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="good">양호</option>
              <option value="bad">불량</option>
            </select>
            <input
              type="text"
              placeholder={item.status === 'bad' ? '코멘트 (필수)' : '코멘트 (선택)'}
              value={item.comment || ''}
              onChange={(e) => onItemChange(index, 'comment', e.target.value)}
              className={`w-full sm:flex-1 min-w-0 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                item.status === 'bad' && !item.comment?.trim() ? 'border-red-300' : ''
              }`}
            />
          </>
        )}
        {(item.type === 'before_photo' ||
          item.type === 'after_photo' ||
          item.type === 'before_after_photo') && (
          <div className="w-full sm:flex-1 min-w-0 space-y-1">
            <div className="text-sm text-gray-600">
              {item.type === 'before_photo' && '관리 전 사진만 촬영합니다.'}
              {item.type === 'after_photo' && '관리 후 사진만 촬영합니다.'}
              {item.type === 'before_after_photo' && '관리 전/후 사진을 모두 촬영해야 합니다.'}
            </div>
            <input
              type="text"
              placeholder="코멘트 입력 (선택)"
              value={item.comment || ''}
              onChange={(e) => onItemChange(index, 'comment', e.target.value)}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
            />
          </div>
        )}
        {itemsLength > 1 && (
          <button
            type="button"
            onClick={() => onRemoveItem(index)}
            className="w-full sm:w-auto px-3 py-2.5 sm:py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md touch-manipulation text-left sm:text-center"
          >
            삭제
          </button>
        )}
        </div>
      </div>
    </div>
  )
}

