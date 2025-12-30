'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTodayAttendance } from '@/contexts/AttendanceContext'
import { getTodayDateKST } from '@/lib/utils/date'
import { uploadPhoto } from '@/lib/supabase/upload'

interface RequestWithStore {
  id: string
  store_id: string
  created_by: string
  title: string
  description: string | null
  photo_url: string | null
  status: 'received' | 'in_progress' | 'completed' | 'rejected'
  completion_photo_url?: string | null
  completion_description?: string | null
  completed_by?: string | null
  completed_at?: string | null
  rejection_photo_url?: string | null
  rejection_description?: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  created_at: string
  updated_at: string
  stores?: { name: string }
  created_by_user?: { 
    id: string
    name: string
    role: string
  }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestWithStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storeAttendanceMap, setStoreAttendanceMap] = useState<Map<string, 'not_clocked_in' | 'clocked_in' | 'clocked_out'>>(new Map())
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null)
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null)
  const [completionDescription, setCompletionDescription] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null)
  const [rejectionPhoto, setRejectionPhoto] = useState<string | null>(null)
  const [rejectionDescription, setRejectionDescription] = useState('')
  const [uploadingRejectionPhoto, setUploadingRejectionPhoto] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // 카메라 관련 state 및 ref
  const [showCamera, setShowCamera] = useState(false)
  const [cameraType, setCameraType] = useState<'completion' | 'rejection'>('completion')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const completionFileInputRef = useRef<HTMLInputElement>(null)
  const completionGalleryInputRef = useRef<HTMLInputElement>(null)
  const rejectionFileInputRef = useRef<HTMLInputElement>(null)
  const rejectionGalleryInputRef = useRef<HTMLInputElement>(null)

  // 출근 정보 가져오기
  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()

  useEffect(() => {
    if (!attendanceLoading) {
      loadRequests()
      loadStoreAttendanceStatus()
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

  // 뒤로가기 처리 (카메라 모달이 열려있을 때)
  useEffect(() => {
    if (!showCamera) return

    const handlePopState = (event: PopStateEvent) => {
      closeCamera()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [showCamera])

  const loadStoreAttendanceStatus = async (requestStoreIds?: string[]) => {
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      const today = getTodayDateKST()
      const { data: attendances } = await supabase
        .from('attendance')
        .select('store_id, clock_out_at, work_date')
        .eq('user_id', session.user.id)
        .eq('work_date', today) // 오늘 날짜의 출근 기록만 조회

      const attendanceMap = new Map<string, 'not_clocked_in' | 'clocked_in' | 'clocked_out'>()
      
      if (attendances) {
        attendances.forEach((attendance: any) => {
          // 오늘 날짜의 출근 기록만 처리
          if (attendance.work_date === today) {
            if (attendance.clock_out_at) {
              attendanceMap.set(attendance.store_id, 'clocked_out')
            } else {
              attendanceMap.set(attendance.store_id, 'clocked_in')
            }
          }
        })
      }

      // 요청에 있는 모든 매장에 대해 출근 상태 설정
      const allStoreIds = requestStoreIds || requests.map(r => r.store_id)
      allStoreIds.forEach(storeId => {
        if (!attendanceMap.has(storeId)) {
          attendanceMap.set(storeId, 'not_clocked_in')
        }
      })

      setStoreAttendanceMap(attendanceMap)
    } catch (error) {
      console.error('Error loading store attendance status:', error)
    }
  }

  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/staff/requests')
      const data = await response.json()

      console.log('[Client] API Response:', JSON.stringify(data, null, 2)) // 전체 API 응답 확인

      if (!response.ok) {
        throw new Error(data.error || '요청란을 불러오는데 실패했습니다.')
      }

      // 출근한 매장이 있으면 해당 매장의 요청란만 필터링
      let filteredRequests = data.data || []
      console.log('[Client] Before filtering:', filteredRequests.length, 'requests')
      
      if (attendanceStoreId && isClockedIn) {
        filteredRequests = filteredRequests.filter(
          (req: RequestWithStore) => req.store_id === attendanceStoreId
        )
        console.log('[Client] After filtering:', filteredRequests.length, 'requests')
      }

      // created_by_user가 null인 경우 클라이언트에서 직접 조회 시도
      const requestsWithUser = await Promise.all(filteredRequests.map(async (r: RequestWithStore) => {
        if (r.created_by && !r.created_by_user) {
          try {
            const supabase = createClient()
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, name, role')
              .eq('id', r.created_by)
              .maybeSingle()
            
            if (!userError && userData) {
              console.log(`[Client] Successfully fetched user for request ${r.id}:`, userData)
              return {
                ...r,
                created_by_user: userData
              }
            } else {
              console.warn(`[Client] Failed to fetch user for request ${r.id}:`, userError)
            }
          } catch (error) {
            console.error(`[Client] Error fetching user for request ${r.id}:`, error)
          }
        }
        return r
      }))

      // 디버깅: created_by_user 정보 확인
      console.log('[Client] Loaded requests count:', requestsWithUser.length)
      requestsWithUser.forEach((r: RequestWithStore, index: number) => {
        const hasCreatedBy = !!r.created_by
        const hasCreatedByUser = !!r.created_by_user
        const role = r.created_by_user?.role
        const isStoreManager = role === 'store_manager'
        
        console.log(`[Client] Request ${index + 1} (${r.id}):`, {
          title: r.title,
          created_by: r.created_by,
          hasCreatedBy: hasCreatedBy,
          created_by_user: r.created_by_user,
          hasCreatedByUser: hasCreatedByUser,
          role: role,
          roleType: typeof role,
          isStoreManager: isStoreManager,
          created_by_user_keys: r.created_by_user ? Object.keys(r.created_by_user) : [],
          fullRequest: JSON.stringify(r, null, 2)
        })
        
        if (!hasCreatedBy) {
          console.warn(`[Client] ⚠️ Request ${r.id} has no created_by field!`)
        }
        if (hasCreatedBy && !hasCreatedByUser) {
          console.warn(`[Client] ⚠️ Request ${r.id} has created_by (${r.created_by}) but no created_by_user!`)
        }
        if (hasCreatedByUser && !role) {
          console.warn(`[Client] ⚠️ Request ${r.id} has created_by_user but no role! created_by_user:`, r.created_by_user)
        }
      })
      
      setRequests(requestsWithUser)
      setError(null)
      
      // 요청 목록 로드 후 출근 상태도 로드
      const storeIds = filteredRequests.map((r: RequestWithStore) => r.store_id)
      loadStoreAttendanceStatus(storeIds)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteClick = (requestId: string) => {
    setCompletingRequestId(requestId)
    setCompletionPhoto(null)
    setCompletionDescription('')
  }

  const handlePhotoUpload = async (file: File, storeId: string, type: 'completion' | 'rejection' = 'completion') => {
    if (type === 'completion') {
      setUploadingPhoto(true)
    } else {
      setUploadingRejectionPhoto(true)
    }
    try {
      const url = await uploadPhoto(file, storeId, 'issue')
      if (type === 'completion') {
        setCompletionPhoto(url)
      } else {
        setRejectionPhoto(url)
      }
      return url
    } catch (error) {
      console.error('Photo upload error:', error)
      alert('사진 업로드 중 오류가 발생했습니다.')
      throw error
    } finally {
      if (type === 'completion') {
        setUploadingPhoto(false)
      } else {
        setUploadingRejectionPhoto(false)
      }
    }
  }

  const handleCameraClick = (type: 'completion' | 'rejection') => {
    setCameraType(type)
    setShowCamera(true)
    window.history.pushState({ cameraMode: true }, '')
    initCamera()
  }

  const initCamera = async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const constraints: MediaStreamConstraints = {
        video: isMobile
          ? {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          : {
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
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
    if (!videoRef.current || !canvasRef.current || isCapturing) return

    setIsCapturing(true)

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
    
    // File 객체로 변환
    const response = await fetch(dataURL)
    const blob = await response.blob()
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })

    // 현재 요청 정보 가져오기
    const requestId = cameraType === 'completion' ? completingRequestId : rejectingRequestId
    const request = requests.find(r => r.id === requestId)
    if (!request) {
      alert('요청란을 찾을 수 없습니다.')
      setIsCapturing(false)
      return
    }

    try {
      await handlePhotoUpload(file, request.store_id, cameraType)
      // 플래시 효과 종료
      setTimeout(() => {
        setIsCapturing(false)
        // 촬영 완료 후 카메라 닫기
        closeCamera()
      }, 200)
    } catch (error) {
      setIsCapturing(false)
    }
  }

  const handleGalleryClick = (type: 'completion' | 'rejection') => {
    if (type === 'completion' && completionGalleryInputRef.current) {
      completionGalleryInputRef.current.click()
    } else if (type === 'rejection' && rejectionGalleryInputRef.current) {
      rejectionGalleryInputRef.current.click()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'completion' | 'rejection') => {
    const file = e.target.files?.[0]
    if (!file) return

    const requestId = type === 'completion' ? completingRequestId : rejectingRequestId
    const request = requests.find(r => r.id === requestId)
    if (!request) {
      alert('요청란을 찾을 수 없습니다.')
      return
    }

    // input 초기화
    if (e.target) {
      e.target.value = ''
    }

    try {
      await handlePhotoUpload(file, request.store_id, type)
    } catch (error) {
      // 에러는 handlePhotoUpload에서 이미 처리됨
    }
  }

  const handleComplete = async () => {
    if (!completingRequestId) return

    const request = requests.find(r => r.id === completingRequestId)
    if (!request) {
      alert('요청란을 찾을 수 없습니다.')
      return
    }

    // 출근한 매장인지 확인
    const attendanceStatus = storeAttendanceMap.get(request.store_id) || 'not_clocked_in'
    if (attendanceStatus !== 'clocked_in') {
      alert('출근한 매장의 요청란만 처리할 수 있습니다.')
      setCompletingRequestId(null)
      setCompletionPhoto(null)
      setCompletionDescription('')
      return
    }

    try {
      const response = await fetch(`/api/business/requests/${completingRequestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'completed',
          completion_photo_url: completionPhoto,
          completion_description: completionDescription.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '완료 처리에 실패했습니다.')
      }

      // 모달 닫기 및 상태 초기화
      setCompletingRequestId(null)
      setCompletionPhoto(null)
      setCompletionDescription('')
      
      // 요청란 목록 다시 로드
      loadRequests()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleRejectClick = (requestId: string) => {
    const request = requests.find(r => r.id === requestId)
    if (!request) return
    
    // 출근한 매장인지 확인
    const attendanceStatus = storeAttendanceMap.get(request.store_id) || 'not_clocked_in'
    if (attendanceStatus !== 'clocked_in') {
      alert('출근한 매장의 요청란만 처리할 수 있습니다.')
      return
    }
    
    setRejectingRequestId(requestId)
    setRejectionPhoto(null)
    setRejectionDescription('')
  }


  const handleReject = async () => {
    if (!rejectingRequestId) {
      console.error('rejectingRequestId is null')
      alert('요청 ID가 없습니다.')
      return
    }

    // 반려 설명은 필수
    if (!rejectionDescription.trim()) {
      alert('반려 설명을 입력해주세요.')
      return
    }

    try {
      const apiUrl = `/api/business/requests/${rejectingRequestId}/status`
      console.log('Rejecting request:', { requestId: rejectingRequestId, apiUrl })
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejection_photo_url: rejectionPhoto,
          rejection_description: rejectionDescription.trim(),
        }),
      })

      console.log('Reject response status:', response.status, response.statusText)

      if (response.status === 404) {
        throw new Error('API 엔드포인트를 찾을 수 없습니다. 서버를 재시작해주세요.')
      }

      const data = await response.json()
      console.log('Reject response data:', data)

      if (!response.ok) {
        throw new Error(data.error || data.message || '반려 처리에 실패했습니다.')
      }

      // 모달 닫기 및 상태 초기화
      setRejectingRequestId(null)
      setRejectionPhoto(null)
      setRejectionDescription('')
      
      // 요청란 목록 다시 로드
      loadRequests()
    } catch (err: any) {
      console.error('Reject error:', err)
      alert(err.message || '반려 처리 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${month}월 ${day}일 ${hours}:${String(minutes).padStart(2, '0')}`
  }

  const getPhotoUrls = (photoUrl: string | null): string[] => {
    if (!photoUrl) return []
    try {
      const parsed = JSON.parse(photoUrl)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return [photoUrl]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">처리중인 요청란</h1>
        <p className="text-gray-600 text-sm">
          {attendanceStoreId && isClockedIn
            ? '출근한 매장의 요청란만 표시됩니다.'
            : '배정된 매장의 처리중인 요청란을 확인할 수 있습니다.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">처리중인 요청란이 없습니다.</p>
          </div>
        ) : (
          requests.map((request) => {
            // 해당 매장의 출근 상태 확인
            const attendanceStatus = storeAttendanceMap.get(request.store_id) || 'not_clocked_in'
            const isNotClockedIn = attendanceStatus === 'not_clocked_in'
            
            return (
              <div
                key={request.id}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  isNotClockedIn ? 'border-gray-400 opacity-60' : 'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        isNotClockedIn 
                          ? 'bg-gray-100 text-gray-600' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        처리중
                      </span>
                      <span className={`text-sm ${
                        isNotClockedIn ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {request.stores?.name || '알 수 없는 매장'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`text-lg font-semibold ${
                        isNotClockedIn ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        {request.title}
                      </h3>
                    </div>
                    {request.description && (
                      <p className={`text-sm mb-3 whitespace-pre-wrap ${
                        isNotClockedIn ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {request.description}
                      </p>
                    )}
                    {request.photo_url && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {getPhotoUrls(request.photo_url).map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`${request.title} 사진 ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImage(url)}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <div className={`text-xs ${
                      isNotClockedIn ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span>요청일: {formatDate(request.created_at)}</span>
                      {request.created_by_user && (
                        <span className="ml-3">요청자: {request.created_by_user.name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => handleRejectClick(request.id)}
                    className={`px-4 py-2 rounded-md text-sm ${
                      isNotClockedIn
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    disabled={isNotClockedIn}
                  >
                    반려 처리
                  </button>
                  <button
                    onClick={() => handleCompleteClick(request.id)}
                    className={`px-4 py-2 rounded-md text-sm ${
                      isNotClockedIn
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    disabled={isNotClockedIn}
                  >
                    완료 처리
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 완료 처리 모달 */}
      {completingRequestId && (() => {
        const request = requests.find(r => r.id === completingRequestId)
        if (!request) return null

        // 출근 상태 확인
        const attendanceStatus = storeAttendanceMap.get(request.store_id) || 'not_clocked_in'
        const isNotClockedIn = attendanceStatus !== 'clocked_in'

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">완료 처리</h3>
                <button
                  onClick={() => {
                    setCompletingRequestId(null)
                    setCompletionPhoto(null)
                    setCompletionDescription('')
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-gray-600">
                      <strong>{request.title}</strong>
                    </p>
                  </div>
                  {request.description && (
                    <p className="text-sm text-gray-500 mb-4">{request.description}</p>
                  )}
                </div>

                {/* 사진 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    완료 사진 (선택)
                  </label>
                  {completionPhoto ? (
                    <div className="relative">
                      <img
                        src={completionPhoto}
                        alt="완료 사진"
                        className="w-full h-48 object-cover rounded-lg border-2 border-green-300 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(completionPhoto)}
                      />
                      <button
                        onClick={() => setCompletionPhoto(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 z-10"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleCameraClick('completion')}
                          disabled={uploadingPhoto}
                          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span>📷</span>
                          <span>바로 촬영</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGalleryClick('completion')}
                          disabled={uploadingPhoto}
                          className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span>🖼️</span>
                          <span>갤러리 선택</span>
                        </button>
                      </div>
                      <input
                        ref={completionFileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileSelect(e, 'completion')}
                        className="hidden"
                      />
                      <input
                        ref={completionGalleryInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, 'completion')}
                        className="hidden"
                      />
                      {uploadingPhoto && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <span className="text-sm text-gray-600">업로드 중...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 설명란 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    완료 설명 (선택)
                  </label>
                  <textarea
                    value={completionDescription}
                    onChange={(e) => setCompletionDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="완료 처리 내용을 입력하세요"
                  />
                </div>

                {/* 버튼 */}
                {isNotClockedIn && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      출근한 매장의 요청란만 처리할 수 있습니다.
                    </p>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setCompletingRequestId(null)
                      setCompletionPhoto(null)
                      setCompletionDescription('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={uploadingPhoto || isNotClockedIn}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    완료 처리
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 반려 처리 모달 */}
      {rejectingRequestId && (() => {
        const request = requests.find(r => r.id === rejectingRequestId)
        if (!request) return null

        // 출근 상태 확인
        const attendanceStatus = storeAttendanceMap.get(request.store_id) || 'not_clocked_in'
        const isNotClockedIn = attendanceStatus !== 'clocked_in'

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">반려 처리</h3>
                <button
                  onClick={() => {
                    setRejectingRequestId(null)
                    setRejectionPhoto(null)
                    setRejectionDescription('')
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-gray-600">
                      <strong>{request.title}</strong>
                    </p>
                  </div>
                  {request.description && (
                    <p className="text-sm text-gray-500 mb-4">{request.description}</p>
                  )}
                </div>

                {/* 사진 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    반려 사진 (선택)
                  </label>
                  {rejectionPhoto ? (
                    <div className="relative">
                      <img
                        src={rejectionPhoto}
                        alt="반려 사진"
                        className="w-full h-48 object-cover rounded-lg border-2 border-red-300 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(rejectionPhoto)}
                      />
                      <button
                        onClick={() => setRejectionPhoto(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 z-10"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleCameraClick('rejection')}
                          disabled={uploadingRejectionPhoto}
                          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span>📷</span>
                          <span>바로 촬영</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGalleryClick('rejection')}
                          disabled={uploadingRejectionPhoto}
                          className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span>🖼️</span>
                          <span>갤러리 선택</span>
                        </button>
                      </div>
                      <input
                        ref={rejectionFileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileSelect(e, 'rejection')}
                        className="hidden"
                      />
                      <input
                        ref={rejectionGalleryInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, 'rejection')}
                        className="hidden"
                      />
                      {uploadingRejectionPhoto && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                          <span className="text-sm text-gray-600">업로드 중...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 설명란 (필수) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    반려 설명 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionDescription}
                    onChange={(e) => setRejectionDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="반려 사유를 입력해주세요 (필수)"
                    required
                  />
                </div>

                {/* 버튼 */}
                {isNotClockedIn && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      출근한 매장의 요청란만 처리할 수 있습니다.
                    </p>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setRejectingRequestId(null)
                      setRejectionPhoto(null)
                      setRejectionDescription('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={uploadingRejectionPhoto || !rejectionDescription.trim() || isNotClockedIn}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    반려 처리
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 카메라 모달 */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* 상단: 현재 촬영 중인 타입 표시 */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4 z-10">
            <div className="text-center">
              <div className="text-xl font-semibold">
                {cameraType === 'completion' ? '완료 사진' : '반려 사진'}
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
                    {cameraType === 'completion' ? '완료 사진' : '반려 사진'}
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

            {/* 촬영된 사진 썸네일 (왼쪽 하단) */}
            {(cameraType === 'completion' ? completionPhoto : rejectionPhoto) && (
              <div className="absolute top-20 bottom-44 left-4 z-20 md:top-20 md:bottom-20">
                <div className="relative">
                  <img
                    src={cameraType === 'completion' ? completionPhoto! : rejectionPhoto!}
                    alt="촬영된 사진"
                    className="w-16 h-16 object-cover rounded border-2 border-white"
                  />
                </div>
              </div>
            )}
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
                  disabled={isCapturing || (cameraType === 'completion' ? !!completionPhoto : !!rejectionPhoto)}
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

      {/* 이미지 확대 모달 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={selectedImage}
              alt="확대된 사진"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}














