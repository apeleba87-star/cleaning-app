'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function StoreRequestPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.id as string

  const [storeName, setStoreName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadStoreInfo()
  }, [storeId])

  const loadStoreInfo = async () => {
    try {
      const response = await fetch(`/api/business/stores/${storeId}`)
      const data = await response.json()

      if (response.ok && data.data) {
        setStoreName(data.data.name || '')
      }
    } catch (err) {
      console.error('Error loading store info:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/business/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: storeId,
          title: title.trim(),
          description: description.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '요청란 전송에 실패했습니다.')
      }

      setSuccess(true)
      setTitle('')
      setDescription('')

      // 2초 후 매장 상태 페이지로 이동
      setTimeout(() => {
        router.push('/business/stores/status')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">요청란 전송</h1>
        <p className="text-gray-600 text-sm">
          {storeName ? `${storeName}에 요청란을 전송합니다.` : '매장 정보를 불러오는 중...'}
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">요청란이 성공적으로 전송되었습니다. 매장 상태 페이지로 이동합니다...</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="요청 제목을 입력하세요"
            disabled={loading || success}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            내용
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="요청 내용을 입력하세요 (선택사항)"
            disabled={loading || success}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            href="/business/stores/status"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={loading || success}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '전송 중...' : success ? '전송 완료' : '요청란 전송'}
          </button>
        </div>
      </form>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>안내:</strong> 요청란을 전송하면 즉시 직원용 앱에 "처리중" 상태로 표시됩니다. 직원은 해당 요청란을 확인하고 완료 처리할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
