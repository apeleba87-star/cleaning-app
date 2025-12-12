'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTodayAttendance } from '@/lib/hooks/useTodayAttendance'
import { uploadPhoto } from '@/lib/supabase/upload'
import StoreSelector from '../attendance/StoreSelector'

type PhotoTab = 'receipt' | 'storage'
type PhotoSubType = 'product' | 'order_sheet'

interface ProductPhoto {
  id?: string
  url: string
  file?: File
}

export default function ProductPhotosPage() {
  const [activeTab, setActiveTab] = useState<PhotoTab>('receipt')
  const [storeId, setStoreId] = useState('')
  const [receiptProductPhotos, setReceiptProductPhotos] = useState<ProductPhoto[]>([])
  const [receiptOrderSheetPhotos, setReceiptOrderSheetPhotos] = useState<ProductPhoto[]>([])
  const [storagePhotos, setStoragePhotos] = useState<ProductPhoto[]>([])
  const [receiptDescription, setReceiptDescription] = useState('')
  const [storageDescription, setStorageDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activePhotoType, setActivePhotoType] = useState<PhotoSubType>('product')
  
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()

  useEffect(() => {
    if (!attendanceLoading && attendanceStoreId && isClockedIn) {
      setStoreId(attendanceStoreId)
    }
  }, [attendanceLoading, attendanceStoreId, isClockedIn])

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  const handleGalleryClick = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const fileArray = Array.from(files)
    
    // 현재 활성화된 사진 타입에 따라 최대 개수 확인
    let maxPhotos = 0
    if (activeTab === 'receipt') {
      maxPhotos = activePhotoType === 'product' 
        ? receiptProductPhotos.length 
        : receiptOrderSheetPhotos.length
    } else {
      maxPhotos = storagePhotos.length
    }
    
    const remainingSlots = 10 - maxPhotos

    if (fileArray.length > remainingSlots) {
      alert(`최대 10장까지 업로드 가능합니다. (현재 ${maxPhotos}장, 추가 가능 ${remainingSlots}장)`)
      return
    }

    setUploading(true)
    try {
      const uploadedPhotos: ProductPhoto[] = []

      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          alert(`${file.name}은(는) 이미지 파일이 아닙니다.`)
          continue
        }

        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}은(는) 5MB를 초과합니다.`)
          continue
        }

        // 미리보기 URL 생성
        const previewUrl = URL.createObjectURL(file)
        uploadedPhotos.push({ url: previewUrl, file })
      }

      if (activeTab === 'receipt') {
        if (activePhotoType === 'product') {
          setReceiptProductPhotos((prev) => [...prev, ...uploadedPhotos])
        } else {
          setReceiptOrderSheetPhotos((prev) => [...prev, ...uploadedPhotos])
        }
      } else {
        setStoragePhotos((prev) => [...prev, ...uploadedPhotos])
      }

      // input 초기화
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    } catch (error) {
      console.error('Error processing files:', error)
      alert('파일 처리 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (index: number, photoType?: PhotoSubType) => {
    if (activeTab === 'receipt') {
      const targetType = photoType || activePhotoType
      if (targetType === 'product') {
        setReceiptProductPhotos((prev) => {
          const newPhotos = [...prev]
          const removed = newPhotos.splice(index, 1)[0]
          if (removed.url.startsWith('blob:')) {
            URL.revokeObjectURL(removed.url)
          }
          return newPhotos
        })
      } else {
        setReceiptOrderSheetPhotos((prev) => {
          const newPhotos = [...prev]
          const removed = newPhotos.splice(index, 1)[0]
          if (removed.url.startsWith('blob:')) {
            URL.revokeObjectURL(removed.url)
          }
          return newPhotos
        })
      }
    } else {
      setStoragePhotos((prev) => {
        const newPhotos = [...prev]
        const removed = newPhotos.splice(index, 1)[0]
        if (removed.url.startsWith('blob:')) {
          URL.revokeObjectURL(removed.url)
        }
        return newPhotos
      })
    }
  }

  const handleSubmit = async () => {
    // 출근 중이면 출근한 매장 ID를 강제로 사용
    const finalStoreId = (isClockedIn && attendanceStoreId) ? attendanceStoreId : storeId

    if (!finalStoreId) {
      alert('매장을 선택해주세요.')
      return
    }

    if (!isClockedIn) {
      alert('출근한 매장이 없습니다.')
      return
    }

    if (activeTab === 'receipt') {
      if (receiptProductPhotos.length === 0 && receiptOrderSheetPhotos.length === 0) {
        alert('제품 사진 또는 발주서 사진을 최소 1장 이상 업로드해주세요.')
        return
      }
    } else {
      if (storagePhotos.length === 0) {
        alert('사진을 최소 1장 이상 업로드해주세요.')
        return
      }
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        alert('로그인이 필요합니다.')
        return
      }

      if (activeTab === 'receipt') {
        // 제품 입고: 제품 사진과 발주서 사진을 각각 저장
        const promises: Promise<any>[] = []

        // 제품 사진 저장
        if (receiptProductPhotos.length > 0) {
          const productUrls: string[] = []
          for (const photo of receiptProductPhotos) {
            if (photo.file) {
              try {
                const url = await uploadPhoto(photo.file, finalStoreId, 'product')
                productUrls.push(url)
              } catch (error: any) {
                console.error('Product photo upload error:', error)
                if (error.message?.includes('Bucket not found')) {
                  throw new Error('제품 사진 저장소가 설정되지 않았습니다. 관리자에게 문의하세요.')
                }
                throw error
              }
            } else if (photo.url && !photo.url.startsWith('blob:')) {
              productUrls.push(photo.url)
            }
          }

          if (productUrls.length > 0) {
            promises.push(
              fetch('/api/staff/product-photos', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  store_id: finalStoreId,
                  type: 'receipt',
                  photo_type: 'product',
                  photo_urls: productUrls,
                  description: receiptDescription.trim() || null,
                }),
              })
            )
          }
        }

        // 발주서 사진 저장
        if (receiptOrderSheetPhotos.length > 0) {
          const orderSheetUrls: string[] = []
          for (const photo of receiptOrderSheetPhotos) {
            if (photo.file) {
              try {
                const url = await uploadPhoto(photo.file, finalStoreId, 'product')
                orderSheetUrls.push(url)
              } catch (error: any) {
                console.error('Order sheet photo upload error:', error)
                if (error.message?.includes('Bucket not found')) {
                  throw new Error('발주서 사진 저장소가 설정되지 않았습니다. 관리자에게 문의하세요.')
                }
                throw error
              }
            } else if (photo.url && !photo.url.startsWith('blob:')) {
              orderSheetUrls.push(photo.url)
            }
          }

          if (orderSheetUrls.length > 0) {
            promises.push(
              fetch('/api/staff/product-photos', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  store_id: finalStoreId,
                  type: 'receipt',
                  photo_type: 'order_sheet',
                  photo_urls: orderSheetUrls,
                  description: receiptDescription.trim() || null,
                }),
              })
            )
          }
        }

        const responses = await Promise.all(promises)
        
        for (const response of responses) {
          if (!response.ok) {
            const contentType = response.headers.get('content-type')
            let errorMessage = '제품 입고 사진 등록에 실패했습니다.'
            if (contentType && contentType.includes('application/json')) {
              try {
                const data = await response.json()
                errorMessage = data.error || errorMessage
              } catch (e) {
                // JSON 파싱 실패 시 기본 메시지 사용
              }
            }
            throw new Error(errorMessage)
          }
        }

        alert('제품 입고 사진이 등록되었습니다.')
        setReceiptProductPhotos([])
        setReceiptOrderSheetPhotos([])
        setReceiptDescription('')
      } else {
        // 보관 사진 저장
        const photoUrls: string[] = []
        for (const photo of storagePhotos) {
          if (photo.file) {
            try {
              const url = await uploadPhoto(photo.file, finalStoreId, 'product')
              photoUrls.push(url)
            } catch (error: any) {
              console.error('Storage photo upload error:', error)
              if (error.message?.includes('Bucket not found')) {
                throw new Error('보관 사진 저장소가 설정되지 않았습니다. 관리자에게 문의하세요.')
              }
              throw error
            }
          } else if (photo.url && !photo.url.startsWith('blob:')) {
            photoUrls.push(photo.url)
          }
        }

        const response = await fetch('/api/staff/product-photos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: finalStoreId,
            type: 'storage',
            photo_urls: photoUrls,
            description: storageDescription.trim() || null,
          }),
        })

        if (!response.ok) {
          const contentType = response.headers.get('content-type')
          let errorMessage = '보관 사진 등록에 실패했습니다.'
          if (contentType && contentType.includes('application/json')) {
            try {
              const data = await response.json()
              errorMessage = data.error || errorMessage
            } catch (e) {
              // JSON 파싱 실패 시 기본 메시지 사용
            }
          }
          throw new Error(errorMessage)
        }

        alert('보관 사진이 등록되었습니다.')
        setStoragePhotos([])
        setStorageDescription('')
      }
    } catch (error: any) {
      console.error('Error submitting photos:', error)
      alert(error.message || '등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 현재 활성화된 사진 목록
  const getCurrentPhotos = () => {
    if (activeTab === 'receipt') {
      return activePhotoType === 'product' ? receiptProductPhotos : receiptOrderSheetPhotos
    }
    return storagePhotos
  }

  const currentPhotos = getCurrentPhotos()
  const currentDescription = activeTab === 'receipt' ? receiptDescription : storageDescription
  const hasReceiptPhotos = receiptProductPhotos.length > 0 || receiptOrderSheetPhotos.length > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold">제품 입고 및 보관 사진</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* 매장 선택 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            매장 선택
          </label>
          <StoreSelector
            selectedStoreId={storeId}
            onSelectStore={(id) => setStoreId(id)}
            disabled={!!attendanceStoreId && isClockedIn}
          />
          {attendanceStoreId && isClockedIn && (
            <p className="mt-1 text-xs text-gray-500">
              출근한 매장: {attendanceStoreId}
            </p>
          )}
        </div>

        {/* 탭 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('receipt')}
              className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                activeTab === 'receipt'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              제품 입고
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                activeTab === 'storage'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              보관 사진
            </button>
          </div>

          <div className="p-4 space-y-4">
            {activeTab === 'receipt' ? (
              <>
                {/* 제품 입고: 제품 사진 섹션 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제품 사진
                  </label>
                  
                  {/* 사진 촬영 및 갤러리 버튼 */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                        setActivePhotoType('product')
                        handleCameraClick()
                      }}
                      disabled={uploading || receiptProductPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      📷 제품 즉시 촬영
                    </button>
                    <button
                      onClick={() => {
                        setActivePhotoType('product')
                        handleGalleryClick()
                      }}
                      disabled={uploading || receiptProductPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      🖼️ 제품 갤러리
                    </button>
                  </div>

                  {/* 제품 사진 그리드 */}
                  {receiptProductPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3 mb-4">
                      {receiptProductPhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={photo.url}
                            alt={`제품 사진 ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border-2 border-blue-300"
                          />
                          <button
                            onClick={() => removePhoto(index, 'product')}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mb-4 text-xs text-gray-500">
                    제품 사진: 최대 10장까지 업로드 가능합니다. (현재 {receiptProductPhotos.length}/10)
                  </p>
                </div>

                {/* 제품 입고: 발주서 사진 섹션 */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    발주서 사진
                  </label>
                  
                  {/* 사진 촬영 및 갤러리 버튼 */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                        setActivePhotoType('order_sheet')
                        handleCameraClick()
                      }}
                      disabled={uploading || receiptOrderSheetPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      📷 발주서 즉시 촬영
                    </button>
                    <button
                      onClick={() => {
                        setActivePhotoType('order_sheet')
                        handleGalleryClick()
                      }}
                      disabled={uploading || receiptOrderSheetPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      🖼️ 발주서 갤러리
                    </button>
                  </div>

                  {/* 발주서 사진 그리드 */}
                  {receiptOrderSheetPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3 mb-4">
                      {receiptOrderSheetPhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={photo.url}
                            alt={`발주서 사진 ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border-2 border-green-300"
                          />
                          <button
                            onClick={() => removePhoto(index, 'order_sheet')}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mb-4 text-xs text-gray-500">
                    발주서 사진: 최대 10장까지 업로드 가능합니다. (현재 {receiptOrderSheetPhotos.length}/10)
                  </p>
                </div>

                {/* 숨겨진 input */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
              </>
            ) : (
              <>
                {/* 보관 사진 섹션 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제품 사진
                  </label>
                  
                  {/* 사진 촬영 및 갤러리 버튼 */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={handleCameraClick}
                      disabled={uploading || currentPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      📷 즉시 촬영
                    </button>
                    <button
                      onClick={handleGalleryClick}
                      disabled={uploading || currentPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      🖼️ 갤러리
                    </button>
                  </div>

                  {/* 숨겨진 input */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />

                  {/* 업로드된 사진 그리드 */}
                  {currentPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {currentPhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={photo.url}
                            alt={`보관 사진 ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border-2 border-gray-300"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    최대 10장까지 업로드 가능합니다. (현재 {currentPhotos.length}/10)
                  </p>
                </div>
              </>
            )}

            {/* 설명란 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명란 (선택)
              </label>
              <textarea
                value={currentDescription}
                onChange={(e) => {
                  if (activeTab === 'receipt') {
                    setReceiptDescription(e.target.value)
                  } else {
                    setStorageDescription(e.target.value)
                  }
                }}
                placeholder="설명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                rows={3}
              />
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={submitting || (activeTab === 'receipt' ? !hasReceiptPhotos : currentPhotos.length === 0)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

