'use client'

import { useState } from 'react'
import { ChecklistItem } from '@/types/db'

interface ChecklistEditorProps {
  onSave: (items: ChecklistItem[]) => void
  initialItems?: ChecklistItem[]
  className?: string
}

export function ChecklistEditor({
  onSave,
  initialItems = [],
  className,
}: ChecklistEditorProps) {
  const [items, setItems] = useState<ChecklistItem[]>(
    initialItems.length > 0
      ? initialItems
      : [{ area: '', status: 'good', comment: '' }]
  )

  const addItem = () => {
    setItems([...items, { area: '', status: 'good', comment: '' }])
  }

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    for (const item of items) {
      if (!item.area.trim()) {
        alert('구역명을 입력해주세요.')
        return false
      }
      if (item.status === 'bad' && !item.comment?.trim()) {
        alert('불량 항목에는 코멘트가 필요합니다.')
        return false
      }
    }
    return true
  }

  const handleSave = () => {
    if (!validate()) return

    const cleanedItems = items.map((item) => ({
      area: item.area.trim(),
      status: item.status,
      comment: item.status === 'bad' ? item.comment?.trim() : undefined,
    }))

    onSave(cleanedItems)
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="border border-gray-300 rounded-lg p-4 bg-white"
          >
            <div className="flex items-start justify-between mb-3">
              <input
                type="text"
                placeholder="구역명 (예: 화장실, 주방)"
                value={item.area}
                onChange={(e) =>
                  updateItem(index, { area: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="ml-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  삭제
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`status-${index}`}
                  value="good"
                  checked={item.status === 'good'}
                  onChange={() => updateItem(index, { status: 'good' })}
                  className="mr-2"
                />
                <span className="text-green-600 font-medium">양호</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`status-${index}`}
                  value="bad"
                  checked={item.status === 'bad'}
                  onChange={() => updateItem(index, { status: 'bad' })}
                  className="mr-2"
                />
                <span className="text-red-600 font-medium">불량</span>
              </label>
            </div>
            {item.status === 'bad' && (
              <textarea
                placeholder="불량 사유를 입력해주세요 (필수)"
                value={item.comment || ''}
                onChange={(e) =>
                  updateItem(index, { comment: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={2}
              />
            )}
          </div>
        ))}
        <div className="flex space-x-2">
          <button
            onClick={addItem}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors text-sm"
          >
            + 항목 추가
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
          >
            제출
          </button>
        </div>
      </div>
    </div>
  )
}


