'use client'

import { useState, useEffect } from 'react'
import { IssueList } from '@/components/IssueList'
import { createClient } from '@/lib/supabase/client'
import { Issue } from '@/types/db'
import { PhotoUploader } from '@/components/PhotoUploader'
import { useTodayAttendance } from '@/lib/hooks/useTodayAttendance'
import StoreSelector from '../attendance/StoreSelector'

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    store_id: '',
    category_id: '',
    title: '',
    description: '',
    photo_url: '',
  })

  // 출근 정보 가져오기
  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()

  useEffect(() => {
    if (!attendanceLoading) {
      // 출근한 매장이 있으면 자동으로 설정
      if (attendanceStoreId && isClockedIn) {
        setFormData(prev => ({ ...prev, store_id: attendanceStoreId }))
      }
      loadIssues()
    }
  }, [attendanceLoading, attendanceStoreId, isClockedIn])

  const loadIssues = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    let query = supabase
      .from('issues')
      .select('*')
      .eq('user_id', session.user.id)

    // 출근한 매장이 있으면 해당 매장의 이슈만 조회
    if (attendanceStoreId && isClockedIn) {
      query = query.eq('store_id', attendanceStoreId)
    }

    const { data } = await query.order('created_at', { ascending: false })

    setIssues(data || [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!formData.store_id || !formData.title) {
      alert('매장 ID와 제목을 입력해주세요.')
      return
    }

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const { error } = await supabase.from('issues').insert({
      ...formData,
      user_id: session.user.id,
      status: 'submitted',
    })

    if (error) {
      alert(`생성 실패: ${error.message}`)
    } else {
      setShowForm(false)
      setFormData({
        store_id: '',
        category_id: '',
        title: '',
        description: '',
        photo_url: '',
      })
      loadIssues()
    }
  }

  if (attendanceLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 출근하지 않았거나 퇴근한 경우 안내 메시지
  if (!isClockedIn) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 mb-20 md:mb-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">
            출근 후 이슈를 확인할 수 있습니다.
          </p>
          <p className="text-yellow-600 text-sm">
            출퇴근 페이지에서 출근을 먼저 진행해주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 mb-20 md:mb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">이슈</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showForm ? '취소' : '+ 이슈 생성'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold">새 이슈 생성</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                매장 <span className="text-red-500">*</span>
              </label>
              <StoreSelector
                selectedStoreId={formData.store_id}
                onSelectStore={(id) => setFormData({ ...formData, store_id: id })}
                disabled={true} // 출근한 매장으로 고정
              />
              <p className="mt-1 text-xs text-gray-500">
                출근한 매장: {attendanceStoreId}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
          {formData.store_id && (
            <PhotoUploader
              storeId={formData.store_id}
              entity="issue"
              onUploadComplete={(url) =>
                setFormData({ ...formData, photo_url: url })
              }
            />
          )}
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            제출
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <IssueList issues={issues} userRole="staff" />
      </div>
    </div>
  )
}

