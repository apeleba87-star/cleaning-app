'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'owner' | 'staff'
  created_at: string
  created_by: string
  created_by_name?: string
  read_count?: number
  total_users?: number
}

interface ReadStatus {
  user_id: string
  user_name: string
  read_at: string | null
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showReadStatusModal, setShowReadStatusModal] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([])
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'staff' as 'owner' | 'staff',
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/business/announcements')
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 401) router.push('/login')
        setLoading(false)
        return
      }

      if (json.success && json.data) {
        setAnnouncements(json.data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading announcements:', error)
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    try {
      const res = await fetch('/api/business/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          type: formData.type,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        alert(json.error || '공지사항 생성에 실패했습니다.')
        return
      }

      setShowCreateModal(false)
      setFormData({ title: '', content: '', type: 'staff' })
      loadAnnouncements()
    } catch (error) {
      console.error('Error creating announcement:', error)
      alert('공지사항 생성에 실패했습니다.')
    }
  }

  const handleViewReadStatus = async (announcement: Announcement) => {
    try {
      const res = await fetch(
        `/api/business/announcements/read-status?announcement_id=${announcement.id}&type=${announcement.type}`
      )
      const json = await res.json()

      if (!res.ok || !json.success) {
        alert('확인 현황을 불러오는데 실패했습니다.')
        return
      }

      setReadStatuses(json.data || [])
      setSelectedAnnouncement(announcement)
      setShowReadStatusModal(true)
    } catch (error) {
      console.error('Error loading read status:', error)
      alert('확인 현황을 불러오는데 실패했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/business/announcements?id=${id}`, { method: 'DELETE' })
      const json = await res.json()

      if (!res.ok) {
        alert(json.error || '공지사항 삭제에 실패했습니다.')
        return
      }

      loadAnnouncements()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      alert('공지사항 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">공지사항 관리</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          공지사항 작성
        </button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            작성된 공지사항이 없습니다.
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        announcement.type === 'staff'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {announcement.type === 'staff' ? '직원용' : '점주용'}
                    </span>
                    <h2 className="text-xl font-semibold">{announcement.title}</h2>
                  </div>
                  <p className="text-gray-600 mb-2 whitespace-pre-wrap">{announcement.content}</p>
                  <div className="text-sm text-gray-500">
                    작성자: {announcement.created_by_name} | 작성일:{' '}
                    {new Date(announcement.created_at).toLocaleString('ko-KR')}
                  </div>
                  {announcement.type === 'staff' && (
                    <div className="mt-2 text-sm text-gray-600">
                      확인 현황: {announcement.read_count || 0} / {announcement.total_users || 0}명
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {announcement.type === 'staff' && (
                    <button
                      onClick={() => handleViewReadStatus(announcement)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      확인 현황
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 작성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">공지사항 작성</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  공지사항 유형
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as 'owner' | 'staff' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="staff">직원용</option>
                  <option value="owner">점주용</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="공지사항 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="공지사항 내용을 입력하세요"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ title: '', content: '', type: 'staff' })
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                작성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 현황 모달 */}
      {showReadStatusModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              확인 현황 - {selectedAnnouncement.title}
            </h2>
            <div className="space-y-2">
              {readStatuses.map((status) => (
                <div
                  key={status.user_id}
                  className={`p-3 rounded border ${
                    status.read_at
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{status.user_name}</span>
                    <span
                      className={`text-sm ${
                        status.read_at ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {status.read_at
                        ? `확인함 (${new Date(status.read_at).toLocaleString('ko-KR')})`
                        : '미확인'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowReadStatusModal(false)
                  setSelectedAnnouncement(null)
                  setReadStatuses([])
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
















