'use client'

import { useState, useRef } from 'react'
import { uploadPhoto } from '@/lib/supabase/upload'

interface PhotoUploaderProps {
  storeId: string
  entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after' | 'request'
  onUploadComplete: (url: string) => void
  onUploadError?: (error: string) => void
  className?: string
}

export function PhotoUploader({
  storeId,
  entity,
  onUploadComplete,
  onUploadError,
  className,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      onUploadError?.('이미지 파일만 업로드 가능합니다.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      onUploadError?.('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 미리보기
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // 업로드
    handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadPhoto(file, storeId, entity)
      console.log('✅ Photo upload successful:', { entity, url, storeId })
      // URL이 제대로 반환되었는지 확인
      if (!url || url.trim() === '') {
        throw new Error('업로드된 파일의 URL을 가져올 수 없습니다.')
      }
      // 미리보기는 유지하고, 완료 콜백 호출
      onUploadComplete(url)
      // 업로드 완료 후에도 미리보기를 유지 (부모 컴포넌트가 이미지를 표시할 때까지)
      // setPreview(null) 제거
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('❌ Photo upload failed:', error)
      onUploadError?.(error instanceof Error ? error.message : '업로드 실패')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={className}>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
        {uploading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <span className="text-sm text-gray-600">업로드 중...</span>
          </div>
        ) : preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="미리보기"
              className="max-h-64 mx-auto rounded-lg border border-gray-300"
              onError={(e) => {
                console.error('Preview image load error:', preview)
              }}
            />
            <button
              onClick={() => {
                setPreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm transition-colors"
            >
              취소
            </button>
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              id={`photo-upload-${entity}-${storeId}`}
            />
            <label
              htmlFor={`photo-upload-${entity}-${storeId}`}
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <svg
                className="w-12 h-12 text-gray-400 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-gray-600">
                사진 선택 또는 드래그
              </span>
            </label>
          </>
        )}
      </div>
    </div>
  )
}

