'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTodayAttendance } from '@/lib/hooks/useTodayAttendance'
import { uploadPhoto } from '@/lib/supabase/upload'

type TabType = 'store_problem' | 'vending_machine' | 'lost_item'

interface StoreProblemForm {
  category: string
  description: string
  photos: string[]
}

interface VendingMachineForm {
  category: string
  vending_machine_number: number | ''
  product_number: string
  description: string
}

interface LostItemForm {
  category: string
  photos: string[]
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!attendanceLoading && (!isClockedIn || !attendanceStoreId)) {
      // 출근하지 않았을 때는 나중에 처리
    }
  }, [attendanceLoading, isClockedIn, attendanceStoreId])

  const handlePhotoUpload = async (files: FileList | null, currentPhotos: string[]): Promise<string[]> => {
    if (!files || files.length === 0) return currentPhotos
    if (!attendanceStoreId) {
      alert('출근한 매장이 없습니다.')
      return currentPhotos
    }

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return currentPhotos
    }

    const newPhotos = [...currentPhotos]
    const maxPhotos = 5
    const remainingSlots = maxPhotos - newPhotos.length

    if (remainingSlots <= 0) {
      alert('사진은 최대 5장까지 업로드 가능합니다.')
      return currentPhotos
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.')
        continue
      }

      setUploadingPhotoIndex(newPhotos.length + i)
      try {
        const url = await uploadPhoto(file, attendanceStoreId, 'issue', session.user.id)
        newPhotos.push(url)
      } catch (error: any) {
        console.error('Photo upload error:', error)
        alert(`사진 업로드 실패: ${error.message}`)
      } finally {
        setUploadingPhotoIndex(null)
      }
    }

    return newPhotos
  }

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
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

    if (activeTab === 'store_problem') {
      const newPhotos = await handlePhotoUpload(files, storeProblemForm.photos)
      setStoreProblemForm({ ...storeProblemForm, photos: newPhotos })
    } else if (activeTab === 'lost_item') {
      const newPhotos = await handlePhotoUpload(files, lostItemForm.photos)
      setLostItemForm({ ...lostItemForm, photos: newPhotos })
    }

    // input 초기화
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const removePhoto = (index: number) => {
    if (activeTab === 'store_problem') {
      const newPhotos = storeProblemForm.photos.filter((_, i) => i !== index)
      setStoreProblemForm({ ...storeProblemForm, photos: newPhotos })
    } else if (activeTab === 'lost_item') {
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
      alert('출근 후 사용 가능합니다.')
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

        // title에 한국어 카테고리 포함 (필터링을 위해)
        const title = storeProblemForm.category
        const photoUrl = storeProblemForm.photos.length > 0 ? storeProblemForm.photos[0] : null

        const response = await fetch('/api/staff/problem-reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: attendanceStoreId,
            category: storeProblemForm.category, // 한국어 카테고리 값 전달 (API에서 변환)
            title: title,
            description: storeProblemForm.description?.trim() || null,
            photo_url: photoUrl,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '매장 문제 보고 등록에 실패했습니다.')
        }

        alert('매장 문제 보고가 등록되었습니다.')
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
            category: vendingMachineForm.category, // 한국어 카테고리 값 전달 (API에서 변환)
            title: title,
            description: description || null,
            vending_machine_number: vendingMachineNum,
            product_number: vendingMachineForm.product_number.trim(),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '자판기 내부 문제 등록에 실패했습니다.')
        }

        alert('자판기 내부 문제가 등록되었습니다.')
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

        const photoUrl = lostItemForm.photos[0] || null
        const description = `보관장소: ${lostItemForm.storage_location}${lostItemForm.description ? `\n${lostItemForm.description}` : ''}`

        // lost_items 테이블에 저장
        const response = await fetch('/api/staff/lost-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: attendanceStoreId,
            type: lostItemForm.category,
            description: description || null,
            photo_url: photoUrl,
            storage_location: lostItemForm.storage_location.trim(),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '분실물 습득 등록에 실패했습니다.')
        }

        alert('분실물 습득이 등록되었습니다.')
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
      <div className="max-w-4xl mx-auto px-4 py-6 mb-20 md:mb-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">
            출근 후 매장 문제를 보고할 수 있습니다.
          </p>
          <p className="text-yellow-600 text-sm">
            출퇴근 페이지에서 출근을 먼저 진행해주세요.
          </p>
        </div>
      </div>
    )
  }

  const currentPhotos = activeTab === 'store_problem' ? storeProblemForm.photos : lostItemForm.photos
  const maxPhotos = 5
  const canAddMorePhotos = currentPhotos.length < maxPhotos

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 mb-20 md:mb-0">
      <h1 className="text-2xl font-bold">매장 문제 보고</h1>

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
              <option value="자판기 고장/사출 관련">자판기 고장/사출 관련</option>
              <option value="제품 관련">제품 관련</option>
              <option value="무인택배함 관련">무인택배함 관련</option>
              <option value="매장 시설/환경 관련">매장 시설/환경 관련</option>
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
              {/* 사진 그리드 */}
              {currentPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {currentPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`사진 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {uploadingPhotoIndex !== null && (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              )}

              {/* 사진 업로드 버튼 */}
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
                  최대 5장까지 업로드 가능합니다.
                </p>
              )}

              {/* 숨겨진 input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
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
              카메라 사진 찍기 <span className="text-red-500">*</span> <span className="text-gray-500 text-xs">(최대 5장)</span>
            </label>
            <div className="space-y-3">
              {/* 사진 그리드 */}
              {currentPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {currentPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`사진 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {uploadingPhotoIndex !== null && (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              )}

              {/* 사진 업로드 버튼 */}
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
                  최대 5장까지 업로드 가능합니다.
                </p>
              )}

              {/* 숨겨진 input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
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
    </div>
  )
}