'use client'

import { useState, useRef, useEffect } from 'react'
import { ChecklistItem } from '@/types/db'

interface ChecklistCameraProps {
  items: ChecklistItem[]
  mode: 'before' | 'after'
  storeId: string
  onComplete: (updatedItems: ChecklistItem[]) => void
  onCancel: () => void
}

export function ChecklistCamera({ items, mode, storeId, onComplete, onCancel }: ChecklistCameraProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [tempPhotos, setTempPhotos] = useState<Record<number, string>>({})
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 사진이 필요한 항목만 필터링
  const photoItems = items.filter(item => item.area?.trim() && item.type === 'photo')

  const [cameraError, setCameraError] = useState<string | null>(null)
  const [useFileInput, setUseFileInput] = useState(false)

  useEffect(() => {
    let currentStream: MediaStream | null = null
    let isMounted = true
    let cameraRequested = false

    // 카메라 접근 (한 번만 시도)
    const initCamera = async () => {
      if (cameraRequested || !isMounted || useFileInput) return
      cameraRequested = true

      try {
        // 모바일 환경 확인
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        
        // PC 환경에서는 facingMode를 사용하지 않음 (일반 웹캠 사용)
        const constraints: MediaStreamConstraints = {
          video: isMobile
            ? {
                facingMode: { ideal: 'environment' }, // 모바일에서는 후면 카메라
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            : {
                // PC에서는 기본 카메라
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        
        if (!isMounted) {
          // 컴포넌트가 언마운트된 경우 스트림 정리
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }

        currentStream = mediaStream
        setStream(mediaStream)
        setCameraError(null)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (error: any) {
        if (!isMounted) return
        
        console.error('카메라 접근 실패:', error)
        const errorMessage = error.name === 'NotAllowedError' 
          ? '카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
          : error.name === 'NotFoundError'
          ? '카메라를 찾을 수 없습니다.'
          : '카메라 접근에 실패했습니다.'
        
        setCameraError(errorMessage)
        setUseFileInput(true) // 카메라 실패 시 file input 모드로 전환
      }
    }

    if (!useFileInput) {
      initCamera()
    }

    // 브라우저 히스토리에 엔트리 추가 (뒤로가기 감지용)
    window.history.pushState({ cameraMode: mode }, '')

    // 브라우저 뒤로가기 감지
    const handlePopState = (event: PopStateEvent) => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
      }
      if (isMounted) {
        onCancel()
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      isMounted = false
      // 정리
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
      }
      window.removeEventListener('popstate', handlePopState)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFileInput])

  // File input으로 사진 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택할 수 있습니다.')
      return
    }

    // File을 base64로 변환
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataURL = reader.result as string
      setTempPhotos(prev => ({
        ...prev,
        [currentIndex]: dataURL
      }))
    }
    reader.readAsDataURL(file)

    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // 임시 저장 (base64로 저장)
    const dataURL = canvas.toDataURL('image/jpeg', 0.8)
    setTempPhotos(prev => ({
      ...prev,
      [currentIndex]: dataURL
    }))

    // 자동으로 다음 항목으로 이동하지 않음 (사용자가 직접 선택하도록)
  }

  const removePhoto = (index: number) => {
    setTempPhotos(prev => {
      const newPhotos = { ...prev }
      delete newPhotos[index]
      return newPhotos
    })
    setCurrentIndex(index)
  }

  const handleSave = async () => {
    // 확인 대화상자
    if (!confirm('저장할까요?')) {
      return
    }

    // 업로드 및 업데이트
    const uploadPhotoFile = async (index: number, dataURL: string): Promise<string | null> => {
      try {
        // base64를 Blob로 변환
        const response = await fetch(dataURL)
        const blob = await response.blob()
        const file = new File([blob], `photo-${Date.now()}-${index}.jpg`, { type: 'image/jpeg' })

        // Supabase Storage에 업로드
        const { uploadPhoto } = await import('@/lib/supabase/upload')
        const url = await uploadPhoto(
          file,
          storeId,
          mode === 'before' ? 'checklist_before' : 'checklist_after'
        )
        return url
      } catch (error) {
        console.error('사진 업로드 실패:', error)
        alert(`사진 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        return null
      }
    }

    // 모든 사진 업로드 (순차적으로)
    const updatedItems = [...items]
    for (let i = 0; i < photoItems.length; i++) {
      if (tempPhotos[i]) {
        const url = await uploadPhotoFile(i, tempPhotos[i])
        if (url) {
          const itemToUpdate = updatedItems.find(item => item.area === photoItems[i].area && item.type === 'photo')
          if (itemToUpdate) {
            const itemIndex = updatedItems.indexOf(itemToUpdate)
            if (mode === 'before') {
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                before_photo_url: url
              }
            } else {
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                after_photo_url: url
              }
            }
          }
        }
      }
    }

    // 스트림 정리
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    onComplete(updatedItems)
  }

  const currentItem = photoItems[currentIndex]
  const allCaptured = photoItems.length > 0 && photoItems.every((_, idx) => tempPhotos[idx])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 상단: 항목 표시 */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 z-10">
        <div className="text-center">
          <div className="text-lg font-semibold">{currentItem?.area || ''}</div>
          <div className="text-sm text-gray-300 mt-1">
            {currentIndex + 1} / {photoItems.length}
          </div>
        </div>
      </div>

      {/* 카메라 에러 표시 */}
      {cameraError && (
        <div className="absolute top-20 left-4 right-4 bg-red-600 bg-opacity-90 text-white p-3 rounded-lg z-30">
          <p className="text-sm mb-2">{cameraError}</p>
          <p className="text-xs text-red-100">갤러리에서 사진을 선택하거나, 브라우저 설정에서 카메라 권한을 허용해주세요.</p>
        </div>
      )}

      {/* 카메라 화면 또는 File Input 모드 */}
      <div className="flex-1 relative flex items-center justify-center">
        {useFileInput ? (
          // File Input 모드
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-4">
            <div className="text-white text-center mb-6">
              <div className="text-4xl mb-4">📷</div>
              <div className="text-lg font-semibold mb-2">{currentItem?.area}</div>
              <div className="text-sm text-gray-300">사진을 선택해주세요</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              갤러리에서 선택
            </button>
            <button
              onClick={() => {
                setUseFileInput(false)
                setCameraError(null)
                // 카메라 재시도
                setTimeout(() => {
                  window.location.reload()
                }, 100)
              }}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              카메라 다시 시도
            </button>
          </div>
        ) : (
          // 카메라 모드
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

        {/* 왼쪽 하단: 사진 미리보기 영역 (임시 저장된 사진들) */}
        <div className="absolute bottom-20 left-4 flex gap-2 max-w-[calc(100%-8rem)] overflow-x-auto z-20">
          {photoItems.map((item, idx) => {
            if (!tempPhotos[idx]) return null // 촬영하지 않은 항목은 표시하지 않음
            return (
              <div key={idx} className="relative flex-shrink-0">
                <img
                  src={tempPhotos[idx]}
                  alt={item.area}
                  className="w-20 h-20 object-cover rounded border-2 border-white"
                />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 font-bold"
                  title="재촬영"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>

        {/* 왼쪽 하단: 현재 항목의 빈 공간 (촬영 전) */}
        {!tempPhotos[currentIndex] && (
          <div className="absolute bottom-20 left-4 w-20 h-20 bg-gray-800 bg-opacity-70 border-2 border-gray-400 border-dashed rounded flex items-center justify-center z-10">
            <div className="text-white text-xs text-center px-1 font-medium">
              {currentItem?.area}
            </div>
          </div>
        )}
      </div>

      {/* 하단: 버튼 영역 */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-90 p-4 z-20">
        {/* 항목 선택 버튼들 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {photoItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded transition-all ${
                idx === currentIndex
                  ? 'bg-blue-600 ring-2 ring-blue-400'
                  : tempPhotos[idx]
                  ? 'bg-gray-700'
                  : 'bg-gray-800'
              }`}
            >
              <span className="text-white text-2xl mb-1">📷</span>
              <span className="text-white text-xs text-center px-1 leading-tight">{item.area}</span>
            </button>
          ))}
        </div>

        {/* 촬영 버튼 및 저장 버튼 */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            취소
          </button>
          {!useFileInput && (
            <button
              onClick={capturePhoto}
              className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:bg-gray-100 active:scale-95 transition-transform flex items-center justify-center shadow-lg"
              title="사진 촬영"
            >
              <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-400"></div>
            </button>
          )}
          {!tempPhotos[currentIndex] && useFileInput && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 bg-blue-600 rounded-full border-4 border-blue-400 hover:bg-blue-700 active:scale-95 transition-transform flex items-center justify-center shadow-lg"
              title="사진 선택"
            >
              <span className="text-white text-2xl">📷</span>
            </button>
          )}
          {allCaptured && (
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg"
            >
              저장할까요?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

