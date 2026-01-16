'use client'

import { useState, useRef, useEffect } from 'react'
import { ChecklistItem } from '@/types/db'
import { Capacitor } from '@capacitor/core'

interface ChecklistCameraProps {
  items: ChecklistItem[]
  mode: 'before' | 'after'
  storeId: string
  checklistId: string // localStorage 키 생성을 위해 필요
  onComplete: (updatedItems: ChecklistItem[]) => void
  onCancel: () => void
}

export function ChecklistCamera({ items, mode, storeId, checklistId, onComplete, onCancel }: ChecklistCameraProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [tempPhotos, setTempPhotos] = useState<Record<number, string>>({})
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [saving, setSaving] = useState(false)
  const [captureLoading, setCaptureLoading] = useState(false) // 캡처 로딩 상태
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRequestedRef = useRef(false) // 재초기화를 위해 useRef 사용
  const isMountedRef = useRef(true)
  const isReinitializingRef = useRef(false) // 재초기화 중인지 추적 (무한 루프 방지)
  const hasInitializedRef = useRef(false) // 최초 초기화 완료 여부
  const retryCountRef = useRef(0) // 재시도 횟수 추적 (무한 루프 방지)
  const isCleaningUpRef = useRef(false) // 정리 중인지 추적 (중복 정리 방지)
  const isCapturingRef = useRef(false) // 캡처 중인지 추적 (중복 클릭 방지)
  const isIOSRef = useRef(false) // iOS 감지 (한 번만 확인)

  // 전달받은 항목들이 이미 필터링되어 있음
  const photoItems = items.filter(item => item.area?.trim())

  const [cameraError, setCameraError] = useState<string | null>(null)

  // iOS 감지 (컴포넌트 마운트 시 한 번만 확인)
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    isIOSRef.current = /iPhone|iPad|iPod/i.test(userAgent)
  }, [])

  useEffect(() => {
    let currentStream: MediaStream | null = null
    isMountedRef.current = true

    // 모든 환경에서 getUserMedia 시도 (웹뷰에서도 지원)
    // 네이티브 앱의 웹뷰에서도 getUserMedia를 사용하여 연속 촬영 가능
    const initCamera = async (isReinit = false) => {
      // 재초기화가 아닌 경우에만 플래그 체크
      if (!isReinit && (cameraRequestedRef.current || !isMountedRef.current)) return
      
      // 재초기화인 경우 플래그 리셋
      if (isReinit) {
        cameraRequestedRef.current = false
      }
      
      if (cameraRequestedRef.current || !isMountedRef.current) return
      cameraRequestedRef.current = true

      try {
        let mediaStream: MediaStream | null = null
        
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
          mediaStream = await navigator.mediaDevices.getUserMedia(exactConstraints)
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
            mediaStream = await navigator.mediaDevices.getUserMedia(idealConstraints)
          } catch (idealError) {
            // ideal도 실패하면 facingMode 없이 시도 (최후의 수단)
            console.log('ideal environment failed, trying without facingMode:', idealError)
            const fallbackConstraints: MediaStreamConstraints = {
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            }
            mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
          }
        }
        
        if (!mediaStream) {
          throw new Error('카메라 스트림을 가져올 수 없습니다.')
        }

        if (!isMountedRef.current) {
          // 컴포넌트가 언마운트된 경우 스트림 정리
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }

        currentStream = mediaStream
        setStream(mediaStream)
        setCameraError(null)
        hasInitializedRef.current = true
        isReinitializingRef.current = false
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (error: any) {
        if (!isMountedRef.current) return
        
        console.error('카메라 접근 실패:', error)
        let errorMessage = ''
        let errorDetails = ''
        
        // Android 앱 환경인지 확인
        const isNative = Capacitor.isNativePlatform()
        
        if (error.name === 'NotAllowedError') {
          errorMessage = '카메라 접근 권한이 거부되었습니다.'
          if (isNative) {
            errorDetails = '앱 설정에서 카메라 권한을 허용해주세요. (설정 > 앱 > 무플(MUPL) > 권한 > 카메라)'
          } else {
            errorDetails = '이 사이트에 대한 카메라 권한을 허용해야 합니다.'
          }
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
          if (isNative) {
            errorDetails = '앱 설정에서 카메라 권한을 확인하거나 앱을 재시작해주세요.'
          } else {
            errorDetails = '브라우저 설정에서 이 사이트의 카메라 권한을 확인하세요.'
          }
        }
        
        setCameraError(`${errorMessage} ${errorDetails}`)
        // 재시도 가능한 에러인지 확인 (NotReadableError는 일시적일 수 있음)
        const isRetryableError = error.name === 'NotReadableError' && retryCountRef.current < 3
        if (!isRetryableError) {
          // 재시도 불가능한 에러는 플래그 리셋하여 수동 재시도 가능하도록
          cameraRequestedRef.current = false
        }
      } finally {
        // 언마운트 시 플래그 리셋
        if (!isMountedRef.current) {
          cameraRequestedRef.current = false
        }
      }
    }

    // 재초기화 함수 (기존 스트림 정리 후 새로 초기화)
    const reinitCamera = async () => {
      console.log('🔄 카메라 스트림 재초기화 시작')
      
      // 1. 기존 스트림 정리
      if (currentStream) {
        currentStream.getTracks().forEach(track => {
          track.stop()
          console.log('🛑 기존 스트림 트랙 정지')
        })
        currentStream = null
      }
      
      // 2. state의 stream도 정리
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
      
      // 3. videoRef 초기화
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      
      // 4. 에러 상태 초기화
      setCameraError(null)
      
      // 5. 스트림이 완전히 해제될 때까지 대기 (OS/하드웨어 레벨 해제 시간 확보)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 스트림 트랙이 완전히 종료되었는지 확인
      const allTracksEnded = await new Promise<boolean>((resolve) => {
        let checkCount = 0
        const maxChecks = 10 // 최대 5초 대기 (500ms * 10)
        const checkInterval = setInterval(() => {
          checkCount++
          // 모든 트랙이 종료되었는지 확인
          if (currentStream === null && (!stream || stream.getVideoTracks().every(track => track.readyState === 'ended'))) {
            clearInterval(checkInterval)
            resolve(true)
          } else if (checkCount >= maxChecks) {
            clearInterval(checkInterval)
            resolve(false) // 시간 초과
          }
        }, 500)
      })
      
      if (!allTracksEnded) {
        console.log('⚠️ 스트림 해제 완료 대기 시간 초과, 재초기화 진행')
      }
      
      // 6. 새 스트림 요청
      if (isMountedRef.current) {
        await initCamera(true) // 재초기화 플래그 전달
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
      if (isMountedRef.current) {
        onCancel()
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      isMountedRef.current = false
      isCleaningUpRef.current = true
      
      // 1. currentStream 정리
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
        currentStream = null
      }
      
      // 2. stream state 정리 (cleanup에서도 stream state 정리 필요)
      // 주의: 언마운트 중이므로 setState는 호출해도 경고가 나올 수 있으나, 정리가 목적이므로 호출
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }
      
      // 3. videoRef 초기화
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      
      // 4. 모든 ref 리셋
      cameraRequestedRef.current = false
      isReinitializingRef.current = false
      retryCountRef.current = 0
      isCapturingRef.current = false
      
      window.removeEventListener('popstate', handlePopState)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 앱 생명주기 이벤트 처리: visibilitychange (백그라운드/포그라운드 전환)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && stream) {
        // 앱이 포그라운드로 돌아왔을 때 스트림 상태 확인
        const video = videoRef.current
        if (!video) return

        // 스트림이 끊어졌는지 확인
        const isStreamActive = stream.active && 
          stream.getVideoTracks().some(track => track.readyState === 'live')
        
        // 비디오가 재생 중이 아니거나 스트림이 끊어졌는지 확인
        if (!isStreamActive || 
            video.readyState === 0 || // HAVE_NOTHING
            video.readyState === 1 || // HAVE_METADATA
            stream.getVideoTracks().every(track => track.readyState !== 'live')) {
          
          console.log('📱 포그라운드 복귀: 스트림 끊김 감지, 재초기화 필요')
          // 재초기화는 initCamera 내부에서 처리되므로 여기서는 호출만
          // reinitCamera는 클로저 내부에 있으므로 직접 호출 불가
          // 대신 stream state를 null로 설정하여 다른 useEffect에서 감지하도록
          if (stream && !isCleaningUpRef.current) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [stream])

  // 스트림 상태 모니터링 및 자동 재초기화
  useEffect(() => {
    if (!stream || !videoRef.current) return

    const checkStreamHealth = () => {
      const video = videoRef.current
      if (!video || !stream) return

      // 스트림이 끊어졌는지 확인
      const isStreamActive = stream.active && 
        stream.getVideoTracks().some(track => track.readyState === 'live')
      
      // 비디오가 재생 중이 아니거나 스트림이 끊어졌는지 확인
      if (!isStreamActive || 
          video.readyState === 0 || // HAVE_NOTHING
          video.readyState === 1 || // HAVE_METADATA
          stream.getVideoTracks().every(track => track.readyState !== 'live')) {
        
        console.log('🔍 스트림 상태 체크: 끊김 감지, 재초기화 필요')
        // 스트림 정리 후 재초기화 트리거 (정리 중이 아닐 때만)
        if (!isCleaningUpRef.current) {
          stream.getTracks().forEach(track => track.stop())
          setStream(null)
        }
      }
    }

    // 주기적으로 스트림 상태 확인 (10초마다)
    const interval = setInterval(checkStreamHealth, 10000)

    // 비디오 이벤트로도 확인
    const video = videoRef.current
    const handleLoadedMetadata = () => {
      checkStreamHealth()
    }
    const handleError = () => {
      console.log('❌ 비디오 에러 발생, 재초기화 필요')
      checkStreamHealth()
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('error', handleError)

    return () => {
      clearInterval(interval)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('error', handleError)
    }
  }, [stream])

  // stream이 null이 되면 재초기화 (다른 useEffect에서 감지한 경우)
  useEffect(() => {
    // 최초 초기화가 완료되었고, 스트림이 없고, 재초기화 중이 아니고, 정리 중이 아니면 재초기화
    // cameraError 조건 제거: 에러가 있어도 재초기화 시도 가능 (NotReadableError는 재시도 가능)
    // 단, 재시도 횟수 제한으로 무한 루프 방지
    if (!stream && 
        isMountedRef.current && 
        !saving && 
        hasInitializedRef.current && 
        !isReinitializingRef.current &&
        !isCleaningUpRef.current &&
        retryCountRef.current < 3) {
      
      // 스트림이 없으면 재초기화 필요 (에러가 있어도 재시도)
      console.log('🔄 스트림이 null이 되었으므로 재초기화 시작', { retryCount: retryCountRef.current })
      isReinitializingRef.current = true
      retryCountRef.current++
      
      // 기존 initCamera 로직을 다시 실행
      const reinit = async () => {
        cameraRequestedRef.current = false
        
        try {
          let mediaStream: MediaStream | null = null
          
          // 후면 카메라 강제 사용
          try {
            const exactConstraints: MediaStreamConstraints = {
              video: {
                facingMode: { exact: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            }
            mediaStream = await navigator.mediaDevices.getUserMedia(exactConstraints)
          } catch (exactError) {
            try {
              const idealConstraints: MediaStreamConstraints = {
                video: {
                  facingMode: { ideal: 'environment' },
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
                }
              }
              mediaStream = await navigator.mediaDevices.getUserMedia(idealConstraints)
            } catch (idealError) {
              const fallbackConstraints: MediaStreamConstraints = {
                video: {
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
                }
              }
              mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
            }
          }
          
          if (mediaStream && isMountedRef.current) {
            setStream(mediaStream)
            setCameraError(null)
            isReinitializingRef.current = false
            retryCountRef.current = 0 // 성공 시 재시도 횟수 리셋
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream
            }
            console.log('✅ 카메라 스트림 재초기화 완료')
          } else {
            isReinitializingRef.current = false
            // 재시도 횟수 초과 시 리셋하여 수동 재시도 가능하도록
            if (retryCountRef.current >= 3) {
              retryCountRef.current = 0
            }
          }
        } catch (error: any) {
          console.error('재초기화 실패:', error, { retryCount: retryCountRef.current })
          isReinitializingRef.current = false
          
          // 재시도 가능한 에러인지 확인
          const isRetryableError = error.name === 'NotReadableError' && retryCountRef.current < 3
          
          // 재시도 불가능하거나 재시도 횟수 초과 시에만 에러 메시지 표시
          if (!isRetryableError) {
            const isNative = Capacitor.isNativePlatform()
            let errorMessage = '카메라 접근에 실패했습니다.'
            let errorDetails = isNative 
              ? '앱 설정에서 카메라 권한을 확인하거나 앱을 재시작해주세요.'
              : '브라우저 설정에서 이 사이트의 카메라 권한을 확인하세요.'
            
            if (error.name === 'NotAllowedError') {
              errorMessage = '카메라 접근 권한이 거부되었습니다.'
              // NotAllowedError는 재시도 불가능
              retryCountRef.current = 0 // 수동 재시도 가능하도록 리셋
            } else if (error.name === 'NotReadableError') {
              errorMessage = '카메라를 사용할 수 없습니다.'
              errorDetails = '다른 앱에서 카메라를 사용 중일 수 있습니다. 다른 앱을 종료하고 다시 시도하세요.'
            } else if (retryCountRef.current >= 3) {
              errorDetails = '재시도 횟수를 초과했습니다. 앱을 재시작하거나 잠시 후 다시 시도해주세요.'
              retryCountRef.current = 0 // 수동 재시도 가능하도록 리셋
            }
            
            setCameraError(`${errorMessage} ${errorDetails}`)
          } else {
            // 재시도 가능한 에러는 잠시 대기 후 자동 재시도
            console.log(`⏳ 재시도 가능한 에러 감지 (${retryCountRef.current}/3), ${2000}ms 후 자동 재시도...`)
            
            // 재시도 대기 (이미 useEffect에서 retryCountRef가 증가했으므로 추가 증가 없음)
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // 플래그 리셋하여 useEffect가 다시 실행되도록 함
            // 단, 재시도 횟수가 초과되지 않았을 때만
            if (isMountedRef.current && retryCountRef.current < 3) {
              isReinitializingRef.current = false
              cameraRequestedRef.current = false
              // stream이 이미 null이고 플래그가 리셋되었으므로 
              // useEffect가 조건을 만족하여 자동으로 재초기화 시도
            } else {
              // 재시도 횟수 초과 시 에러 메시지 표시
              isReinitializingRef.current = false
              cameraRequestedRef.current = false
              const isNative = Capacitor.isNativePlatform()
              setCameraError(`카메라 접근에 실패했습니다. 재시도 횟수를 초과했습니다. ${isNative ? '앱을 재시작하거나' : '페이지를 새로고침하거나'} 잠시 후 다시 시도해주세요.`)
              retryCountRef.current = 0 // 수동 재시도 가능하도록 리셋
            }
            return // 재시도 중이거나 횟수 초과 시 함수 종료
          }
        }
      }
      
      reinit()
    }
  }, [stream, cameraError, saving])

  // localStorage에서 사진 및 현재 인덱스 복원 (앱 재시작 시)
  useEffect(() => {
    const restoredPhotos: Record<number, string> = {}
    let lastPhotoIndex = -1
    
    // 저장된 사진 복원
    for (let i = 0; i < photoItems.length; i++) {
      const photoKey = `checklist_photo_${checklistId}_${mode}_${i}`
      const savedPhoto = localStorage.getItem(photoKey)
      
      if (savedPhoto) {
        restoredPhotos[i] = savedPhoto
        lastPhotoIndex = i // 마지막으로 찍은 사진의 인덱스 추적
        console.log(`📸 복원된 사진: ${photoItems[i]?.area} (인덱스 ${i})`)
      }
    }
    
    // 저장된 사진이 있으면 복원
    if (Object.keys(restoredPhotos).length > 0) {
      setTempPhotos(restoredPhotos)
      console.log(`✅ ${Object.keys(restoredPhotos).length}개의 사진이 복원되었습니다.`)
      
      // 마지막으로 찍은 사진의 다음 인덱스로 시작
      // 모든 사진을 찍었으면 마지막 인덱스 유지, 아니면 다음 인덱스로
      const nextIndex = lastPhotoIndex < photoItems.length - 1 ? lastPhotoIndex + 1 : lastPhotoIndex
      setCurrentIndex(nextIndex)
      console.log(`📍 현재 인덱스 복원: ${nextIndex} (마지막 사진 인덱스: ${lastPhotoIndex})`)
    } else {
      // 저장된 사진이 없으면 저장된 currentIndex 확인
      const indexKey = `checklist_current_index_${checklistId}_${mode}`
      const savedIndex = localStorage.getItem(indexKey)
      if (savedIndex !== null) {
        const parsedIndex = parseInt(savedIndex, 10)
        if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < photoItems.length) {
          setCurrentIndex(parsedIndex)
          console.log(`📍 저장된 인덱스 복원: ${parsedIndex}`)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistId, mode]) // 컴포넌트 마운트 시 한 번만 실행

  // currentIndex 변경 시마다 localStorage에 자동 저장
  useEffect(() => {
    const indexKey = `checklist_current_index_${checklistId}_${mode}`
    try {
      localStorage.setItem(indexKey, currentIndex.toString())
      console.log(`📍 현재 인덱스 자동 저장: ${currentIndex}`)
    } catch (error) {
      console.error('currentIndex localStorage 자동 저장 실패:', error)
    }
  }, [currentIndex, checklistId, mode])

  // 메타데이터 로딩 대기 (타임아웃 포함, 무한 로딩 방지)
  const waitForVideoMetadata = async (video: HTMLVideoElement, timeout = 2000): Promise<boolean> => {
    // 이미 준비된 경우 즉시 반환
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      return true
    }

    // iOS는 더 긴 타임아웃 필요
    const actualTimeout = isIOSRef.current ? 3000 : timeout

    try {
      // Promise.race로 타임아웃과 메타데이터 로딩 경쟁
      const result = await Promise.race([
        // 메타데이터 로딩 대기
        new Promise<boolean>((resolve) => {
          // 컴포넌트가 언마운트되면 즉시 종료
          if (!isMountedRef.current) {
            resolve(false)
            return
          }

          const checkMetadata = () => {
            // 컴포넌트 언마운트 확인
            if (!isMountedRef.current) {
              video.removeEventListener('loadedmetadata', checkMetadata)
              resolve(false)
              return
            }

            // 메타데이터가 로드되었는지 확인
            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
              video.removeEventListener('loadedmetadata', checkMetadata)
              resolve(true)
            }
          }

          // 이미 이벤트가 발생했을 수 있으므로 즉시 확인
          checkMetadata()

          // 이벤트 리스너 등록
          video.addEventListener('loadedmetadata', checkMetadata)
        }),
        // 타임아웃
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            if (isMountedRef.current) {
              console.log('⚠️ 메타데이터 로딩 타임아웃 (대체 크기 사용)')
              resolve(false)
            } else {
              resolve(false)
            }
          }, actualTimeout)
        })
      ])

      return result
    } catch (error) {
      console.error('메타데이터 대기 중 오류:', error)
      return false
    }
  }

  // 비디오 크기 가져오기 (대체 로직 포함)
  const getVideoDimensions = (video: HTMLVideoElement): { width: number; height: number } => {
    // 1차 시도: videoWidth/videoHeight (실제 비디오 스트림 크기)
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      return { width: video.videoWidth, height: video.videoHeight }
    }

    // 2차 시도: clientWidth/clientHeight (화면에 표시되는 크기)
    if (video.clientWidth > 0 && video.clientHeight > 0) {
      // 비디오 스트림의 종횡비를 고려 (일반적으로 16:9)
      const aspectRatio = 16 / 9
      const width = Math.max(video.clientWidth, 1280) // 최소 1280px
      const height = Math.round(width / aspectRatio)
      return { width, height }
    }

    // 3차 시도: 기본값 (1920x1080)
    console.log('⚠️ 비디오 크기를 가져올 수 없어 기본값 사용 (1920x1080)')
    return { width: 1920, height: 1080 }
  }

  const capturePhoto = async () => {
    // 중복 클릭 방지
    if (isCapturingRef.current || captureLoading || saving) {
      console.log('⏸️ 이미 캡처 중이거나 저장 중입니다.')
      return
    }

    // 기본 유효성 검사
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ 비디오 또는 캔버스 요소를 찾을 수 없습니다.')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    // 캡처 시작
    isCapturingRef.current = true
    setCaptureLoading(true)

    try {
      // 컴포넌트 마운트 확인
      if (!isMountedRef.current) {
        return
      }

      // 메타데이터 로딩 대기 (iOS에서 스크린샷 문제 해결)
      const metadataLoaded = await waitForVideoMetadata(video)

      if (!metadataLoaded) {
        console.log('⚠️ 메타데이터 로딩 타임아웃, 대체 크기 사용하여 캡처 진행')
      }

      // 컴포넌트 마운트 재확인 (비동기 작업 후)
      if (!isMountedRef.current) {
        return
      }

      // 비디오 크기 가져오기 (대체 로직 포함)
      const { width, height } = getVideoDimensions(video)

      // 캔버스 크기 설정
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('❌ 캔버스 컨텍스트를 가져올 수 없습니다.')
        return
      }

      // 비디오 프레임을 캔버스에 그리기
      ctx.drawImage(video, 0, 0, width, height)
      
      // 임시 저장 (base64로 저장)
      const dataURL = canvas.toDataURL('image/jpeg', 0.8)
      
      // 컴포넌트 마운트 재확인
      if (!isMountedRef.current) {
        return
      }

      // 1. React 상태에 저장 (UI 즉시 반영)
      setTempPhotos(prev => ({
        ...prev,
        [currentIndex]: dataURL
      }))
      
      // 2. localStorage에 백업 저장 (앱 꺼져도 유지, 서버 요청 없음)
      const photoKey = `checklist_photo_${checklistId}_${mode}_${currentIndex}`
      try {
        localStorage.setItem(photoKey, dataURL)
        console.log(`💾 사진 로컬 저장: ${photoItems[currentIndex]?.area} (인덱스 ${currentIndex})`)
      } catch (error) {
        console.error('localStorage 저장 실패:', error)
        // localStorage 용량 초과 시 오래된 사진 정리
        cleanupOldPhotos()
        // 재시도
        try {
          localStorage.setItem(photoKey, dataURL)
        } catch (retryError) {
          console.error('localStorage 재시도 실패:', retryError)
        }
      }

      // 자동으로 다음 항목으로 이동
      const nextIndex = currentIndex + 1
      if (nextIndex < photoItems.length) {
        setCurrentIndex(nextIndex)
        // useEffect에서 자동 저장되므로 여기서는 저장하지 않음
        console.log(`➡️ 다음 인덱스로 이동: ${nextIndex}`)
      } else {
        // 모든 사진을 찍었으면 마지막 인덱스 유지 (useEffect에서 자동 저장됨)
        console.log(`✅ 모든 사진 촬영 완료 (인덱스 ${currentIndex})`)
      }
    } catch (error) {
      // 에러 처리
      console.error('캡처 중 오류:', error)
      if (isMountedRef.current) {
        // 사용자에게 에러 표시 (필요시)
        // alert는 사용자 경험을 해칠 수 있으므로 콘솔 로그만 남김
        console.error('사진 촬영에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      // 상태 정리 (컴포넌트가 마운트되어 있을 때만)
      if (isMountedRef.current) {
        isCapturingRef.current = false
        setCaptureLoading(false)
      }
    }
  }
  
  // localStorage 용량 관리: 오래된 사진 정리 (7일 이상)
  const cleanupOldPhotos = () => {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('checklist_photo_')) {
          // 타임스탬프가 없으면 오래된 형식이므로 유지 (호환성)
          // 새로운 형식은 타임스탬프를 포함하지 않으므로 모든 checklist_photo_ 키를 확인
          // 대신 현재 체크리스트가 아닌 것만 정리
          if (key && !key.includes(checklistId)) {
            keysToRemove.push(key)
          }
        }
      }
      
      // 오래된 사진 삭제 (현재 체크리스트가 아닌 것만)
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.error(`localStorage 삭제 실패: ${key}`, e)
        }
      })
      
      if (keysToRemove.length > 0) {
        console.log(`🧹 ${keysToRemove.length}개의 오래된 사진이 정리되었습니다.`)
      }
    } catch (error) {
      console.error('localStorage 정리 실패:', error)
    }
  }

  const removePhoto = (index: number) => {
    setTempPhotos(prev => {
      const newPhotos = { ...prev }
      delete newPhotos[index]
      return newPhotos
    })
    
    // localStorage에서도 삭제
    const photoKey = `checklist_photo_${checklistId}_${mode}_${index}`
    try {
      localStorage.removeItem(photoKey)
      console.log(`🗑️ 사진 삭제: ${photoItems[index]?.area} (인덱스 ${index})`)
    } catch (error) {
      console.error('localStorage 삭제 실패:', error)
    }
    
    setCurrentIndex(index)
    // useEffect에서 자동 저장되므로 여기서는 저장하지 않음
    console.log(`📍 재촬영을 위해 인덱스로 이동: ${index}`)
  }

  const handleSave = async () => {
    // 관리전/관리후 사진 모두 확인 필요
    if (!confirm('저장할까요?')) {
      return
    }

    setSaving(true)
    let uploadError: Error | null = null

    try {
      // 업로드 및 업데이트
      const uploadPhotoFile = async (index: number, dataURL: string): Promise<string | null> => {
        try {
          // base64를 Blob로 변환 (사파리 호환성 개선)
          let blob: Blob
          try {
            const response = await fetch(dataURL)
            blob = await response.blob()
          } catch (fetchError) {
            // fetch 실패 시 base64 직접 변환
            const base64Data = dataURL.split(',')[1]
            const byteCharacters = atob(base64Data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            blob = new Blob([byteArray], { type: 'image/jpeg' })
          }
          
          const file = new File([blob], `photo-${Date.now()}-${index}.jpg`, { type: 'image/jpeg' })

          // Supabase Storage에 업로드
          const { uploadPhoto } = await import('@/lib/supabase/upload')
          const url = await uploadPhoto(
            file,
            storeId,
            mode === 'before' ? 'checklist_before' : 'checklist_after'
          )
          
          if (!url || url.trim() === '') {
            throw new Error('업로드된 파일의 URL을 가져올 수 없습니다.')
          }
          
          return url
        } catch (error) {
          console.error('사진 업로드 실패:', error)
          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
          uploadError = new Error(`사진 업로드 실패 (${photoItems[index]?.area || '알 수 없음'}): ${errorMessage}`)
          return null
        }
      }

      // localStorage에서 사진 로드 (앱 재시작 후 복원된 사진 포함)
      const photosToUpload: Record<number, string> = {}
      
      for (let i = 0; i < photoItems.length; i++) {
        const photoKey = `checklist_photo_${checklistId}_${mode}_${i}`
        const savedPhoto = localStorage.getItem(photoKey)
        
        if (savedPhoto) {
          // localStorage에 저장된 사진 우선 사용
          photosToUpload[i] = savedPhoto
        } else if (tempPhotos[i]) {
          // 메모리에만 있는 경우 (새로 찍은 사진)
          photosToUpload[i] = tempPhotos[i]
        }
      }
      
      console.log(`📤 업로드할 사진 수: ${Object.keys(photosToUpload).length}개`)
      
      // 모든 사진 업로드 (순차적으로, 배치 처리)
      const updatedItems = [...items]
      let successCount = 0
      let failCount = 0
      
      for (let i = 0; i < photoItems.length; i++) {
        if (photosToUpload[i]) {
          const url = await uploadPhotoFile(i, photosToUpload[i])
          if (url) {
            successCount++
            // area와 타입을 모두 고려하여 정확히 매칭
            const currentPhotoItem = photoItems[i]
            const itemToUpdate = updatedItems.find(item => {
              // area가 정확히 일치하고
              if (item.area?.trim() !== currentPhotoItem.area?.trim()) {
                return false
              }
              // 타입도 일치해야 함
              if (mode === 'before') {
                // 관리전: before_photo 또는 before_after_photo 타입
                return item.type === 'before_photo' || item.type === 'before_after_photo'
              } else {
                // 관리후: after_photo 또는 before_after_photo 타입
                return item.type === 'after_photo' || item.type === 'before_after_photo'
              }
            })
            
            if (itemToUpdate) {
              const itemIndex = updatedItems.indexOf(itemToUpdate)
              if (mode === 'before') {
                updatedItems[itemIndex] = {
                  ...updatedItems[itemIndex],
                  before_photo_url: url
                }
                console.log(`✅ 관리전 사진 업로드 완료: ${currentPhotoItem.area}`, url)
              } else {
                updatedItems[itemIndex] = {
                  ...updatedItems[itemIndex],
                  after_photo_url: url
                }
                console.log(`✅ 관리후 사진 업로드 완료: ${currentPhotoItem.area}`, url)
              }
              
              // 업로드 성공 시 localStorage에서 삭제
              const photoKey = `checklist_photo_${checklistId}_${mode}_${i}`
              try {
                localStorage.removeItem(photoKey)
                console.log(`🗑️ 업로드 완료 후 로컬 삭제: ${currentPhotoItem.area}`)
              } catch (error) {
                console.error('localStorage 삭제 실패:', error)
              }
            } else {
              console.error(`❌ 매칭되는 아이템을 찾을 수 없음: area=${currentPhotoItem.area}, type=${currentPhotoItem.type}, mode=${mode}`)
              failCount++
            }
          } else {
            failCount++
            // 업로드 실패한 사진은 localStorage에 유지 (다음 저장 시도 시 재시도)
            console.log(`⚠️ 업로드 실패, 로컬에 보관: ${photoItems[i]?.area}`)
          }
        }
      }

      // 업로드 결과 확인
      if (failCount > 0) {
        const errorMsg = uploadError?.message || '일부 사진 업로드에 실패했습니다.'
        console.error('사진 업로드 실패:', errorMsg)
        alert(`경고: ${failCount}개의 사진 업로드에 실패했습니다.\n\n${errorMsg}\n\n성공한 ${successCount}개의 사진은 저장됩니다.`)
      }

      // 스트림 정리
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      // 성공한 사진이 하나라도 있으면 onComplete 호출
      if (successCount > 0) {
        // 모든 사진이 성공적으로 업로드되었는지 확인
        const totalPhotos = Object.keys(photosToUpload).length
        const allPhotosUploaded = successCount === totalPhotos && failCount === 0
        
        if (allPhotosUploaded) {
          // 모든 사진 업로드 완료 시 localStorage 정리
          const indexKey = `checklist_current_index_${checklistId}_${mode}`
          try {
            localStorage.removeItem(indexKey)
            console.log(`🗑️ 모든 사진 저장 완료, 인덱스 삭제`)
          } catch (error) {
            console.error('currentIndex localStorage 삭제 실패:', error)
          }
          
          // 남아있는 사진도 정리 (혹시 모를 경우 대비)
          for (let i = 0; i < photoItems.length; i++) {
            const photoKey = `checklist_photo_${checklistId}_${mode}_${i}`
            try {
              localStorage.removeItem(photoKey)
            } catch (error) {
              // 무시
            }
          }
        }
        
        onComplete(updatedItems)
      } else {
        // 모든 사진 업로드 실패
        throw new Error(uploadError?.message || '모든 사진 업로드에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.')
      }
    } catch (error: any) {
      console.error('저장 중 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      
      // 스트림 정리
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      
      // 사파리 호환성을 위해 setTimeout으로 alert 지연
      setTimeout(() => {
        alert(`저장 실패: ${errorMessage}\n\n다시 시도해주세요.`)
      }, 100)
      
      // 에러 발생 시에도 saving 상태 해제
      setSaving(false)
    } finally {
      // 성공한 경우는 onComplete에서 처리되므로 여기서는 실패한 경우만 처리
      if (uploadError && uploadError.message.includes('모든 사진 업로드에 실패')) {
        setSaving(false)
      }
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

      {/* 캡처 중 오버레이 (저장 중이 아닐 때만 표시) */}
      {captureLoading && !saving && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-white bg-opacity-90 rounded-lg px-4 py-2 flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            <p className="text-sm font-medium text-gray-900">캡처 중...</p>
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
            {Capacitor.isNativePlatform() ? (
              <>
                <p className="font-medium mb-2">📱 Android 앱 해결 방법:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Android 설정 앱 열기</li>
                  <li><strong>"앱"</strong> 또는 <strong>"애플리케이션"</strong> 선택</li>
                  <li><strong>"무플(MUPL)"</strong> 앱 찾기</li>
                  <li><strong>"권한"</strong> 또는 <strong>"Permissions"</strong> 선택</li>
                  <li><strong>"카메라"</strong> 권한을 <strong>"허용"</strong>으로 변경</li>
                  <li>앱으로 돌아와서 다시 시도</li>
                </ol>
                <div className="mt-3 pt-3 border-t border-red-500">
                  <p className="font-medium mb-1">⚠️ 중요:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>다른 앱에서 카메라를 사용 중이면 종료하세요</li>
                    <li>앱을 완전히 종료하고 다시 실행해보세요</li>
                    <li>권한 설정 후 앱을 재시작해야 할 수 있습니다</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
            <button
              onClick={() => {
                setCameraError(null)
                // 카메라 재시도
                window.location.reload()
              }}
              className="mt-3 w-full px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-medium transition-colors"
            >
              🔄 {Capacitor.isNativePlatform() ? '앱 재시작 후 다시 시도' : '권한 설정 후 새로고침'}
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
          // 모든 환경에서 비디오 스트림 사용 (연속 촬영 가능)
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
              disabled={captureLoading || saving || isCapturingRef.current}
              className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:bg-gray-100 active:scale-95 transition-transform flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white relative"
              title={captureLoading ? "캡처 중..." : "사진 촬영"}
              aria-label={captureLoading ? "캡처 중입니다" : "사진 촬영"}
              aria-busy={captureLoading}
            >
              {captureLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                </div>
              ) : (
                <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-400"></div>
              )}
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

