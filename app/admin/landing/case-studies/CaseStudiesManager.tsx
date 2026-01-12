'use client'

import { useState, useEffect } from 'react'

interface CaseStudy {
  id: string
  title: string
  description: string | null
  blog_url: string
  thumbnail_url: string | null
  display_order: number
  is_active: boolean
}

export default function CaseStudiesManager() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCaseStudy, setEditingCaseStudy] = useState<CaseStudy | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadCaseStudies()
  }, [])

  const loadCaseStudies = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/case-studies')
      const result = await response.json()
      if (result.success) {
        setCaseStudies(result.data)
      }
    } catch (error) {
      console.error('Error loading case studies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (caseStudyData: Partial<CaseStudy>) => {
    try {
      // 빈 문자열을 null로 변환
      const cleanedData = {
        ...caseStudyData,
        description: caseStudyData.description?.trim() || null,
        thumbnail_url: caseStudyData.thumbnail_url?.trim() || null,
      }

      if (editingCaseStudy) {
        // 수정
        const response = await fetch(`/api/admin/case-studies/${editingCaseStudy.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '수정에 실패했습니다.')
        }

        const result = await response.json()
        if (result.success) {
          await loadCaseStudies()
          setEditingCaseStudy(null)
          alert('관리 사례가 수정되었습니다.')
        } else {
          throw new Error(result.error || '수정에 실패했습니다.')
        }
      } else {
        // 생성
        const response = await fetch('/api/admin/case-studies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '생성에 실패했습니다.')
        }

        const result = await response.json()
        if (result.success) {
          await loadCaseStudies()
          setShowAddForm(false)
          alert('관리 사례가 추가되었습니다.')
        } else {
          throw new Error(result.error || '생성에 실패했습니다.')
        }
      }
    } catch (error: any) {
      console.error('Error saving case study:', error)
      alert(`저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/case-studies/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        await loadCaseStudies()
        alert('관리 사례가 삭제되었습니다.')
      }
    } catch (error) {
      console.error('Error deleting case study:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleReorder = async (id: string, newOrder: number) => {
    try {
      const response = await fetch(`/api/admin/case-studies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder }),
      })
      if (response.ok) {
        await loadCaseStudies()
      }
    } catch (error) {
      console.error('Error reordering case study:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">관리 사례 관리</h1>
        <p className="text-gray-600">블로그 링크를 추가하여 관리 사례를 소개할 수 있습니다.</p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          총 {caseStudies.length}개의 관리 사례
        </div>
        <button
          onClick={() => {
            setShowAddForm(true)
            setEditingCaseStudy(null)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 관리 사례 추가
        </button>
      </div>

      {/* 관리 사례 목록 */}
      <div className="space-y-4">
        {caseStudies.map((caseStudy, index) => (
          <div
            key={caseStudy.id}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start gap-6">
              {/* 순서 조절 */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleReorder(caseStudy.id, caseStudy.display_order - 1)}
                  disabled={index === 0}
                  className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                >
                  ↑
                </button>
                <span className="text-center text-sm font-medium">{caseStudy.display_order}</span>
                <button
                  onClick={() => handleReorder(caseStudy.id, caseStudy.display_order + 1)}
                  disabled={index === caseStudies.length - 1}
                  className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                >
                  ↓
                </button>
              </div>

              {/* 썸네일 */}
              {caseStudy.thumbnail_url && (
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  <img
                    src={
                      caseStudy.thumbnail_url.includes('postfiles.pstatic.net') ||
                      caseStudy.thumbnail_url.includes('blogfiles.naver.net')
                        ? `/api/proxy-image?url=${encodeURIComponent(caseStudy.thumbnail_url)}`
                        : caseStudy.thumbnail_url
                    }
                    alt={caseStudy.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      // 에러 시 플레이스홀더 표시
                      const placeholder = target.nextElementSibling as HTMLElement
                      if (placeholder) {
                        placeholder.style.display = 'flex'
                      }
                    }}
                  />
                  {/* 플레이스홀더 (에러 시 표시) */}
                  <div
                    className="hidden w-full h-full bg-gradient-to-br from-green-400 to-blue-500 items-center justify-center absolute inset-0"
                    style={{ display: 'none' }}
                  >
                    <svg
                      className="w-8 h-8 text-white opacity-80"
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
                  </div>
                </div>
              )}

              {/* 내용 */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{caseStudy.title}</h3>
                    {caseStudy.description && (
                      <p className="text-gray-600 text-sm mb-2">{caseStudy.description}</p>
                    )}
                    <a
                      href={caseStudy.blog_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {caseStudy.blog_url}
                    </a>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingCaseStudy(caseStudy)
                        setShowAddForm(false)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(caseStudy.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className={caseStudy.is_active ? 'text-green-600' : 'text-gray-400'}>
                    {caseStudy.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 추가/수정 폼 */}
      {(showAddForm || editingCaseStudy) && (
        <CaseStudyForm
          caseStudy={editingCaseStudy}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false)
            setEditingCaseStudy(null)
          }}
        />
      )}
    </div>
  )
}

function CaseStudyForm({
  caseStudy,
  onSave,
  onCancel,
}: {
  caseStudy: CaseStudy | null
  onSave: (data: Partial<CaseStudy>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<Partial<CaseStudy>>({
    title: caseStudy?.title || '',
    description: caseStudy?.description || '',
    blog_url: caseStudy?.blog_url || '',
    thumbnail_url: caseStudy?.thumbnail_url || '',
    display_order: caseStudy?.display_order || 0,
    is_active: caseStudy?.is_active !== undefined ? caseStudy.is_active : true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {caseStudy ? '관리 사례 수정' : '관리 사례 추가'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              블로그 URL *
            </label>
            <input
              type="url"
              value={formData.blog_url}
              onChange={(e) => setFormData({ ...formData, blog_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/blog/post"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              썸네일 이미지 URL (선택)
            </label>
            <input
              type="url"
              value={formData.thumbnail_url || ''}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/image.jpg"
            />
            {formData.thumbnail_url && formData.thumbnail_url.trim() && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">미리보기:</p>
                <div className="w-full max-w-md h-48 rounded-lg overflow-hidden bg-gray-100 border border-gray-300 relative">
                  <img
                    src={
                      formData.thumbnail_url.includes('postfiles.pstatic.net') ||
                      formData.thumbnail_url.includes('blogfiles.naver.net')
                        ? `/api/proxy-image?url=${encodeURIComponent(formData.thumbnail_url)}`
                        : formData.thumbnail_url
                    }
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      // 에러 시 플레이스홀더 표시
                      const placeholder = target.nextElementSibling as HTMLElement
                      if (placeholder) {
                        placeholder.style.display = 'flex'
                      }
                    }}
                  />
                  {/* 플레이스홀더 (에러 시 표시) */}
                  <div
                    className="hidden w-full h-full bg-gradient-to-br from-green-400 to-blue-500 items-center justify-center absolute inset-0"
                    style={{ display: 'none' }}
                  >
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 text-white opacity-80 mx-auto mb-2"
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
                      <p className="text-white text-sm">이미지를 불러올 수 없습니다</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              표시 순서
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) =>
                setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              활성화
            </label>
          </div>

          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
