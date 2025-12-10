'use client'

import { useState } from 'react'
import { ChecklistItem } from '@/types/db'
import { PhotoUploader } from '@/components/PhotoUploader'

interface ChecklistTableProps {
  items: ChecklistItem[]
  storeId: string
  onItemsChange: (items: ChecklistItem[]) => void
}

export function ChecklistTable({ items, storeId, onItemsChange }: ChecklistTableProps) {
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null)
  const [photoMode, setPhotoMode] = useState<'before' | 'after' | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const handleCheck = (index: number) => {
    const newItems = [...items]
    if (newItems[index].type === 'check') {
      newItems[index] = {
        ...newItems[index],
        checked: !newItems[index].checked,
      }
      onItemsChange(newItems)
    }
  }

  const handlePhotoUpload = (index: number, mode: 'before' | 'after', url: string) => {
    const newItems = [...items]
    if (newItems[index].type === 'photo') {
      if (mode === 'before') {
        newItems[index] = { ...newItems[index], before_photo_url: url }
        // 이미지 에러 상태 초기화
        setImageErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[`before-${index}`]
          return newErrors
        })
      } else {
        newItems[index] = { ...newItems[index], after_photo_url: url }
        // 이미지 에러 상태 초기화
        setImageErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[`after-${index}`]
          return newErrors
        })
      }
      onItemsChange(newItems)
      setEditingPhotoIndex(null)
      setPhotoMode(null)
    }
  }

  const handleStartPhotoUpload = (index: number, mode: 'before' | 'after') => {
    setEditingPhotoIndex(index)
    setPhotoMode(mode)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
              항목
            </th>
            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 w-24">
              타입
            </th>
            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 w-32">
              상태
            </th>
            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
              비고
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={index}
              className={`${
                item.type === 'check' && item.checked
                  ? 'bg-gray-100 opacity-60'
                  : 'bg-white'
              } hover:bg-gray-50 transition-colors`}
            >
              <td className="border border-gray-300 px-4 py-3">
                <div className="font-medium">{item.area || `항목 ${index + 1}`}</div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                {item.type === 'photo' ? (
                  <span className="inline-flex items-center justify-center w-8 h-8 text-blue-600">
                    📷
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-8 h-8 text-green-600">
                    ✓
                  </span>
                )}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                {item.type === 'check' ? (
                  <button
                    onClick={() => handleCheck(index)}
                    className={`w-10 h-10 rounded border-2 flex items-center justify-center transition-all ${
                      item.checked
                        ? 'bg-green-500 border-green-600 text-white'
                        : 'bg-white border-gray-400 hover:border-green-500 hover:bg-green-50'
                    }`}
                    title={item.checked ? '체크 완료' : '체크하기'}
                  >
                    {item.checked ? (
                      <span className="text-xl">✓</span>
                    ) : (
                      <span className="text-gray-400 text-xl">□</span>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col space-y-2 items-center">
                    {/* 관리 전 사진 */}
                    {!item.before_photo_url ? (
                      <button
                        onClick={() => handleStartPhotoUpload(index, 'before')}
                        className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium flex items-center gap-1"
                      >
                        <span>📷</span>
                        <span>관리 전</span>
                      </button>
                    ) : (
                      <div className="relative group border-2 border-blue-300 rounded p-1 bg-blue-50">
                        {imageErrors[`before-${index}`] ? (
                          <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                            이미지 오류
                          </div>
                        ) : (
                          <img
                            src={item.before_photo_url}
                            alt="관리 전"
                            className="w-24 h-24 object-cover rounded"
                            onError={() => {
                              console.error('Image load error:', item.before_photo_url)
                              setImageErrors(prev => ({ ...prev, [`before-${index}`]: true }))
                            }}
                          />
                        )}
                        <button
                          onClick={() => {
                            const newItems = [...items]
                            newItems[index] = { ...newItems[index], before_photo_url: null }
                            onItemsChange(newItems)
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="삭제"
                        >
                          ×
                        </button>
                        <div className="text-xs text-blue-600 mt-1 text-center font-medium">전 ✓</div>
                      </div>
                    )}
                    {/* 관리 후 사진 - 관리 전 사진이 있을 때만 표시 */}
                    {item.before_photo_url && (
                      <>
                        {!item.after_photo_url ? (
                          <button
                            onClick={() => handleStartPhotoUpload(index, 'after')}
                            className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium flex items-center gap-1"
                          >
                            <span>📷</span>
                            <span>관리 후</span>
                          </button>
                        ) : (
                          <div className="relative group border-2 border-green-300 rounded p-1 bg-green-50">
                            {imageErrors[`after-${index}`] ? (
                              <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                이미지 오류
                              </div>
                            ) : (
                              <img
                                src={item.after_photo_url}
                                alt="관리 후"
                                className="w-24 h-24 object-cover rounded"
                                onError={() => {
                                  console.error('Image load error:', item.after_photo_url)
                                  setImageErrors(prev => ({ ...prev, [`after-${index}`]: true }))
                                }}
                              />
                            )}
                            <button
                              onClick={() => {
                                const newItems = [...items]
                                newItems[index] = { ...newItems[index], after_photo_url: null }
                                onItemsChange(newItems)
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="삭제"
                            >
                              ×
                            </button>
                            <div className="text-xs text-green-600 mt-1 text-center font-medium">후 ✓</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </td>
              <td className="border border-gray-300 px-4 py-3">
                {item.type === 'check' ? (
                  <div className="text-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      {item.status === 'good' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          양호
                        </span>
                      ) : item.status === 'bad' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          불량
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    {item.comment && (
                      <div className="text-gray-600 text-xs mt-1 p-2 bg-gray-50 rounded">
                        {item.comment}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    {item.before_photo_url && item.after_photo_url ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        사진 완료
                      </span>
                    ) : item.before_photo_url ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        관리 후 사진 필요
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        사진 미촬영
                      </span>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 사진 업로드 모달 */}
      {editingPhotoIndex !== null && photoMode && items[editingPhotoIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {items[editingPhotoIndex]?.area} - {photoMode === 'before' ? '관리 전' : '관리 후'} 사진
              </h3>
              <button
                onClick={() => {
                  setEditingPhotoIndex(null)
                  setPhotoMode(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <PhotoUploader
              storeId={storeId}
              entity={photoMode === 'before' ? 'checklist_before' : 'checklist_after'}
              onUploadComplete={(url) => handlePhotoUpload(editingPhotoIndex, photoMode, url)}
              onUploadError={(err) => {
                alert(err)
                setEditingPhotoIndex(null)
                setPhotoMode(null)
              }}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setEditingPhotoIndex(null)
                  setPhotoMode(null)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

