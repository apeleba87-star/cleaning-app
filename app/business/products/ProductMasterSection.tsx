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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [uploadStage, setUploadStage] = useState<'upload' | 'process' | 'saving'>('upload')
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
    setUploadStage('upload')
    
    // 파일의 총 행 수 계산 (헤더 제외)
    let totalRows = 0
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      totalRows = Math.max(0, lines.length - 1) // 헤더 제외
      setUploadProgress({ current: 0, total: totalRows })
    } catch (e) {
      console.error('Error reading file:', e)
    }
    
    // 파일 읽기 완료 후 처리 단계로 전환
    setUploadStage('process')

    try {
      const formData = new FormData()
      formData.append('file', file)

      // 진행 상황을 시뮬레이션하기 위한 인터벌
      // 95% 정도에서 멈추고 API 응답을 기다림
      const targetProgress = Math.floor(totalRows * 0.95)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev && prev.current < targetProgress) {
            // 실제 진행 상황을 정확히 알 수 없으므로, 점진적으로 증가
            const increment = Math.max(1, Math.floor(totalRows / 100))
            return {
              current: Math.min(prev.current + increment, targetProgress),
              total: prev.total
            }
          }
          return prev
        })
      }, 100) // 100ms마다 업데이트

      const response = await fetch('/api/business/products/master/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      // API 응답이 오면 저장 단계로 전환
      setUploadStage('saving')
      // API 응답이 오면 100% 완료로 표시
      setUploadProgress({ current: totalRows, total: totalRows })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      if (data.success) {
        setUploadResult(data)
        // 에러가 없으면 3초 후 자동 새로고침, 에러가 있으면 수동 새로고침
        const hasErrors = (data.summary?.errors > 0) || (data.errors && data.errors.length > 0) // productsSkipped는 오류 아님
        if (!hasErrors) {
          setTimeout(() => {
            window.location.reload()
          }, 3000)
        }
        // 에러가 있으면 자동 새로고침하지 않음 (사용자가 확인할 수 있도록)
      } else {
        setUploadError(data.error || '업로드에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(error.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      setUploadStage('upload')
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer text-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    uploadProgress ? (
                      uploadStage === 'upload' ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          파일 업로드 중... (1/3)
                        </span>
                      ) : uploadStage === 'saving' || (uploadProgress.current >= Math.floor(uploadProgress.total * 0.95) && uploadProgress.current < uploadProgress.total) ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          저장 완료 대기 중... (3/3)
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          데이터 처리 중... (2/3) - {uploadProgress.current}/{uploadProgress.total}개
                        </span>
                      )
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        파일 업로드 중... (1/3)
                      </span>
                    )
                  ) : (
                    '📁 CSV 파일 업로드'
                  )}
                </label>
              </div>
              {uploading && uploadProgress && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center flex items-center justify-center gap-2">
                    {uploadStage === 'upload' ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span>파일 업로드 중... (1/3)</span>
                      </>
                    ) : uploadStage === 'saving' || (uploadProgress.current >= Math.floor(uploadProgress.total * 0.95) && uploadProgress.current < uploadProgress.total) ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span>저장 완료 대기 중... (3/3)</span>
                      </>
                    ) : (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span>데이터 처리 중... (2/3) - {uploadProgress.current}/{uploadProgress.total}개</span>
                      </>
                    )}
                  </p>
                </div>
              )}
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
                  {uploadResult.summary?.productsSkipped > 0 && (
                    <p className="text-gray-600">기존 제품(이미 등록됨): {uploadResult.summary.productsSkipped}개</p>
                  )}
                  {uploadResult.summary?.errors > 0 && (
                    <p className="text-red-600 font-semibold">오류: {uploadResult.summary.errors}개</p>
                  )}
                </div>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs font-semibold text-red-800 mb-2">오류 상세:</p>
                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.errors.map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {((uploadResult.summary?.errors > 0) || (uploadResult.errors && uploadResult.errors.length > 0)) && (
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    확인 및 새로고침
                  </button>
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

