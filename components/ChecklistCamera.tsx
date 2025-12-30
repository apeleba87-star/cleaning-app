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
  const [saving, setSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 전달받은 항목들이 이미 필터링되어 있음
  const photoItems = items.filter(item => item.area?.trim())

  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    let currentStream: MediaStream | null = null
    let isMounted = true
    let cameraRequested = false

    // 카메라 접근 (한 번만 시도)
    const initCamera = async () => {
      if (cameraRequested || !isMounted) return
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
        let errorMessage = ''
        let errorDetails = ''
        
        if (error.name === 'NotAllowedError') {
          errorMessage = '카메라 접근 권한이 거부되었습니다.'
          errorDetails = '이 사이트에 대한 카메라 권한을 허용해야 합니다.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = '카메라를 찾을 수 없습니다.'
          errorDetails = '기기에 카메라가 연결되어 있는지 확인하세요.'
        } else if (error.name === 'NotReadableError') {
          errorMessage = '카메라를 사용할 수 없습니다.'
          errorDetails = '다른 앱에서 카메라를 사용 중일 수 있습니다. 다른 앱을 종료하고 다시 시도하세요.'
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = '카메라 설정 오류입니다.'
          errorDetails = '요청한 카메라 설정을 지원하지 않습니다.'
        } else {
          errorMessage = '카메라 접근에 실패했습니다.'
          errorDetails = '브라우저 설정에서 이 사이트의 카메라 권한을 확인하세요.'
        }
        
        setCameraError(`${errorMessage} ${errorDetails}`)
      }
    }

      initCamera()

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
  }, [])

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

    // 자동으로 다음 항목으로 이동
    const nextIndex = currentIndex + 1
    if (nextIndex < photoItems.length) {
      setCurrentIndex(nextIndex)
    }
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
    // 관리전/관리후 사진 모두 확인 필요
    if (!confirm('저장할까요?')) {
      return
    }

    setSaving(true)

    try {
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
            // area로 매칭하여 해당 아이템 찾기 (photoItems는 이미 필터링된 사진 아이템들)
            const itemToUpdate = updatedItems.find(item => item.area === photoItems[i].area && (item.type === 'before_photo' || item.type === 'after_photo' || item.type === 'before_after_photo'))
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
    } finally {
      setSaving(false)
    }
  }

  const currentItem = photoItems[currentIndex]
  const allCaptured = photoItems.length > 0 && photoItems.every((_, idx) => tempPhotos[idx])
  const modeText = mode === 'before' ? '관리전 사진' : '관리후 사진'

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 저장 중 오버레이 */}
      {saving && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-lg font-semibold text-gray-900">저장 중...</p>
            <p className="text-sm text-gray-600">사진을 업로드하고 있습니다. 잠시만 기다려주세요.</p>
          </div>
        </div>
      )}
      
      {/* 상단: 현재 촬영 중인 항목 표시 */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4 z-10">
        <div className="text-center">
          <div className="text-xl font-semibold">
            {modeText} ({currentItem?.area || ''})
          </div>
        </div>
      </div>

      {/* 카메라 에러 표시 */}
      {cameraError && (
        <div className="absolute top-20 left-4 right-4 bg-red-600 bg-opacity-95 text-white p-4 rounded-lg z-30 shadow-lg max-h-[80vh] overflow-y-auto">
          <p className="text-sm font-semibold mb-2">{cameraError}</p>
          <div className="text-xs text-red-100 space-y-2">
            <p className="font-medium mb-2">📱 모바일 해결 방법:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>주소창 왼쪽의 <strong>자물쇠/정보 아이콘</strong> 또는 <strong>경고 아이콘</strong> 클릭</li>
              <li><strong>"사이트 설정"</strong> 또는 <strong>"권한"</strong> 선택</li>
              <li><strong>"카메라"</strong> 항목 찾기</li>
              <li><strong>"허용"</strong> 또는 <strong>"항상 허용"</strong> 선택</li>
              <li>설정 화면을 닫고 페이지를 <strong>새로고침</strong></li>
            </ol>
            <div className="mt-3 pt-3 border-t border-red-500">
              <p className="font-medium mb-1">⚠️ 중요:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>브라우저의 <strong>일반 카메라 설정</strong>이 아닌 <strong>이 사이트에 대한 권한</strong>을 설정해야 합니다</li>
                <li>IP 주소로 접속 중이라면 <strong>localhost</strong>로 접속해보세요</li>
                <li>다른 앱에서 카메라를 사용 중이면 종료하세요</li>
                <li>브라우저를 완전히 종료하고 다시 실행해보세요</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setCameraError(null)
                // 카메라 재시도
                window.location.reload()
              }}
              className="mt-3 w-full px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-medium transition-colors"
            >
              🔄 권한 설정 후 새로고침
            </button>
          </div>
        </div>
      )}

      {/* 카메라 화면 */}
      <div className="flex-1 relative flex items-center justify-center">
        {cameraError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-4">
            <div className="text-white text-center mb-6">
              <div className="text-4xl mb-4">📷</div>
              <div className="text-lg font-semibold mb-2">{currentItem?.area}</div>
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

        {/* 셔터 왼쪽 하단: 모든 항목의 썸네일 목록 */}
        <div className="absolute top-20 bottom-44 left-4 flex flex-col gap-2 z-20 overflow-y-auto md:top-20 md:bottom-20">
          {photoItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="relative">
                {tempPhotos[idx] ? (
                <img
                  src={tempPhotos[idx]}
                  alt={item.area}
                    className="w-16 h-16 object-cover rounded border-2 border-white"
                />
                ) : (
                  <div className="w-16 h-16 bg-gray-800 bg-opacity-70 border-2 border-gray-400 border-dashed rounded flex items-center justify-center">
                    <div className="text-white text-xs text-center px-1"></div>
                  </div>
                )}
                {tempPhotos[idx] && (
                <button
                  onClick={() => removePhoto(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 font-bold"
                  title="재촬영"
                >
                  ×
                </button>
                )}
              </div>
              <span className="text-white text-xs font-medium whitespace-nowrap">
                {item.area}
              </span>
            </div>
          ))}
          </div>
      </div>

      {/* 하단: 촬영 버튼 및 저장 버튼 */}
      <div className="absolute bottom-16 left-0 right-0 bg-black bg-opacity-90 p-4 z-20 md:bottom-0">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            취소
          </button>
          {!cameraError && (
            <button
              onClick={capturePhoto}
              className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:bg-gray-100 active:scale-95 transition-transform flex items-center justify-center shadow-lg"
              title="사진 촬영"
            >
              <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-400"></div>
            </button>
          )}
          {allCaptured && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>저장 중...</span>
                </>
              ) : (
                '저장하기'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

