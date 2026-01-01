'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useTodayAttendance } from '@/contexts/AttendanceContext'
import { uploadPhoto } from '@/lib/supabase/upload'
import { useToast } from '@/components/Toast'

type TabType = 'store_problem' | 'vending_machine' | 'lost_item'

interface PhotoItem {
  id: string
  url: string
  isUploading?: boolean
}

interface StoreProblemForm {
  category: string
  description: string
  photos: PhotoItem[]
}

interface VendingMachineForm {
  category: string
  vending_machine_number: number | ''
  product_number: string
  description: string
}

interface LostItemForm {
  category: string
  photos: PhotoItem[]
  storage_location: string
  description: string
}

export default function IssuesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('store_problem')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 출근 정보
  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()

  // 폼 데이터
  const [storeProblemForm, setStoreProblemForm] = useState<StoreProblemForm>({
    category: '',
    description: '',
    photos: [],
  })

  const [vendingMachineForm, setVendingMachineForm] = useState<VendingMachineForm>({
    category: '',
    vending_machine_number: '',
    product_number: '',
    description: '',
  })

  const [lostItemForm, setLostItemForm] = useState<LostItemForm>({
    category: '',
    photos: [],
    storage_location: '',
    description: '',
  })

  // 사진 업로드 관련
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState<number | null>(null)
  const [uploadingPhotoIds, setUploadingPhotoIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const photoIdCounterRef = useRef(0)

  // 토스트 메시지
  const { showToast, ToastContainer } = useToast()

  // 카메라 모달 관련
  const [showCamera, setShowCamera] = useState(false)
  const [cameraTab, setCameraTab] = useState<TabType>('store_problem')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    if (!attendanceLoading && (!isClockedIn || !attendanceStoreId)) {
      // 출근하지 않았을 때는 나중에 처리
    }
  }, [attendanceLoading, isClockedIn, attendanceStoreId])

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

  // 뒤로가기 처리 (카메라 모달이 열려있을 때)
  useEffect(() => {
    if (!showCamera) return

    const handlePopState = (event: PopStateEvent) => {
      // 카메라 모달이 열려있을 때 뒤로가기 시 카메라 닫기
      closeCamera()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [showCamera])

  const handlePhotoUpload = async (files: FileList | null, tab: TabType) => {
    console.log('🔍 handlePhotoUpload called:', { filesCount: files?.length, tab })
    
    if (!files || files.length === 0) {
      console.log('❌ No files provided')
      return
    }
    
    if (!attendanceStoreId) {
      console.error('❌ No attendance store ID')
      alert('출근한 매장이 없습니다.')
      return
    }

    console.log('🔍 Getting session...')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('❌ No session found')
      alert('로그인이 필요합니다.')
      return
    }

    console.log('✅ Session found, user:', session.user.id)

    // 파일 배열 준비
    const fileArray = Array.from(files)
    const maxPhotos = 5
    
    // 현재 사진 개수 확인
    let currentPhotos: PhotoItem[] = []
    if (tab === 'store_problem') {
      currentPhotos = storeProblemForm.photos
    } else if (tab === 'lost_item') {
      currentPhotos = lostItemForm.photos
    }
    
    const currentPhotoCount = currentPhotos.length
    const remainingSlots = maxPhotos - currentPhotoCount

    if (remainingSlots <= 0) {
      alert('사진은 최대 10장까지 업로드 가능합니다.')
      return
    }

    const filesToUpload = fileArray.slice(0, remainingSlots)
    const previewPhotos: PhotoItem[] = []

    for (const file of filesToUpload) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.')
        continue
      }

      const photoId = `photo-${Date.now()}-${photoIdCounterRef.current++}`
      const previewUrl = URL.createObjectURL(file)
      previewPhotos.push({ id: photoId, url: previewUrl, isUploading: true })
    }

    if (previewPhotos.length === 0) {
      console.log('❌ No valid photos to add')
      return
    }

    console.log('📸 Adding preview photos:', previewPhotos.length, 'photos')
    console.log('📸 Preview photo URLs:', previewPhotos.map(p => ({ id: p.id, url: p.url.substring(0, 50) + '...' })))
    
    // 미리보기 사진을 즉시 상태에 추가
    // 함수형 업데이트를 사용하여 이전 상태를 정확히 참조
    let newPhotoCount = 0
    if (tab === 'store_problem') {
      setStoreProblemForm(prev => {
        const currentCount = prev.photos.length
        const newPhotos = [...prev.photos, ...previewPhotos]
        newPhotoCount = newPhotos.length
        console.log('📸 Store problem photos updated:', currentCount, '->', newPhotoCount, 'total photos')
        console.log('📸 All photo IDs:', newPhotos.map(p => p.id))
        // 상태 업데이트 후 강제로 리렌더링을 트리거하기 위해 새로운 배열 참조 반환
        return { ...prev, photos: newPhotos }
      })
      
      // 즉시 리렌더링 강제 (여러 방법으로 시도)
      requestAnimationFrame(() => {
        setStoreProblemForm(prev => ({ ...prev, photos: [...prev.photos] }))
      })
    } else if (tab === 'lost_item') {
      setLostItemForm(prev => {
        const currentCount = prev.photos.length
        const newPhotos = [...prev.photos, ...previewPhotos]
        newPhotoCount = newPhotos.length
        console.log('📸 Lost item photos updated:', currentCount, '->', newPhotoCount, 'total photos')
        console.log('📸 All photo IDs:', newPhotos.map(p => p.id))
        // 상태 업데이트 후 강제로 리렌더링을 트리거하기 위해 새로운 배열 참조 반환
        return { ...prev, photos: newPhotos }
      })
      
      // 즉시 리렌더링 강제 (여러 방법으로 시도)
      requestAnimationFrame(() => {
        setLostItemForm(prev => ({ ...prev, photos: [...prev.photos] }))
      })
    }
    
    // 백그라운드 업로드 시작 (비동기로 실행)
    uploadPhotosInBackground(previewPhotos, filesToUpload, tab, session.user.id)
    
    // Promise를 반환하여 handleFileSelect에서 연속 촬영을 처리할 수 있도록 함
    return Promise.resolve()

  }

  // 백그라운드 업로드 함수
  const uploadPhotosInBackground = async (
    previewPhotos: PhotoItem[],
    filesToUpload: File[],
    tab: TabType,
    userId: string
  ) => {
    // 백그라운드에서 업로드 진행 (각 파일을 순차적으로 업로드)
    for (let i = 0; i < previewPhotos.length; i++) {
      const photo = previewPhotos[i]
      const file = filesToUpload[i]
      
      setUploadingPhotoIds(prev => new Set(prev).add(photo.id))
      
      try {
        const uploadedUrl = await uploadPhoto(file, attendanceStoreId!, 'issue', userId)
        
        // 미리보기 URL 해제
        URL.revokeObjectURL(photo.url)
        
        // 업로드된 URL로 교체 (함수형 업데이트 사용)
        if (tab === 'store_problem') {
          setStoreProblemForm(prev => ({
            ...prev,
            photos: prev.photos.map(p => 
              p.id === photo.id ? { ...p, url: uploadedUrl, isUploading: false } : p
            )
          }))
        } else if (tab === 'lost_item') {
          setLostItemForm(prev => ({
            ...prev,
            photos: prev.photos.map(p => 
              p.id === photo.id ? { ...p, url: uploadedUrl, isUploading: false } : p
            )
          }))
        }
      } catch (error: any) {
        console.error('Photo upload error:', error)
        // 미리보기 URL 해제
        URL.revokeObjectURL(photo.url)
        
        // 업로드 실패 시 해당 사진 제거 (함수형 업데이트 사용)
        if (tab === 'store_problem') {
          setStoreProblemForm(prev => ({
            ...prev,
            photos: prev.photos.filter(p => p.id !== photo.id)
          }))
        } else if (tab === 'lost_item') {
          setLostItemForm(prev => ({
            ...prev,
            photos: prev.photos.filter(p => p.id !== photo.id)
          }))
        }
        
        alert(`사진 업로드 실패: ${error.message}`)
      } finally {
        setUploadingPhotoIds(prev => {
          const next = new Set(prev)
          next.delete(photo.id)
          return next
        })
      }
    }
  }

  const handleCameraClick = () => {
    console.log('📷 Camera button clicked')
    setCameraTab(activeTab)
    setShowCamera(true)
    // 브라우저 히스토리에 엔트리 추가 (뒤로가기 감지용)
    window.history.pushState({ cameraMode: true }, '')
    initCamera()
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

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const dataURL = canvas.toDataURL('image/jpeg', 0.8)
    
    // File 객체로 변환
    const response = await fetch(dataURL)
    const blob = await response.blob()
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })

    // 현재 탭에 따라 사진 추가
    const currentPhotoCount = cameraTab === 'store_problem' 
      ? storeProblemForm.photos.length 
      : lostItemForm.photos.length

    if (currentPhotoCount >= 10) {
      alert('최대 10장까지 촬영 가능합니다.')
      return
    }

    // DataTransfer를 사용하여 FileList 생성
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    const fileList = dataTransfer.files

    // 사진 업로드 처리
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await handlePhotoUpload(fileList, cameraTab)
    }
  }

  const handleGalleryClick = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ''
      galleryInputRef.current.click()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    console.log('📁 File selected:', files?.length, 'files', files ? Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })) : 'no files')
    
    if (!files || files.length === 0) {
      console.log('❌ No files selected')
      return
    }

    // 파일을 배열로 복사 (input 초기화 전에 해야 함!)
    const filesArray = Array.from(files)
    console.log('📦 Files copied to array:', filesArray.length, 'files')

    const currentTab = activeTab
    console.log('📋 Current tab:', currentTab)

    // input 즉시 초기화 (다음 촬영을 위해)
    const inputElement = e.target
    if (inputElement) {
      inputElement.value = ''
      console.log('🔄 Input cleared immediately for next capture')
    }

    // 사진 업로드 처리 (비동기로 진행, 즉시 미리보기 표시)
    console.log('🚀 Starting photo upload process...')
    
    // FileList 대신 배열을 사용하기 위해 임시 FileList 생성
    const dataTransfer = new DataTransfer()
    filesArray.forEach(file => dataTransfer.items.add(file))
    const fileList = dataTransfer.files
    
    // 현재 사진 개수 확인
    const currentPhotoCount = currentTab === 'store_problem' ? storeProblemForm.photos.length : lostItemForm.photos.length
    const willBeNewCount = currentPhotoCount + filesArray.length
    
    // 사진 업로드 처리 (비동기로 진행, 즉시 미리보기 표시)
    handlePhotoUpload(fileList, currentTab)
      .then(() => {
        console.log('✅ Photo upload process completed successfully')
      })
      .catch(error => {
        console.error('❌ Photo upload error:', error)
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        alert(`사진 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      })
  }

  const removePhoto = (index: number) => {
    if (activeTab === 'store_problem') {
      const photoToRemove = storeProblemForm.photos[index]
      // 미리보기 URL인 경우 해제
      if (photoToRemove?.url.startsWith('blob:')) {
        URL.revokeObjectURL(photoToRemove.url)
      }
      const newPhotos = storeProblemForm.photos.filter((_, i) => i !== index)
      setStoreProblemForm({ ...storeProblemForm, photos: newPhotos })
    } else if (activeTab === 'lost_item') {
      const photoToRemove = lostItemForm.photos[index]
      // 미리보기 URL인 경우 해제
      if (photoToRemove?.url.startsWith('blob:')) {
        URL.revokeObjectURL(photoToRemove.url)
      }
      const newPhotos = lostItemForm.photos.filter((_, i) => i !== index)
      setLostItemForm({ ...lostItemForm, photos: newPhotos })
    }
  }

  const handleSubmit = async () => {
    if (!attendanceStoreId) {
      alert('출근한 매장이 없습니다.')
      return
    }

    if (!isClockedIn) {
      alert('관리시작 후 사용 가능합니다.')
      return
    }

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }

    setSubmitting(true)

    try {
      if (activeTab === 'store_problem') {
        if (!storeProblemForm.category) {
          alert('카테고리를 선택해주세요.')
          setSubmitting(false)
          return
        }

        // title에 "매장 문제" 접두사 추가 (업체관리자 앱에서 필터링하기 위해)
        const title = `매장 문제: ${storeProblemForm.category}`
        // 모든 사진 URL 배열 생성 (업로드 완료된 사진만)
        const photoUrls = storeProblemForm.photos.map(photo => photo.url).filter(url => url && !url.startsWith('blob:'))
        
        // 업로드 중인 사진이 있으면 대기
        const hasUploadingPhotos = storeProblemForm.photos.some(photo => photo.isUploading)
        if (hasUploadingPhotos) {
          alert('사진 업로드가 완료될 때까지 기다려주세요.')
          setSubmitting(false)
          return
        }

        const response = await fetch('/api/staff/problem-reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: attendanceStoreId,
            category: storeProblemForm.category, // 한국어 카테고리 값 전달 (title에 포함)
            title: title,
            description: storeProblemForm.description?.trim() || null,
            photo_url: photoUrls.length > 0 ? photoUrls[0] : null, // 하위 호환성을 위해 첫 번째 사진
            photo_urls: photoUrls.length > 0 ? photoUrls : undefined, // 모든 사진 배열
          }),
        })

        if (!response.ok) {
          const contentType = response.headers.get('content-type')
          let errorMessage = '매장 문제 보고 등록에 실패했습니다.'
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

        const data = await response.json()

        // 미션 완료 이벤트 발생
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('missionComplete', {
            detail: { missionId: 'store_issues' }
          }))
        }

        showToast('매장 문제 보고가 등록되었습니다.', 'success')
        setStoreProblemForm({
          category: '',
          description: '',
          photos: [],
        })
      } else if (activeTab === 'vending_machine') {
        if (!vendingMachineForm.category) {
          alert('카테고리를 선택해주세요.')
          setSubmitting(false)
          return
        }
        if (!vendingMachineForm.vending_machine_number) {
          alert('자판기 번호를 선택해주세요.')
          setSubmitting(false)
          return
        }
        if (!vendingMachineForm.product_number.trim()) {
          alert('제품 번호를 입력해주세요.')
          setSubmitting(false)
          return
        }

        const title = `${vendingMachineForm.category} - ${vendingMachineForm.vending_machine_number}번 자판기`
        const description = `제품 번호: ${vendingMachineForm.product_number}${vendingMachineForm.description ? `\n${vendingMachineForm.description}` : ''}`

        // vending_machine_number를 숫자로 변환
        const vendingMachineNum = typeof vendingMachineForm.vending_machine_number === 'number' 
          ? vendingMachineForm.vending_machine_number 
          : Number(vendingMachineForm.vending_machine_number)

        const response = await fetch('/api/staff/problem-reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: attendanceStoreId,
            category: vendingMachineForm.category, // 한국어 카테고리 값 전달 (title에 포함)
            title: title,
            description: description || null,
            vending_machine_number: vendingMachineNum,
            product_number: vendingMachineForm.product_number.trim(),
          }),
        })

        if (!response.ok) {
          const contentType = response.headers.get('content-type')
          let errorMessage = '자판기 내부 문제 등록에 실패했습니다.'
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

        const data = await response.json()

        showToast('자판기 내부 문제가 등록되었습니다.', 'success')
        setVendingMachineForm({
          category: '',
          vending_machine_number: '',
          product_number: '',
          description: '',
        })
      } else if (activeTab === 'lost_item') {
        if (!lostItemForm.category) {
          alert('카테고리를 선택해주세요.')
          setSubmitting(false)
          return
        }
        if (lostItemForm.photos.length === 0) {
          alert('사진을 촬영해주세요.')
          setSubmitting(false)
          return
        }
        if (!lostItemForm.storage_location.trim()) {
          alert('보관장소를 입력해주세요.')
          setSubmitting(false)
          return
        }

        // 모든 사진 URL 배열 생성 (업로드 완료된 사진만)
        const photoUrls = lostItemForm.photos.map(photo => photo.url).filter(url => url && !url.startsWith('blob:'))
        
        if (photoUrls.length === 0) {
          alert('사진 업로드가 완료될 때까지 기다려주세요.')
          setSubmitting(false)
          return
        }
        
        const photoUrl = photoUrls[0] // 하위 호환성을 위해 첫 번째 사진
        // description에 카테고리 정보 포함 (업체관리자 앱에서 추출하기 위해)
        const description = `[카테고리: ${lostItemForm.category}]\n보관장소: ${lostItemForm.storage_location}${lostItemForm.description ? `\n${lostItemForm.description}` : ''}`

        // lost_items 테이블에 저장
        const response = await fetch('/api/staff/lost-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: attendanceStoreId,
            type: 'other', // type은 체크 제약 조건이 있어서 고정값 사용, 실제 카테고리는 description에 포함
            description: description || null,
            photo_url: photoUrl,
            photo_urls: photoUrls.length > 0 ? photoUrls : undefined, // 모든 사진 배열
            storage_location: lostItemForm.storage_location.trim(),
          }),
        })

        if (!response.ok) {
          const contentType = response.headers.get('content-type')
          let errorMessage = '분실물 습득 등록에 실패했습니다.'
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

        const data = await response.json()

        showToast('분실물 습득이 등록되었습니다.', 'success')
        setLostItemForm({
          category: '',
          photos: [],
          storage_location: '',
          description: '',
        })
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error
      })
      
      // 더 자세한 에러 메시지 표시
      let errorMessage = `등록 실패: ${error.message}`
      showToast(errorMessage, 'error')
      if (error.details) {
        errorMessage += `\n\n상세: ${error.details}`
      }
      if (error.hint) {
        errorMessage += `\n\n힌트: ${error.hint}`
      }
      
      alert(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (attendanceLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isClockedIn) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 mb-16 md:mb-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">
            관리시작 후 매장 문제를 보고할 수 있습니다.
          </p>
          <p className="text-yellow-600 text-sm">
            관리시작/종료 페이지에서 관리시작을 먼저 진행해주세요.
          </p>
        </div>
      </div>
    )
  }

  const currentPhotos: PhotoItem[] = activeTab === 'store_problem' ? storeProblemForm.photos : lostItemForm.photos
  const maxPhotos = 10
  const canAddMorePhotos = currentPhotos.length < maxPhotos

  return (
    <>
      <ToastContainer />
      <div className="max-w-4xl mx-auto px-2 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6 mb-16 md:mb-0">
        <h1 className="text-xl md:text-2xl font-bold">매장 문제 보고</h1>

      {/* 탭 메뉴 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('store_problem')}
          className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
            activeTab === 'store_problem'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          매장 문제
        </button>
        <button
          onClick={() => setActiveTab('vending_machine')}
          className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
            activeTab === 'vending_machine'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          자판기 내부 문제
        </button>
        <button
          onClick={() => setActiveTab('lost_item')}
          className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
            activeTab === 'lost_item'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          분실물 습득
        </button>
      </div>

      {/* 매장 문제 탭 */}
      {activeTab === 'store_problem' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              value={storeProblemForm.category}
              onChange={(e) => setStoreProblemForm({ ...storeProblemForm, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">카테고리 선택</option>
              <option value="매장 시설/환경 관련">매장 시설/환경 관련</option>
              <option value="매장 청소 관련">매장 청소 관련</option>
              <option value="매장 고장">매장 고장</option>
              <option value="무인택배함 관련">무인택배함 관련</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명란
            </label>
            <textarea
              value={storeProblemForm.description}
              onChange={(e) => setStoreProblemForm({ ...storeProblemForm, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="문제 상황을 설명해주세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사진 촬영 <span className="text-gray-500 text-xs">(최대 5장)</span>
            </label>
            <div className="space-y-3">
              {/* 사진 업로드 버튼 - 상단에 배치 */}
              {canAddMorePhotos && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    disabled={uploadingPhotoIndex !== null}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>📷</span>
                    <span>바로 촬영</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGalleryClick}
                    disabled={uploadingPhotoIndex !== null}
                    className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>🖼️</span>
                    <span>갤러리 선택</span>
                  </button>
                </div>
              )}

              {!canAddMorePhotos && (
                <p className="text-sm text-gray-500 text-center py-2">
                  최대 10장까지 업로드 가능합니다.
                </p>
              )}

              {/* 사진 썸네일 (가로 스크롤) */}
              {currentPhotos.length > 0 ? (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {currentPhotos.map((photo, index) => (
                    <div 
                      key={photo.id || `photo-${index}`} 
                      className="relative flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300 shadow-md"
                    >
                      {photo.url ? (
                        <>
                          <Image
                            src={photo.url}
                            alt={`사진 ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                            loading="lazy"
                          />
                          {photo.isUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs bg-gray-200">
                          <div className="animate-pulse">로딩 중...</div>
                        </div>
                      )}
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg z-10 hover:bg-red-600 transition-colors"
                        type="button"
                        aria-label={`사진 ${index + 1} 삭제`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-4xl mb-2">📷</div>
                  <div>촬영한 사진이 여기에 표시됩니다</div>
                </div>
              )}

              {/* 숨겨진 input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !storeProblemForm.category}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      )}

      {/* 자판기 내부 문제 탭 */}
      {activeTab === 'vending_machine' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVendingMachineForm({ ...vendingMachineForm, category: '자판기 수량 오류' })}
                className={`px-4 py-3 rounded-md font-medium transition-colors ${
                  vendingMachineForm.category === '자판기 수량 오류'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                자판기 수량 오류
              </button>
              <button
                type="button"
                onClick={() => setVendingMachineForm({ ...vendingMachineForm, category: '자판기 제품 걸림 문제' })}
                className={`px-4 py-3 rounded-md font-medium transition-colors ${
                  vendingMachineForm.category === '자판기 제품 걸림 문제'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                자판기 제품 걸림 문제
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              자판기 선택 <span className="text-red-500">*</span>
            </label>
            <select
              value={vendingMachineForm.vending_machine_number}
              onChange={(e) => setVendingMachineForm({ ...vendingMachineForm, vending_machine_number: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">자판기 번호 선택</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}번 자판기
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제품 번호 입력 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={vendingMachineForm.product_number}
              onChange={(e) => setVendingMachineForm({ ...vendingMachineForm, product_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="제품 번호를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명란
            </label>
            <textarea
              value={vendingMachineForm.description}
              onChange={(e) => setVendingMachineForm({ ...vendingMachineForm, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="추가 설명을 입력하세요 (선택사항)"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !vendingMachineForm.category || !vendingMachineForm.vending_machine_number || !vendingMachineForm.product_number.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      )}

      {/* 분실물 습득 탭 */}
      {activeTab === 'lost_item' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              value={lostItemForm.category}
              onChange={(e) => setLostItemForm({ ...lostItemForm, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">카테고리 선택</option>
              <option value="신분증 습득">신분증 습득</option>
              <option value="신용카드 습득">신용카드 습득</option>
              <option value="기타 물건 습득">기타 물건 습득</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카메라 사진 찍기 <span className="text-red-500">*</span> <span className="text-gray-500 text-xs">(최대 10장)</span>
            </label>
            <div className="space-y-3">
              {/* 사진 업로드 버튼 - 상단에 배치 */}
              {canAddMorePhotos && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    disabled={uploadingPhotoIndex !== null}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>📷</span>
                    <span>바로 촬영</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGalleryClick}
                    disabled={uploadingPhotoIndex !== null}
                    className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>🖼️</span>
                    <span>갤러리 선택</span>
                  </button>
                </div>
              )}

              {!canAddMorePhotos && (
                <p className="text-sm text-gray-500 text-center py-2">
                  최대 10장까지 업로드 가능합니다.
                </p>
              )}

              {/* 사진 썸네일 (가로 스크롤) */}
              {currentPhotos.length > 0 ? (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {currentPhotos.map((photo, index) => (
                    <div 
                      key={photo.id || `photo-${index}`} 
                      className="relative flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300 shadow-md"
                    >
                      {photo.url ? (
                        <>
                          <Image
                            src={photo.url}
                            alt={`사진 ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                            loading="lazy"
                          />
                          {photo.isUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs bg-gray-200">
                          <div className="animate-pulse">로딩 중...</div>
                        </div>
                      )}
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg z-10 hover:bg-red-600 transition-colors"
                        type="button"
                        aria-label={`사진 ${index + 1} 삭제`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-4xl mb-2">📷</div>
                  <div>촬영한 사진이 여기에 표시됩니다</div>
                </div>
              )}

              {/* 숨겨진 input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              보관장소 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lostItemForm.storage_location}
              onChange={(e) => setLostItemForm({ ...lostItemForm, storage_location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="보관장소를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명란
            </label>
            <textarea
              value={lostItemForm.description}
              onChange={(e) => setLostItemForm({ ...lostItemForm, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="기타 설명을 입력하세요"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !lostItemForm.category || lostItemForm.photos.length === 0 || !lostItemForm.storage_location.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      )}

      {/* 카메라 모달 */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* 상단: 현재 촬영 중인 타입 표시 */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4 z-10">
            <div className="text-center">
              <div className="text-xl font-semibold">
                {cameraTab === 'store_problem' ? '매장 문제 사진' : '분실물 습득 사진'}
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
                    {cameraTab === 'store_problem' ? '매장 문제 사진' : '분실물 습득 사진'}
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
                const photos = cameraTab === 'store_problem' 
                  ? storeProblemForm.photos 
                  : lostItemForm.photos
                return photos.map((photo, idx) => (
                  <div key={photo.id || `photo-${idx}`} className="relative flex-shrink-0 w-16 h-16">
                    <Image
                      src={photo.url}
                      alt={`사진 ${idx + 1}`}
                      fill
                      className="object-cover rounded border-2 border-white"
                      sizes="64px"
                      loading="lazy"
                    />
                    <button
                      onClick={() => {
                        if (cameraTab === 'store_problem') {
                          removePhoto(idx)
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
                  disabled={(() => {
                    const currentPhotoCount = cameraTab === 'store_problem' 
                      ? storeProblemForm.photos.length 
                      : lostItemForm.photos.length
                    return currentPhotoCount >= 10
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