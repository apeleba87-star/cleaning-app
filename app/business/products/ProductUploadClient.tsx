'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Store {
  id: string
  name: string
}

interface UnmatchedStore {
  지점명: string
  하드웨어명: string
}

export default function ProductUploadClient({ stores }: { stores: Store[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [unmatchedStores, setUnmatchedStores] = useState<UnmatchedStore[]>([])
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [saveMappings, setSaveMappings] = useState<Record<string, boolean>>({})
  const fileRef = useRef<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      fileRef.current = selectedFile // 파일 참조 저장
      setResult(null)
      setError(null)
      setUnmatchedStores([])
      setMappings({})
      setSaveMappings({})
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.')
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/business/products/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      // 매핑이 필요한 경우
      if (data.requiresMapping && data.unmatchedStores) {
        setUnmatchedStores(data.unmatchedStores)
        setAvailableStores(data.availableStores || stores)
        return
      }

      // 성공
      console.log('Upload success:', data)
      if (data.success) {
        setResult(data)
        setFile(null)
        fileRef.current = null
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
        // 업로드 완료 후 2초 뒤 페이지 새로고침하여 통계 업데이트
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        console.error('Upload returned success=false:', data)
        setError(data.error || '업로드에 실패했습니다.')
      }
      
      // 성공 메시지가 없으면 기본 메시지 표시
      if (!data.summary) {
        console.warn('Upload completed but no summary received')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleMappingSave = async () => {
    if (unmatchedStores.length === 0) {
      console.log('No unmatched stores, returning')
      return
    }

    console.log('handleMappingSave called')
    console.log('Unmatched stores:', unmatchedStores)
    console.log('Mappings:', mappings)
    console.log('Save mappings:', saveMappings)
    console.log('File state:', file)
    console.log('FileRef:', fileRef.current)
    
    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const mappingArray = unmatchedStores.map(store => ({
        originalStoreName: store.지점명,
        hardwareName: store.하드웨어명,
        systemStoreId: mappings[store.지점명],
        saveMapping: saveMappings[store.지점명] || false
      }))

      const response = await fetch('/api/business/products/mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mappings: mappingArray })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '매핑 저장에 실패했습니다.')
      }

      console.log('Mapping save response:', data)

      // 매핑 저장 후 다시 업로드 시도
      // 파일이 없으면 업로드할 수 없음
      if (!file && !fileRef.current) {
        throw new Error('파일이 없습니다. 다시 파일을 선택해주세요.')
      }

      const fileToUpload = file || fileRef.current
      if (!fileToUpload) {
        throw new Error('파일을 찾을 수 없습니다.')
      }

      // 저장된 매핑 정보 추출 (업로드 시 함께 전달)
      const savedMappings = data.results
        ?.filter((r: any) => r.saved)
        .map((r: any) => ({
          originalStoreName: r.originalStoreName,
          systemStoreId: r.systemStoreId
        })) || []

      console.log('Saved mappings to send with upload:', savedMappings)

      setUnmatchedStores([])
      setMappings({})
      setSaveMappings({})
      
      // 매핑 저장 후 파일 다시 업로드 (저장된 매핑 정보 함께 전달)
      const formData = new FormData()
      formData.append('file', fileToUpload)
      if (savedMappings.length > 0) {
        formData.append('mappings', JSON.stringify(savedMappings))
      }

      console.log('Starting upload after mapping save...')
      
      let uploadResponse: Response
      let uploadData: any
      
      try {
        uploadResponse = await fetch('/api/business/products/upload', {
          method: 'POST',
          body: formData
        })
        
        console.log('Upload response status:', uploadResponse.status)
        console.log('Upload response ok:', uploadResponse.ok)
        
        const responseText = await uploadResponse.text()
        console.log('Upload response text:', responseText)
        
        try {
          uploadData = JSON.parse(responseText)
        } catch (e) {
          console.error('Failed to parse upload response as JSON:', e)
          throw new Error('서버 응답을 파싱할 수 없습니다: ' + responseText.substring(0, 100))
        }
        
        console.log('Upload response data:', uploadData)
      } catch (error: any) {
        console.error('Upload request failed:', error)
        setError(`업로드 중 오류가 발생했습니다: ${error.message}`)
        setUploading(false)
        return
      }

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || '업로드에 실패했습니다.')
      }

      // 매핑이 또 필요한 경우
      if (uploadData.requiresMapping && uploadData.unmatchedStores) {
        console.warn('Still requires mapping after upload:', uploadData.unmatchedStores)
        setUnmatchedStores(uploadData.unmatchedStores)
        setAvailableStores(uploadData.availableStores || stores)
        setError('일부 매장의 매핑이 필요합니다. 매장을 선택하고 다시 시도해주세요.')
        setUploading(false)
        return
      }

      // 성공
      console.log('Upload successful after mapping:', uploadData)
      if (uploadData.success) {
        setResult(uploadData)
        setUnmatchedStores([]) // 매핑 섹션 숨기기
        setError(null) // 에러 메시지 제거
        
        // 업로드 완료 후 2초 뒤 페이지 새로고침하여 통계 업데이트
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        console.error('Upload returned success=false:', uploadData)
        setError(uploadData.error || '업로드에 실패했습니다.')
      }
      setFile(null)
      fileRef.current = null
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Mapping save or upload error:', error)
      setError(error.message || '매핑 저장 및 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 파일 업로드 섹션 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">CSV 파일 업로드</h2>
        <p className="text-sm text-gray-600 mb-4">
          원본 CSV 파일을 업로드하여 제품 위치 정보를 업데이트합니다.
        </p>
        <p className="text-xs text-gray-500 mb-4">
          파일 형식: 회사명, 지점명, 하드웨어명, 1차카테고리, 2차카테고리, 상품명, 재고, 위치
        </p>

        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                선택된 파일: <span className="font-medium">{file.name}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                크기: {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? '업로드 중...' : '파일 업로드 및 처리'}
          </button>
        </div>
      </div>

      {/* 매핑 필요 섹션 */}
      {unmatchedStores.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">
            매장명 매핑 필요
          </h3>
          <p className="text-sm text-yellow-800 mb-4">
            다음 매장들을 시스템 매장과 매칭해주세요:
          </p>

          <div className="space-y-4">
            {unmatchedStores.map((store, idx) => (
              <div key={idx} className="bg-white rounded-md p-4 border border-yellow-300">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    원본 매장: {store.지점명}
                  </p>
                  <p className="text-xs text-gray-500">
                    하드웨어: {store.하드웨어명}
                  </p>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시스템 매장 선택
                  </label>
                  <select
                    value={mappings[store.지점명] || ''}
                    onChange={(e) => {
                      setMappings(prev => ({
                        ...prev,
                        [store.지점명]: e.target.value
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">매장을 선택하세요</option>
                    {availableStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`save-${idx}`}
                    checked={saveMappings[store.지점명] || false}
                    onChange={(e) => {
                      setSaveMappings(prev => ({
                        ...prev,
                        [store.지점명]: e.target.checked
                      }))
                    }}
                    className="mr-2"
                  />
                  <label htmlFor={`save-${idx}`} className="text-sm text-gray-700">
                    이 매핑 저장 (다음부터 자동 매칭)
                  </label>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  console.log('Mapping save button clicked')
                  console.log('Mappings:', mappings)
                  console.log('Unmatched stores:', unmatchedStores)
                  await handleMappingSave()
                }}
                disabled={unmatchedStores.some(s => !mappings[s.지점명]) || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? '처리 중...' : '매핑 저장 및 업로드 진행'}
              </button>
              <button
                onClick={() => {
                  setUnmatchedStores([])
                  setMappings({})
                  setSaveMappings({})
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* 결과 메시지 */}
      {result && result.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">
            ✅ 업로드 완료
          </h3>
          {result.summary ? (
            <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">제품 생성:</span> {result.summary.productsCreated}개
            </p>
            <p>
              <span className="font-medium">제품 업데이트:</span> {result.summary.productsUpdated}개
            </p>
            <p>
              <span className="font-medium">위치 생성:</span> {result.summary.locationsCreated}개
            </p>
            <p>
              <span className="font-medium">위치 업데이트:</span> {result.summary.locationsUpdated}개
            </p>
            <p>
              <span className="font-medium">총 처리 행:</span> {result.summary.totalRows}개
            </p>
            {result.summary.errors > 0 && (
              <p className="text-red-600">
                <span className="font-medium">오류:</span> {result.summary.errors}개
              </p>
            )}
            </div>
          ) : (
            <p className="text-sm text-green-800">파일 업로드가 완료되었습니다.</p>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-800 mb-2">오류 상세:</p>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {result.errors.map((err: string, idx: number) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setResult(null)
              router.refresh()
            }}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            확인
          </button>
        </div>
      )}
    </div>
  )
}

