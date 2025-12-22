'use client'

import { useState } from 'react'
import { ChecklistItem } from '@/types/db'

interface ChecklistTableProps {
  items: ChecklistItem[]
  storeId: string
  onItemsChange: (items: ChecklistItem[]) => void
  onCameraModeRequest?: (mode: 'before' | 'after') => void
}

export function ChecklistTable({ items, storeId, onItemsChange, onCameraModeRequest }: ChecklistTableProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null)
  const [viewingPhotoMode, setViewingPhotoMode] = useState<'before' | 'after' | null>(null)

  // 수행해야 할 항목: 관리 전 사진이 없는 사진 항목 + 체크 안된 체크 항목
  // 관리 후 완료된 항목: 관리 후 사진이 있는 사진 항목
  const itemsToShow = items.map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => {
    if (item.type === 'photo') {
      // 사진 항목: 관리 전 사진이 없거나 (수행해야 할) 관리 후 사진이 있는 경우 (완료된 항목)
      return !item.before_photo_url || item.after_photo_url
    } else {
      // 체크 항목: 항상 표시
      return true
    }
  })
  // 사진 타입 항목을 먼저, 체크 타입 항목을 나중에 정렬
  .sort((a, b) => {
    // 사진 타입이 체크 타입보다 먼저 오도록 정렬
    if (a.item.type === 'photo' && b.item.type === 'check') {
      return -1
    }
    if (a.item.type === 'check' && b.item.type === 'photo') {
      return 1
    }
    // 같은 타입이면 원래 순서 유지
    return a.originalIndex - b.originalIndex
  })

  const handleCheck = (originalIndex: number) => {
    const newItems = [...items]
    if (newItems[originalIndex].type === 'check') {
      newItems[originalIndex] = {
        ...newItems[originalIndex],
        checked: !newItems[originalIndex].checked,
      }
      onItemsChange(newItems)
    }
  }

  const handleStartPhotoUpload = (mode: 'before' | 'after') => {
    // 카메라 모드 요청
    if (onCameraModeRequest) {
      onCameraModeRequest(mode)
    }
  }

  return (
    <div className="space-y-2">
      {itemsToShow.map(({ item, originalIndex }, displayIndex) => {
        // 관리 후 사진이 있으면 완료된 항목 (연하게 표시 + 밑줄)
        const isPhotoCompleted = item.type === 'photo' && item.after_photo_url
        // 체크 항목이 체크되었으면 완료된 항목 (연하게 표시 + 밑줄)
        const isCheckCompleted = item.type === 'check' && item.checked
        const isCompleted = isPhotoCompleted || isCheckCompleted
        
        return (
          <div
            key={originalIndex}
            className={`border rounded-lg p-3 transition-all ${
              isCompleted
                ? 'bg-gray-50 opacity-60 border-gray-200'
                : 'bg-white border-gray-300 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* 항목명 */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* 타입 아이콘 */}
                <div className="flex-shrink-0">
                  {item.type === 'photo' ? (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📷</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                  )}
                </div>
                
                {/* 항목명 - 완료된 경우 밑줄 */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium text-gray-800 ${
                      isCompleted ? 'opacity-70' : ''
                    }`}
                    style={{
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      textDecorationThickness: '2px',
                      textDecorationColor: '#6b7280',
                    }}
                  >
                    {item.area || `항목 ${displayIndex + 1}`}
                  </div>
                </div>
              </div>
              
              {/* 상태 영역 */}
              <div className="flex-shrink-0">
                {item.type === 'check' ? (
                  // 체크 항목
                  <button
                    onClick={() => handleCheck(originalIndex)}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                      item.checked
                        ? 'bg-green-500 border-green-600 text-white'
                        : 'bg-white border-gray-300 hover:border-green-500 hover:bg-green-50'
                    }`}
                    title={item.checked ? '체크 완료' : '체크하기'}
                  >
                    {item.checked ? (
                      <span className="text-lg font-bold">✓</span>
                    ) : (
                      <span className="text-gray-400 text-lg">□</span>
                    )}
                  </button>
                ) : (
                  // 사진 항목
                  <div className="flex gap-2">
                    {!item.before_photo_url ? (
                      // 관리 전 사진 촬영 필요
                      <button
                        onClick={() => handleStartPhotoUpload('before')}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-xs flex items-center gap-1.5"
                      >
                        <span>📷</span>
                        <span>관리 전</span>
                      </button>
                    ) : !item.after_photo_url ? (
                      // 관리 후 사진 촬영 필요
                      <>
                        <button
                          onClick={() => {
                            setViewingPhotoIndex(originalIndex)
                            setViewingPhotoMode('before')
                          }}
                          className="relative group"
                        >
                          <img
                            src={item.before_photo_url}
                            alt="관리 전"
                            className="w-12 h-12 object-cover rounded border-2 border-blue-300 hover:border-blue-500 transition-colors cursor-pointer"
                            onError={() => {
                              console.error('Image load error:', item.before_photo_url)
                              setImageErrors(prev => ({ ...prev, [`before-${originalIndex}`]: true }))
                            }}
                          />
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                            전
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs opacity-0 group-hover:opacity-100">확인</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleStartPhotoUpload('after')}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-xs flex items-center gap-1.5"
                        >
                          <span>📷</span>
                          <span>관리 후</span>
                        </button>
                      </>
                    ) : (
                      // 완료된 항목 (두 사진 모두 있음)
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setViewingPhotoIndex(originalIndex)
                            setViewingPhotoMode('before')
                          }}
                          className="relative group"
                          title="클릭하여 관리 전 사진 확인"
                        >
                          <img
                            src={item.before_photo_url}
                            alt="관리 전"
                            className="w-12 h-12 object-cover rounded border-2 border-blue-300 opacity-60 group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded opacity-70">
                            전
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setViewingPhotoIndex(originalIndex)
                            setViewingPhotoMode('after')
                          }}
                          className="relative group"
                          title="클릭하여 관리 후 사진 확인"
                        >
                          <img
                            src={item.after_photo_url}
                            alt="관리 후"
                            className="w-12 h-12 object-cover rounded border-2 border-green-300 opacity-60 group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded opacity-70">
                            후
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* 체크 항목의 상태 및 코멘트 */}
            {item.type === 'check' && (item.status || item.comment) && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                {item.status && (
                  <div className="flex items-center gap-2 mb-1.5">
                    {item.status === 'good' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        양호
                      </span>
                    ) : item.status === 'bad' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        불량
                      </span>
                    ) : null}
                  </div>
                )}
                {item.comment && (
                  <div className="text-gray-600 text-xs p-1.5 bg-gray-50 rounded">
                    {item.comment}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* 사진 확인 모달 */}
      {viewingPhotoIndex !== null && viewingPhotoMode && items[viewingPhotoIndex] && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setViewingPhotoIndex(null)
            setViewingPhotoMode(null)
          }}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]">
            <button
              onClick={() => {
                setViewingPhotoIndex(null)
                setViewingPhotoMode(null)
              }}
              className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-lg"
            >
              ×
            </button>
            <img
              src={viewingPhotoMode === 'before' ? items[viewingPhotoIndex].before_photo_url! : items[viewingPhotoIndex].after_photo_url!}
              alt={`${items[viewingPhotoIndex].area} - ${viewingPhotoMode === 'before' ? '관리 전' : '관리 후'}`}
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
              {items[viewingPhotoIndex].area} - {viewingPhotoMode === 'before' ? '관리 전' : '관리 후'}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
