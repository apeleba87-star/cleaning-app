'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Feature {
  id: string
  title: string
  description: string
  icon_name: string
  icon_color: string
  display_order: number
  category: string
  benefits: string[]
  is_active: boolean
}

export default function FeaturesManager() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadFeatures()
  }, [])

  const loadFeatures = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/features')
      const result = await response.json()
      if (result.success) {
        setFeatures(result.data)
      }
    } catch (error) {
      console.error('Error loading features:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (featureData: Partial<Feature>) => {
    try {
      if (editingFeature) {
        // 수정
        const response = await fetch(`/api/admin/features/${editingFeature.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(featureData),
        })
        const result = await response.json()
        if (result.success) {
          await loadFeatures()
          setEditingFeature(null)
          alert('기능이 수정되었습니다.')
        }
      } else {
        // 생성
        const response = await fetch('/api/admin/features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(featureData),
        })
        const result = await response.json()
        if (result.success) {
          await loadFeatures()
          setShowAddForm(false)
          alert('기능이 추가되었습니다.')
        }
      }
    } catch (error) {
      console.error('Error saving feature:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/features/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        await loadFeatures()
        alert('기능이 삭제되었습니다.')
      }
    } catch (error) {
      console.error('Error deleting feature:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleReorder = async (id: string, newOrder: number) => {
    try {
      const response = await fetch(`/api/admin/features/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder }),
      })
      if (response.ok) {
        await loadFeatures()
      }
    } catch (error) {
      console.error('Error reordering feature:', error)
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">기능 소개 관리</h1>
        <p className="text-gray-600">웹사이트의 기능 소개를 관리할 수 있습니다.</p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          총 {features.length}개의 기능
        </div>
        <button
          onClick={() => {
            setShowAddForm(true)
            setEditingFeature(null)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 기능 추가
        </button>
      </div>

      {/* 기능 목록 */}
      <div className="space-y-4">
        {features.map((feature, index) => (
          <div
            key={feature.id}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start gap-6">
              {/* 순서 조절 */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleReorder(feature.id, feature.display_order - 1)}
                  disabled={index === 0}
                  className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                >
                  ↑
                </button>
                <span className="text-center text-sm font-medium">{feature.display_order}</span>
                <button
                  onClick={() => handleReorder(feature.id, feature.display_order + 1)}
                  disabled={index === features.length - 1}
                  className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                >
                  ↓
                </button>
              </div>

              {/* 아이콘 */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{
                  background: `linear-gradient(to bottom right, ${feature.icon_color}, ${feature.icon_color}dd)`,
                }}
              >
                {feature.icon_name}
              </div>

              {/* 내용 */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{feature.description}</p>
                    {feature.benefits && feature.benefits.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {feature.benefits.map((benefit, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {benefit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingFeature(feature)
                        setShowAddForm(false)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(feature.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>카테고리: {feature.category}</span>
                  <span>•</span>
                  <span>색상: {feature.icon_color}</span>
                  <span>•</span>
                  <span className={feature.is_active ? 'text-green-600' : 'text-gray-400'}>
                    {feature.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 추가/수정 폼 */}
      {(showAddForm || editingFeature) && (
        <FeatureForm
          feature={editingFeature}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false)
            setEditingFeature(null)
          }}
        />
      )}
    </div>
  )
}

function FeatureForm({
  feature,
  onSave,
  onCancel,
}: {
  feature: Feature | null
  onSave: (data: Partial<Feature>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<Partial<Feature>>({
    title: feature?.title || '',
    description: feature?.description || '',
    icon_name: feature?.icon_name || '📌',
    icon_color: feature?.icon_color || '#3B82F6',
    display_order: feature?.display_order || 0,
    category: feature?.category || 'general',
    benefits: feature?.benefits || [],
    is_active: feature?.is_active !== undefined ? feature.is_active : true,
  })

  const [newBenefit, setNewBenefit] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits: [...(formData.benefits || []), newBenefit.trim()],
      })
      setNewBenefit('')
    }
  }

  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits?.filter((_, i) => i !== index) || [],
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {feature ? '기능 수정' : '기능 추가'}
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
              설명 *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                아이콘 (이모지)
              </label>
              <input
                type="text"
                value={formData.icon_name}
                onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="📌"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                아이콘 색상
              </label>
              <input
                type="color"
                value={formData.icon_color}
                onChange={(e) => setFormData({ ...formData, icon_color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="management"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주요 장점
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addBenefit()
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="장점을 입력하고 Enter"
              />
              <button
                type="button"
                onClick={addBenefit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.benefits?.map((benefit, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg flex items-center gap-2"
                >
                  {benefit}
                  <button
                    type="button"
                    onClick={() => removeBenefit(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
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
