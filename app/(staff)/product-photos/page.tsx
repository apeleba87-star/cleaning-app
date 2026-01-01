'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useTodayAttendance } from '@/contexts/AttendanceContext'
import { uploadPhoto } from '@/lib/supabase/upload'
import { useToast } from '@/components/Toast'

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
  
  // 토스트 메시지
  const { showToast, ToastContainer } = useToast()
  
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const storageGalleryInputRef = useRef<HTMLInputElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraPhotoType, setCameraPhotoType] = useState<PhotoSubType>('product')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()

  useEffect(() => {
    if (!attendanceLoading && attendanceStoreId && isClockedIn) {
      setStoreId(attendanceStoreId)
    }
  }, [attendanceLoading, attendanceStoreId, isClockedIn])

  // 카메라 모달이 닫힐 때 스트림 정리
  useEffect(() => {
    if (!showCamera && cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [showCamera, cameraStream])

  const handleCameraClick = (photoType: PhotoSubType) => {
    if (!isClockedIn) {
      alert('출근한 매장의 제품 입고 및 보관 사진만 등록할 수 있습니다.')
      return
    }
    setCameraPhotoType(photoType)
    setActivePhotoType(photoType)
    setShowCamera(true)
    initCamera()
  }

  const handleGalleryClick = (photoType: PhotoSubType) => {
    if (!isClockedIn) {
      alert('출근한 매장의 제품 입고 및 보관 사진만 등록할 수 있습니다.')
      return
    }
    setActivePhotoType(photoType)
    
    // 보관 사진 탭인 경우 별도의 input 사용
    if (activeTab === 'storage') {
      if (storageGalleryInputRef.current) {
        storageGalleryInputRef.current.click()
      }
    } else {
      // 제품 입고 탭인 경우 기존 input 사용
      if (galleryInputRef.current) {
        galleryInputRef.current.click()
      }
    }
  }

  const initCamera = async () => {
    try {
      let stream: MediaStream | null = null
      
      // 모든 환경에서 후면 카메라 강제 사용
      // 1단계: exact로 후면 카메라 강제 시도
      try {
        const exactConstraints: MediaStreamConstraints = {
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        }
        stream = await navigator.mediaDevices.getUserMedia(exactConstraints)
      } catch (exactError) {
        // exact가 실패하면 ideal로 시도
        console.log('exact environment failed, trying ideal:', exactError)
        try {
          const idealConstraints: MediaStreamConstraints = {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          }
          stream = await navigator.mediaDevices.getUserMedia(idealConstraints)
        } catch (idealError) {
          // ideal도 실패하면 facingMode 없이 시도 (최후의 수단)
          console.log('ideal environment failed, trying without facingMode:', idealError)
          const fallbackConstraints: MediaStreamConstraints = {
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          }
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
        }
      }

      if (!stream) {
        throw new Error('카메라 스트림을 가져올 수 없습니다.')
      }

      setCameraStream(stream)
      setCameraError(null)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error: any) {
      console.error('카메라 접근 실패:', error)
      let errorMessage = ''
      if (error.name === 'NotAllowedError') {
        errorMessage = '카메라 접근 권한이 거부되었습니다.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = '카메라를 찾을 수 없습니다.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = '카메라를 사용할 수 없습니다.'
      } else {
        errorMessage = '카메라 접근에 실패했습니다.'
      }
      setCameraError(errorMessage)
    }
  }

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
    setCameraError(null)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return

    // 촬영 모션 시작 (플래시 효과)
    setIsCapturing(true)

    // 비디오를 잠시 멈춤
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsCapturing(false)
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const dataURL = canvas.toDataURL('image/jpeg', 0.8)
    const photo: ProductPhoto = { url: dataURL }

    // 현재 활성화된 사진 타입에 따라 추가
    if (activeTab === 'receipt') {
      if (cameraPhotoType === 'product') {
        if (receiptProductPhotos.length >= 10) {
          alert('최대 10장까지 촬영 가능합니다.')
          setIsCapturing(false)
          return
        }
        setReceiptProductPhotos((prev) => [...prev, photo])
      } else {
        if (receiptOrderSheetPhotos.length >= 10) {
          alert('최대 10장까지 촬영 가능합니다.')
          setIsCapturing(false)
          return
        }
        setReceiptOrderSheetPhotos((prev) => [...prev, photo])
      }
    } else {
      if (storagePhotos.length >= 10) {
        alert('최대 10장까지 촬영 가능합니다.')
        setIsCapturing(false)
        return
      }
      setStoragePhotos((prev) => [...prev, photo])
    }

    // 플래시 효과 종료 (200ms 후)
    setTimeout(() => {
      setIsCapturing(false)
    }, 200)
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

        // 미션 완료 이벤트 발생
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('missionComplete', {
            detail: { missionId: 'product_photos' }
          }))
        }

        showToast('제품 입고 사진이 등록되었습니다.', 'success')
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

        // 미션 완료 이벤트 발생 (보관 사진도 제품 입고 사진 미션에 포함)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('missionComplete', {
            detail: { missionId: 'product_photos' }
          }))
        }

        showToast('보관 사진이 등록되었습니다.', 'success')
        setStoragePhotos([])
        setStorageDescription('')
      }
    } catch (error: any) {
      console.error('Error submitting photos:', error)
      showToast(error.message || '등록 중 오류가 발생했습니다.', 'error')
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
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold">제품 입고 및 보관 사진</h1>
      </div>

      <div className="p-4 space-y-4">
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
                      onClick={() => handleCameraClick('product')}
                      disabled={!isClockedIn || uploading || receiptProductPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      📷 제품 즉시 촬영
                    </button>
                    <button
                      onClick={() => handleGalleryClick('product')}
                      disabled={!isClockedIn || uploading || receiptProductPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      🖼️ 제품 갤러리
                    </button>
                  </div>

                  {/* 제품 사진 썸네일 (가로 스크롤) */}
                  {receiptProductPhotos.length > 0 && (
                    <div className="flex gap-2 mt-3 mb-4 overflow-x-auto pb-2">
                      {receiptProductPhotos.map((photo, index) => (
                        <div key={index} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-blue-300">
                          <Image
                            src={photo.url}
                            alt={`제품 사진 ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                            loading="lazy"
                          />
                          <button
                            onClick={() => removePhoto(index, 'product')}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
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
                      onClick={() => handleCameraClick('order_sheet')}
                      disabled={!isClockedIn || uploading || receiptOrderSheetPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      📷 발주서 즉시 촬영
                    </button>
                    <button
                      onClick={() => handleGalleryClick('order_sheet')}
                      disabled={!isClockedIn || uploading || receiptOrderSheetPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      🖼️ 발주서 갤러리
                    </button>
                  </div>

                  {/* 발주서 사진 썸네일 (가로 스크롤) */}
                  {receiptOrderSheetPhotos.length > 0 && (
                    <div className="flex gap-2 mt-3 mb-4 overflow-x-auto pb-2">
                      {receiptOrderSheetPhotos.map((photo, index) => (
                        <div key={index} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-green-300">
                          <Image
                            src={photo.url}
                            alt={`발주서 사진 ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                            loading="lazy"
                          />
                          <button
                            onClick={() => removePhoto(index, 'order_sheet')}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
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
                      onClick={() => handleCameraClick('product')}
                      disabled={uploading || currentPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      📷 즉시 촬영
                    </button>
                    <button
                      onClick={() => handleGalleryClick('product')}
                      disabled={uploading || currentPhotos.length >= 10}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      🖼️ 갤러리
                    </button>
                  </div>


                  {/* 업로드된 사진 썸네일 (가로 스크롤) */}
                  {currentPhotos.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                      {currentPhotos.map((photo, index) => (
                        <div key={index} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300">
                          <Image
                            src={photo.url}
                            alt={`보관 사진 ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                            loading="lazy"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
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
                  
                  {/* 보관 사진용 갤러리 input */}
                  <input
                    ref={storageGalleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
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
            {!isClockedIn && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  출근한 매장의 제품 입고 및 보관 사진만 등록할 수 있습니다.
                </p>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isClockedIn || submitting || (activeTab === 'receipt' ? !hasReceiptPhotos : currentPhotos.length === 0)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </div>
      </div>

      {/* 카메라 모달 */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* 상단: 현재 촬영 중인 타입 표시 */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4 z-10">
            <div className="text-center">
              <div className="text-xl font-semibold">
                {activeTab === 'receipt' 
                  ? (cameraPhotoType === 'product' ? '제품 입고 사진' : '발주서 입고 사진')
                  : '보관 사진'}
              </div>
            </div>
          </div>

          {/* 카메라 에러 표시 */}
          {cameraError && (
            <div className="absolute top-20 left-4 right-4 bg-red-600 bg-opacity-95 text-white p-4 rounded-lg z-30 shadow-lg">
              <p className="text-sm font-semibold mb-2">{cameraError}</p>
              <button
                onClick={closeCamera}
                className="mt-3 w-full px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-medium transition-colors"
              >
                닫기
              </button>
            </div>
          )}

          {/* 카메라 화면 */}
          <div className="flex-1 relative flex items-center justify-center">
            {cameraError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-4">
                <div className="text-white text-center mb-6">
                  <div className="text-4xl mb-4">📷</div>
                  <div className="text-lg font-semibold mb-2">
                    {activeTab === 'receipt' 
                      ? (cameraPhotoType === 'product' ? '제품 입고 사진' : '발주서 입고 사진')
                      : '보관 사진'}
                  </div>
                  <div className="text-sm text-gray-300">카메라 접근이 필요합니다</div>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}

            {/* 셔터 왼쪽 하단: 촬영된 사진 썸네일 목록 */}
            <div className="absolute top-20 bottom-44 left-4 flex flex-row gap-2 z-20 max-w-[calc(100vw-120px)] overflow-x-auto pb-2 md:top-20 md:bottom-20">
              {(() => {
                const photos = activeTab === 'receipt' 
                  ? (cameraPhotoType === 'product' ? receiptProductPhotos : receiptOrderSheetPhotos)
                  : storagePhotos
                return photos.map((photo, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 border-white">
                    <Image
                      src={photo.url}
                      alt={`사진 ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                      loading="lazy"
                    />
                    <button
                      onClick={() => {
                        if (activeTab === 'receipt') {
                          removePhoto(idx, cameraPhotoType)
                        } else {
                          removePhoto(idx)
                        }
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 font-bold"
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* 하단: 촬영 버튼 및 닫기 버튼 */}
          <div className="absolute bottom-16 left-0 right-0 bg-black bg-opacity-90 p-4 z-20 md:bottom-0">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={closeCamera}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                닫기
              </button>
              {!cameraError && (
                <button
                  onClick={capturePhoto}
                  disabled={isCapturing || (() => {
                    if (activeTab === 'receipt') {
                      return cameraPhotoType === 'product' 
                        ? receiptProductPhotos.length >= 10
                        : receiptOrderSheetPhotos.length >= 10
                    }
                    return storagePhotos.length >= 10
                  })()}
                  className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:bg-gray-100 active:scale-95 transition-transform flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="사진 촬영"
                >
                  <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-400"></div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

