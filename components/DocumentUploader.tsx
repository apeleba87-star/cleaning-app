'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DocumentUploaderProps {
  storeId?: string
  userId?: string
  entity: 'store' | 'user'
  docType: string
  onUploadComplete: (url: string, fileName: string, fileSize?: number) => void
  onUploadError?: (error: string) => void
  className?: string
  accept?: string
}

export function DocumentUploader({
  storeId,
  userId,
  entity,
  docType,
  onUploadComplete,
  onUploadError,
  className,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
}: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      onUploadError?.('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    // 미리보기 (이미지인 경우)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }

    // 업로드
    await handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      console.log('DocumentUploader: Starting upload', { entity, docType, storeId, userId })
      
      // 서버 API를 통해 업로드 (서비스 역할 키 사용)
      const formData = new FormData()
      formData.append('file', file)
      if (storeId) formData.append('storeId', storeId)
      if (userId) formData.append('userId', userId)
      formData.append('docType', docType)
      formData.append('entity', entity)

      console.log('DocumentUploader: Uploading via API', { entity, docType, storeId, userId })

      // entity에 따라 올바른 API 엔드포인트 선택
      const uploadUrl = entity === 'user' 
        ? '/api/business/users/files/upload'
        : '/api/business/stores/files/upload'

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      console.log('DocumentUploader: API response status', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('DocumentUploader: API error', errorData)
        throw new Error(errorData.error || `서버 오류: ${response.status}`)
      }

      const data = await response.json()
      console.log('DocumentUploader: API response data', data)

      if (!data.success) {
        throw new Error(data.error || '파일 업로드에 실패했습니다.')
      }

      console.log('DocumentUploader: Upload successful', { url: data.data.file_url, fileName: data.data.file_name })

      // 업로드 성공 후 부모 컴포넌트에 알림
      // file_size도 함께 전달 (DB 저장 시 필요)
      onUploadComplete(data.data.file_url, data.data.file_name, data.data.file_size)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('DocumentUploader: Upload error', error)
      const errorMessage = error.message || '파일 업로드에 실패했습니다.'
      console.error('DocumentUploader: Error details', {
        message: errorMessage,
        error: error,
        stack: error.stack,
      })
      onUploadError?.(errorMessage)
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {uploading ? '업로드 중...' : '파일 선택'}
      </button>
      {preview && (
        <div className="mt-2">
          <img src={preview} alt="미리보기" className="max-w-xs rounded" />
        </div>
      )}
    </div>
  )
}

