'use client'

import { useState, useRef } from 'react'
import ProductList from './ProductList'

interface Product {
  id: string
  name: string
  barcode: string | null
  image_url: string | null
  category_1: string | null
  category_2: string | null
  created_at: string
  updated_at: string
}

interface ProductMasterSectionProps {
  products: Product[]
}

export default function ProductMasterSection({ products }: ProductMasterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/business/products/master/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      if (data.success) {
        setUploadResult(data)
        // 페이지 새로고침하여 목록 업데이트
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setUploadError(data.error || '업로드에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(error.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div
        className="p-6 cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold">제품 마스터 관리</h2>
        <button className="text-gray-500 hover:text-gray-700">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* 제품 마스터 CSV 업로드 */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">제품 마스터 일괄 등록</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="master-upload-input"
                />
                <label
                  htmlFor="master-upload-input"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer text-center"
                >
                  {uploading ? '업로드 중...' : '📁 CSV 파일 업로드'}
                </label>
              </div>
              <p className="text-xs text-gray-500">
                CSV 형식: 제품명, 바코드, 1차카테고리, 2차카테고리, 이미지URL
              </p>
            </div>

            {uploadError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{uploadError}</p>
              </div>
            )}

            {uploadResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm font-semibold mb-2">✅ 업로드 완료!</p>
                <div className="text-xs text-green-700 space-y-1">
                  <p>생성: {uploadResult.summary?.productsCreated || 0}개</p>
                  <p>업데이트: {uploadResult.summary?.productsUpdated || 0}개</p>
                  {uploadResult.summary?.errors > 0 && (
                    <p className="text-red-600">오류: {uploadResult.summary.errors}개</p>
                  )}
                </div>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    <p className="font-semibold">오류 상세:</p>
                    <ul className="list-disc list-inside mt-1">
                      {uploadResult.errors.slice(0, 5).map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <ProductList initialProducts={products} />
        </div>
      )}
    </div>
  )
}

