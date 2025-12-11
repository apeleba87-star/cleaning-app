'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SupplyRequest, SupplyRequestStatus } from '@/types/db'
import { useTodayAttendance } from '@/lib/hooks/useTodayAttendance'
import StoreSelector from '../attendance/StoreSelector'

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<SupplyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    store_id: '',
    description: '',
  })

  // 출근 정보 가져오기
  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()

  useEffect(() => {
    if (!attendanceLoading) {
      // 출근한 매장이 있으면 자동으로 설정
      if (attendanceStoreId && isClockedIn) {
        setFormData(prev => ({ ...prev, store_id: attendanceStoreId }))
      }
      loadSupplies()
    }
  }, [attendanceLoading, attendanceStoreId, isClockedIn])

  const loadSupplies = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    let query = supabase
      .from('supply_requests')
      .select('*')
      .eq('user_id', session.user.id)

    // 출근한 매장이 있으면 해당 매장의 요청만 조회
    if (attendanceStoreId && isClockedIn) {
      query = query.eq('store_id', attendanceStoreId)
    }

    const { data } = await query.order('created_at', { ascending: false })

    setSupplies(data || [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!formData.store_id || !formData.description) {
      alert('매장과 요청란을 입력해주세요.')
      return
    }

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const { error } = await supabase.from('supply_requests').insert({
      store_id: formData.store_id,
      description: formData.description,
      user_id: session.user.id,
      status: 'requested',
      item_name: '', // 기존 필드 유지 (호환성)
      quantity: null,
    })

    if (error) {
      alert(`생성 실패: ${error.message}`)
    } else {
      setShowForm(false)
      setFormData({
        store_id: '',
        description: '',
      })
      loadSupplies()
    }
  }

  const getStatusLabel = (status: SupplyRequestStatus) => {
    switch (status) {
      case 'requested':
        return '요청됨'
      case 'received':
        return '수신됨'
      case 'completed':
        return '완료됨'
      case 'rejected':
        return '거부됨'
      default:
        return status
    }
  }

  const getStatusColor = (status: SupplyRequestStatus) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800'
      case 'received':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
            출근 후 물품 요청을 확인할 수 있습니다.
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
        <h1 className="text-2xl font-bold">물품/기타 요청</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? '취소' : '요청하기'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold">새 요청</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              매장 <span className="text-red-500">*</span>
            </label>
            <StoreSelector
              selectedStoreId={formData.store_id}
              onSelectStore={(id) => setFormData({ ...formData, store_id: id })}
              disabled={true}
            />
            <p className="mt-1 text-xs text-gray-500">
              출근한 매장: {attendanceStoreId}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              요청란
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder="요청 내용을 입력하세요"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowForm(false)
                setFormData({
                  store_id: '',
                  description: '',
                })
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">요청 목록</h2>
        {supplies.length === 0 ? (
          <p className="text-gray-500 text-center py-8">요청이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {supplies.map((supply) => (
              <div
                key={supply.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(supply.status)}`}
                      >
                        {getStatusLabel(supply.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(supply.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    {supply.description && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {supply.description}
                      </p>
                    )}
                    {supply.manager_comment && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-xs font-medium text-gray-600">관리자 코멘트:</p>
                        <p className="text-sm text-gray-700">{supply.manager_comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
