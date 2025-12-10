'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CleaningPhoto, Checklist } from '@/types/db'

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<'photos' | 'checklists'>('photos')
  const [photos, setPhotos] = useState<CleaningPhoto[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeTab === 'photos') {
      loadPhotos()
    } else {
      loadChecklists()
    }
  }, [activeTab])

  const loadPhotos = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cleaning_photos')
      .select('*')
      .eq('review_status', 'pending')
      .order('created_at', { ascending: false })

    setPhotos(data || [])
    setLoading(false)
  }

  const loadChecklists = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('checklist')
      .select('*')
      .eq('review_status', 'pending')
      .order('created_at', { ascending: false })

    setChecklists(data || [])
    setLoading(false)
  }

  const handlePhotoReview = async (
    id: string,
    action: 'approved' | 'reshoot_requested',
    comment?: string
  ) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('cleaning_photos')
      .update({
        review_status: action,
        manager_comment: comment || null,
      })
      .eq('id', id)

    if (error) {
      alert(`처리 실패: ${error.message}`)
    } else {
      loadPhotos()
    }
  }

  const handleChecklistReview = async (
    id: string,
    action: 'approved' | 'reshoot_requested',
    comment?: string
  ) => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { error } = await supabase
      .from('checklist')
      .update({
        review_status: action,
        manager_comment: comment || null,
        reviewed_by: session?.user.id || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      alert(`처리 실패: ${error.message}`)
    } else {
      loadChecklists()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">리뷰</h1>

      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('photos')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'photos'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          사진 ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab('checklists')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'checklists'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          체크리스트 ({checklists.length})
        </button>
      </div>

      {activeTab === 'photos' && (
        <div className="space-y-4">
          {photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              검토할 사진이 없습니다.
            </div>
          ) : (
            photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white rounded-lg shadow-md p-6 flex gap-6"
              >
                <img
                  src={photo.photo_url}
                  alt={photo.area_category}
                  className="w-64 h-64 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    {photo.area_category}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {photo.kind === 'before' ? '청소 전' : '청소 후'}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePhotoReview(photo.id, 'approved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      승인
                    </button>
                    <button
                      onClick={() =>
                        handlePhotoReview(photo.id, 'reshoot_requested', '재촬영이 필요합니다')
                      }
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      재촬영 요청
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'checklists' && (
        <div className="space-y-4">
          {checklists.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              검토할 체크리스트가 없습니다.
            </div>
          ) : (
            checklists.map((checklist) => (
              <div
                key={checklist.id}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h3 className="text-lg font-semibold mb-4">체크리스트</h3>
                <div className="space-y-2 mb-4">
                  {Array.isArray(checklist.items) &&
                    checklist.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="font-medium">{item.area}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            item.status === 'good'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.status === 'good' ? '양호' : '불량'}
                        </span>
                        {item.comment && (
                          <span className="text-sm text-gray-600">
                            - {item.comment}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      handleChecklistReview(checklist.id, 'approved')
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() =>
                      handleChecklistReview(
                        checklist.id,
                        'reshoot_requested',
                        '재검토 필요'
                      )
                    }
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    재검토 요청
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}


