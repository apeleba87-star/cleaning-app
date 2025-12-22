'use client'

import { useState, useRef } from 'react'
import { uploadPhoto } from '@/lib/supabase/upload'

interface RequestFormProps {
  storeId: string
  onSuccess: () => void
  onCancel: () => void
}

interface PhotoItem {
  id: string
  url: string
  isUploading?: boolean
}

// 점주 앱 요청란 카테고리 목록
const REQUEST_CATEGORIES = [
  '제품 관련 요청',
  '자판기 관련 요청',
  '무인 택배함 관련 요청',
  '매장시설/청결 관련 요청',
  '운영 관련 요청',
  '기타',
]

export default function RequestForm({ storeId, onSuccess, onCancel }: RequestFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category: '',
    description: '',
  })
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const photoIdCounterRef = useRef(0)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    console.log('📸 Files selected:', files.length)

    // 이미지 파일만 필터링
    const imageFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        imageFiles.push(file)
      }
    }

    if (imageFiles.length === 0) {
      alert('이미지 파일만 선택할 수 있습니다.')
      // input 초기화
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
      return
    }

    console.log('📸 Image files filtered:', imageFiles.length)

    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ''
    }

    // 선택된 파일들을 먼저 상태에 추가 (blob URL로 즉시 표시)
    const newPhotos: PhotoItem[] = []
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      const photoId = `photo-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`
      const objectUrl = URL.createObjectURL(file)

      newPhotos.push({
        id: photoId,
        url: objectUrl, // blob URL로 즉시 표시
        isUploading: true, // 업로드 중 표시
      })
    }

    console.log('📸 New photos created:', newPhotos.length)

    // 먼저 모든 사진을 blob URL로 추가 (즉시 표시)
    setPhotos(prev => {
      const updated = [...prev, ...newPhotos]
      console.log('📸 Photos state updated, total:', updated.length, 'photos:', updated.map(p => ({ id: p.id, isUploading: p.isUploading })))
      return updated
    })

    // 각 사진을 비동기로 업로드 (백그라운드에서)
    newPhotos.forEach(async (photo, index) => {
      const file = imageFiles[index]
      
      try {
        console.log('📤 Uploading photo:', photo.id, file.name, 'file size:', file.size)
        
        // uploadPhoto 함수는 (file, storeId, entity, userId?) 형태로 호출해야 함
        const uploadedUrl = await uploadPhoto(file, storeId, 'issue')
        
        console.log('✅ Upload completed:', photo.id, 'URL:', uploadedUrl?.substring(0, 50))
        
        if (!uploadedUrl || uploadedUrl.trim() === '') {
          throw new Error('업로드된 파일의 URL을 가져올 수 없습니다.')
        }
        
        // 업로드 완료: blob URL을 정리하고 업로드된 URL로 교체
        URL.revokeObjectURL(photo.url)
        setPhotos(prev => {
          const updated = prev.map(p => 
            p.id === photo.id 
              ? { ...p, url: uploadedUrl, isUploading: false } 
              : p
          )
          console.log('✅ Photo state updated after upload:', photo.id, 'isUploading: false')
          return updated
        })
      } catch (error: any) {
        console.error('❌ Error uploading photo:', photo.id, error)
        
        // 업로드 실패해도 미리보기는 유지 (blob URL 유지)
        // isUploading을 false로 변경하여 업로드 실패 표시
        setPhotos(prev => {
          const updated = prev.map(p => 
            p.id === photo.id 
              ? { ...p, isUploading: false } 
              : p
          )
          console.log('❌ Photo upload failed, keeping preview:', photo.id)
          return updated
        })
        
        alert(`사진 업로드에 실패했습니다: ${file.name}\n${error?.message || error}\n\n미리보기는 유지되지만, 제출 시 이 사진은 저장되지 않습니다.`)
      }
    })
  }

  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId)
      if (photo && photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url)
      }
      return prev.filter(p => p.id !== photoId)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category || !formData.description.trim()) {
      alert('카테고리와 설명을 입력해주세요.')
      return
    }

    // 업로드 중인 사진이 있으면 대기
    const uploadingPhotos = photos.filter(p => p.isUploading)
    if (uploadingPhotos.length > 0) {
      alert(`사진 업로드가 완료될 때까지 기다려주세요. (${uploadingPhotos.length}장 업로드 중)`)
      return
    }

    setSubmitting(true)

    try {
      // blob URL은 업로드 실패한 사진이므로 제외
      const photoUrls = photos
        .map(p => p.url)
        .filter(url => url && !url.startsWith('blob:'))
      
      console.log('📤 Submitting request with photos:', photoUrls.length, photoUrls)

      const response = await fetch('/api/store-manager/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          category: formData.category,
          description: formData.description.trim(),
          photo_urls: photoUrls,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '요청란 접수에 실패했습니다.')
      }

      alert('요청란이 접수되었습니다.')
      onSuccess()
    } catch (error: any) {
      console.error('Error submitting request:', error)
      alert(error.message || '요청란 접수에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">요청란 접수</h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">카테고리를 선택하세요</option>
                {REQUEST_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* 사진 첨부 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사진 첨부
              </label>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGallerySelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                갤러리에서 사진 선택
              </button>
              
              {photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">선택된 사진: {photos.length}장</p>
                  <div className="grid grid-cols-3 gap-4">
                    {photos.map((photo) => {
                      console.log('🖼️ Rendering photo:', photo.id, 'isUploading:', photo.isUploading, 'url:', photo.url?.substring(0, 50))
                      return (
                        <div key={photo.id} className="relative">
                          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300">
                            {photo.isUploading ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                <span className="text-xs text-gray-500">업로드 중...</span>
                              </div>
                            ) : (
                              <img
                                src={photo.url}
                                alt="요청 사진"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('❌ Image load error:', photo.url)
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-red-500 text-xs">이미지 로드 실패</div>'
                                }}
                                onLoad={() => {
                                  console.log('✅ Image loaded successfully:', photo.url)
                                }}
                              />
                            )}
                          </div>
                          {!photo.isUploading && (
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
                              title="사진 삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 설명란 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="요청 내용을 입력하세요"
                required
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '접수 중...' : '접수하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

