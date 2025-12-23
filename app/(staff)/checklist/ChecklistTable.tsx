'use client'

import { useState } from 'react'
import { ChecklistItem } from '@/types/db'

interface ChecklistTableProps {
  items: ChecklistItem[]
  storeId: string
  onItemsChange: (items: ChecklistItem[]) => void
  onCameraModeRequest?: (mode: 'before' | 'after') => void
  stage?: 'before' | 'after' // 관리전/관리후 단계
}

export function ChecklistTable({ items, storeId, onItemsChange, onCameraModeRequest, stage = 'before' }: ChecklistTableProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null)
  const [viewingPhotoMode, setViewingPhotoMode] = useState<'before' | 'after' | null>(null)

  // 체크 항목 완료 여부 확인
  const checkItems = items.filter(item => item.type === 'check' && item.area?.trim())
  const hasAllCheckItemsCompleted = checkItems.length === 0 || checkItems.every(item => item.checked)

  // 디버깅: 단계와 항목 타입 확인
  console.log('ChecklistTable render:', {
    stage,
    itemsCount: items.length,
    itemsTypes: items.map(item => ({ 
      type: item.type, 
      area: item.area,
      before_photo_url: item.before_photo_url ? 'exists' : 'null',
      after_photo_url: item.after_photo_url ? 'exists' : 'null'
    }))
  })

  // 단계별로 필터링된 항목 표시
  const filteredItems = items.filter((item) => {
    // 타입이 없는 경우 필터링 제외
    if (!item.type) {
      console.warn('Item without type found:', item.area)
      return false
    }
    
    if (stage === 'before') {
      // 관리전 단계:
      // - after_photo 타입은 완전히 숨김 (절대 표시하지 않음)
      // - before_photo: 관리전 사진이 없으면 표시, 있으면 숨김
      // - before_after_photo: 관리전 사진이 없으면 표시, 있으면 숨김
      // - check: 항상 표시
      // 관리후 사진만 필요한 항목은 관리전 단계에서 절대 표시하지 않음
      if (item.type === 'after_photo') {
        console.log('⚠️ Filtering out after_photo item in before stage:', item.area, item)
        return false // 관리후 사진은 관리전 단계에서 완전히 숨김
      }
      // 관리전 사진만 필요한 항목
      if (item.type === 'before_photo') {
        const shouldShow = !item.before_photo_url // 관리전 사진이 없으면 표시
        if (shouldShow) {
          console.log('✓ Showing before_photo item:', item.area, 'before_photo_url:', item.before_photo_url)
        }
        return shouldShow
      }
      // 관리전후 사진 모두 필요한 항목
      if (item.type === 'before_after_photo') {
        // 관리전 단계에서는 관리전 사진만 처리 (관리후 사진 부분은 절대 표시하지 않음)
        const shouldShow = !item.before_photo_url // 관리전 사진이 없으면 표시
        
        // 타입 불일치 검사: 이름으로 보아 after_photo일 가능성이 있는 경우
        const areaLower = (item.area || '').toLowerCase()
        if (shouldShow && areaLower.includes('관리후') && !areaLower.includes('관리전') && !areaLower.includes('관리전후')) {
          console.warn('⚠️ Type mismatch detected: before_after_photo item with name suggesting after_photo only:', item.area)
          console.warn('   This item should be of type after_photo, not before_after_photo!')
          console.warn('   Please re-save the checklist in the business admin app to fix the type.')
          // 타입이 잘못 저장되어 있지만, 일단 필터링에서는 제외 (관리전 단계에서 관리후 전용 항목은 표시하지 않음)
          return false
        }
        
        if (shouldShow) {
          console.log('✓ Showing before_after_photo item (before stage):', item.area, 'before_photo_url:', item.before_photo_url)
        }
        return shouldShow
      }
      // 체크 항목
      if (item.type === 'check') {
        return true // 체크 항목은 항상 표시
      }
      // 알 수 없는 타입
      console.warn('⚠️ Unknown item type:', item.type, 'for item:', item.area)
      return false
    } else {
      // 관리후 단계:
      // - before_photo: 숨김 (관리전 사진만 있는 항목은 관리후 단계에서 불필요)
      // - after_photo: 관리후 사진이 없으면 표시
      // - before_after_photo: 관리후 사진이 없으면 표시 (관리전은 이미 완료됨)
      // - check: 항상 표시
      if (item.type === 'before_photo') {
        console.log('⚠️ Filtering out before_photo item in after stage:', item.area, item)
        return false // 관리전 사진만 있는 항목은 관리후 단계에서 숨김
      }
      if (item.type === 'after_photo') {
        const shouldShow = !item.after_photo_url // 관리후 사진이 없으면 표시
        if (shouldShow) {
          console.log('✓ Showing after_photo item:', item.area, 'after_photo_url:', item.after_photo_url)
        }
        return shouldShow
      }
      if (item.type === 'before_after_photo') {
        // 관리후 단계에서는 관리후 사진만 처리 (관리전 사진 부분은 이미 완료됨)
        const shouldShow = !item.after_photo_url // 관리후 사진이 없으면 표시
        if (shouldShow) {
          console.log('✓ Showing before_after_photo item (after stage):', item.area, 'after_photo_url:', item.after_photo_url)
        }
        return shouldShow
      }
      if (item.type === 'check') {
        return true // 체크 항목은 항상 표시
      }
      // 알 수 없는 타입
      console.warn('⚠️ Unknown item type in after stage:', item.type, 'for item:', item.area)
      return false
    }
  })

  // 디버깅: 필터링 결과 확인
  console.log('ChecklistTable filtered:', {
    stage,
    filteredCount: filteredItems.length,
    filteredTypes: filteredItems.map(item => ({ 
      type: item.type, 
      area: item.area,
      before_photo_url: item.before_photo_url ? 'exists' : 'null',
      after_photo_url: item.after_photo_url ? 'exists' : 'null'
    })),
    // 필터링된 항목과 남은 항목 비교
    filteredOut: items.filter(item => !filteredItems.includes(item)).map(item => ({
      type: item.type,
      area: item.area
    }))
  })

  // 모든 항목 표시 (사진 항목도 코멘트 입력을 위해 항상 표시)
  const itemsToShow = filteredItems.map((item, originalIndex) => {
    // 원본 items 배열에서의 실제 인덱스 찾기
    const realIndex = items.findIndex(i => i.area === item.area && i.type === item.type)
    return { item, originalIndex: realIndex >= 0 ? realIndex : originalIndex }
  })
  // 사진 타입 항목을 먼저, 체크 타입 항목을 나중에 정렬
  .sort((a, b) => {
    // 사진 타입이 체크 타입보다 먼저 오도록 정렬
    const aIsPhoto = a.item.type !== 'check'
    const bIsPhoto = b.item.type !== 'check'
    if (aIsPhoto && !bIsPhoto) {
      return -1
    }
    if (!aIsPhoto && bIsPhoto) {
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
        // 사진 항목 완료 체크 - 단계별로 다르게 처리
        const isPhotoCompleted = 
          stage === 'before'
            ? // 관리전 단계: 관리전 사진 완료 여부만 확인
              (item.type === 'before_photo' && item.before_photo_url) ||
              (item.type === 'before_after_photo' && item.before_photo_url)
            : // 관리후 단계: 관리후 사진 완료 여부만 확인
              (item.type === 'after_photo' && item.after_photo_url) ||
              (item.type === 'before_after_photo' && item.after_photo_url)
        // 체크 항목이 체크되었으면 완료된 항목 (연하게 표시 + 밑줄)
        const isCheckCompleted = item.type === 'check' && item.checked
        const isCompleted = isPhotoCompleted || isCheckCompleted
        
        return (
          <div
            key={originalIndex}
            className={`border rounded-lg p-3 transition-all space-y-2 ${
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
                  {item.type !== 'check' ? (
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
                  // 사진 항목 - 타입별로 다르게 처리
                  <div className="flex gap-2">
                    {item.type === 'before_photo' ? (
                      // 관리전 사진만 필요한 경우 - 관리전 단계에서만 표시
                      stage === 'before' ? (
                        !item.before_photo_url ? (
                          <button
                            onClick={() => handleStartPhotoUpload('before')}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-xs flex items-center gap-1.5"
                          >
                            <span>📷</span>
                            <span>관리 전</span>
                          </button>
                        ) : (
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
                          </button>
                        )
                      ) : (
                        // 관리후 단계에서는 before_photo 타입은 표시되지 않아야 함 (필터링에서 제외됨)
                        // 하지만 혹시 표시되는 경우를 대비해 경고 로그
                        (() => {
                          console.warn('⚠️ before_photo item shown in after stage:', item.area, 'This should not happen!')
                          return null
                        })()
                      )
                    ) : item.type === 'after_photo' ? (
                      // 관리후 사진만 필요한 경우 - 관리후 단계에서만 표시
                      stage === 'after' ? (
                        !item.after_photo_url ? (
                          <button
                            onClick={() => handleStartPhotoUpload('after')}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-xs flex items-center gap-1.5"
                          >
                            <span>📷</span>
                            <span>관리 후</span>
                          </button>
                        ) : (
                        <button
                          onClick={() => {
                            setViewingPhotoIndex(originalIndex)
                            setViewingPhotoMode('after')
                          }}
                          className="relative group"
                        >
                          <img
                            src={item.after_photo_url}
                            alt="관리 후"
                            className="w-12 h-12 object-cover rounded border-2 border-green-300 hover:border-green-500 transition-colors cursor-pointer"
                            onError={() => {
                              console.error('Image load error:', item.after_photo_url)
                              setImageErrors(prev => ({ ...prev, [`after-${originalIndex}`]: true }))
                            }}
                          />
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                            후
                          </div>
                        </button>
                        )
                      ) : (
                        // 관리전 단계에서는 after_photo 타입은 표시되지 않아야 함 (필터링에서 제외됨)
                        // 하지만 혹시 표시되는 경우를 대비해 경고 로그
                        (() => {
                          console.warn('⚠️ after_photo item shown in before stage:', item.area, 'This should not happen!')
                          return null
                        })()
                      )
                    ) : item.type === 'before_after_photo' ? (
                      // 관리전후 사진 모두 필요한 경우 - 단계별로 다르게 표시
                      stage === 'before' ? (
                        // 관리전 단계: 관리전 사진만 표시
                        !item.before_photo_url ? (
                          <button
                            onClick={() => handleStartPhotoUpload('before')}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-xs flex items-center gap-1.5"
                          >
                            <span>📷</span>
                            <span>관리 전</span>
                          </button>
                        ) : (
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
                          </button>
                        )
                      ) : (
                        // 관리후 단계: 관리후 사진만 표시
                        !item.after_photo_url ? (
                          <button
                            onClick={() => handleStartPhotoUpload('after')}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-xs flex items-center gap-1.5"
                          >
                            <span>📷</span>
                            <span>관리 후</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setViewingPhotoIndex(originalIndex)
                              setViewingPhotoMode('after')
                            }}
                            className="relative group"
                          >
                            <img
                              src={item.after_photo_url}
                              alt="관리 후"
                              className="w-12 h-12 object-cover rounded border-2 border-green-300 hover:border-green-500 transition-colors cursor-pointer"
                              onError={() => {
                                console.error('Image load error:', item.after_photo_url)
                                setImageErrors(prev => ({ ...prev, [`after-${originalIndex}`]: true }))
                              }}
                            />
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                              후
                            </div>
                          </button>
                        )
                      )
                    ) : null}
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
            
            {/* 사진 항목의 코멘트 - 모든 사진 타입 항목에 표시 */}
            {item.type !== 'check' && (
              <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  코멘트 (선택)
                </label>
                <textarea
                  rows={2}
                  placeholder="이 항목에 대한 코멘트를 입력하세요"
                  value={item.comment || ''}
                  onChange={(e) => {
                    const newItems = [...items]
                    newItems[originalIndex] = {
                      ...newItems[originalIndex],
                      comment: e.target.value
                    }
                    onItemsChange(newItems)
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                />
                {item.comment && item.comment.trim() && (
                  <div className="mt-2 text-gray-700 text-xs p-2 bg-white rounded border border-gray-200">
                    <span className="font-medium text-blue-600">입력된 코멘트:</span>
                    <div className="mt-1">{item.comment}</div>
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
