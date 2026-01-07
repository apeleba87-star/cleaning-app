'use client'

import { useState, useEffect } from 'react'
import { SupplyList } from '@/components/SupplyList'
import { createClient } from '@/lib/supabase/client'
import { SupplyRequest, SupplyRequestStatus, SupplyRequestCategory } from '@/types/db'
import { PhotoUploader } from '@/components/PhotoUploader'
import { useTodayAttendance } from '@/contexts/AttendanceContext'
import StoreSelector from '../attendance/StoreSelector'

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<SupplyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    store_id: '',
    title: '',
    description: '',
    category: '' as SupplyRequestCategory | '',
    customCategory: '', // 직접입력인 경우
    photo_url: '',
  })

  // 출근 정보 가져오기
  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()
  const [storeName, setStoreName] = useState<string>('')

  // 물품 요청은 AttendanceContext와 독립적으로 즉시 로드 (속도 최적화)
  useEffect(() => {
    loadSupplies()
  }, [])

  // 출근 정보가 확인되면 매장 정보 설정 및 필터링 업데이트
  useEffect(() => {
    if (!attendanceLoading) {
      // 출근한 매장이 있으면 자동으로 설정
      if (attendanceStoreId && isClockedIn) {
        setFormData(prev => ({ ...prev, store_id: attendanceStoreId }))
        loadStoreName(attendanceStoreId)
        // 출근 정보 확인 후 물품 요청 다시 로드 (필터링 적용)
        loadSupplies()
      }
    }
  }, [attendanceLoading, attendanceStoreId, isClockedIn])

  const loadStoreName = async (storeId: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single()
      
      if (!error && data) {
        setStoreName(data.name)
      }
    } catch (error) {
      console.error('Error loading store name:', error)
    }
  }

  const loadSupplies = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLoading(false)
      return
    }

    // 처리 완료된 요청은 1주일 이내만 표시
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoISO = oneWeekAgo.toISOString().split('T')[0]

    // 처리 완료가 아닌 요청과 완료된 요청을 병렬로 조회 (속도 최적화)
    let nonCompletedQuery = supabase
      .from('supply_requests')
      .select('id, store_id, user_id, category_id, item_name, quantity, title, description, category, photo_url, status, manager_comment, completion_photo_url, completion_description, completed_at, created_at, updated_at')
      .eq('user_id', session.user.id)
      .neq('status', 'completed')

    let completedQuery = supabase
      .from('supply_requests')
      .select('id, store_id, user_id, category_id, item_name, quantity, title, description, category, photo_url, status, manager_comment, completion_photo_url, completion_description, completed_at, created_at, updated_at')
      .eq('user_id', session.user.id)
      .eq('status', 'completed')
      .gte('completed_at', oneWeekAgoISO)

    // 출근한 매장이 있으면 해당 매장의 요청만 조회
    if (attendanceStoreId && isClockedIn) {
      nonCompletedQuery = nonCompletedQuery.eq('store_id', attendanceStoreId)
      completedQuery = completedQuery.eq('store_id', attendanceStoreId)
    }

    // 병렬 쿼리 실행
    const [nonCompletedResult, completedResult] = await Promise.all([
      nonCompletedQuery,
      completedQuery
    ])

    const nonCompletedData = nonCompletedResult.data
    const nonCompletedError = nonCompletedResult.error
    const completedData = completedResult.data
    const completedError = completedResult.error

    // 두 결과 합치기 및 정렬 (completed는 맨 아래)
    let allData = [...(nonCompletedData || [])]
    if (!completedError && completedData) {
      allData = [...allData, ...completedData]
    }

    // 정렬
    allData.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1
      if (a.status !== 'completed' && b.status === 'completed') return -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    setSupplies(allData)
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!formData.store_id || !formData.title.trim()) {
      alert('매장과 제목을 입력해주세요.')
      return
    }

    if (!formData.category) {
      alert('카테고리를 선택해주세요.')
      return
    }

    try {
      const response = await fetch('/api/staff/supply-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: formData.store_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category === '직접입력' 
            ? (formData.customCategory.trim() || formData.category)
            : formData.category,
          photo_url: formData.photo_url || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error:', data)
        throw new Error(data.error || '물품 요청 생성에 실패했습니다.')
      }

      setShowForm(false)
      setFormData({
        store_id: attendanceStoreId || '',
        title: '',
        description: '',
        category: '' as SupplyRequestCategory | '',
        customCategory: '',
        photo_url: '',
      })
      // 미션 완료 이벤트 발생
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('missionComplete', {
          detail: { missionId: 'supply_request' }
        }))
      }

      alert('물품 요청이 접수되었습니다.')
      loadSupplies()
    } catch (error: any) {
      alert(error.message || '물품 요청 생성에 실패했습니다.')
    }
  }

  // 직원은 상태를 변경할 수 없음 (읽기 전용)
  const handleStatusChange = async () => {
    // 직원은 상태 변경 불가
  }

  // 물품 요청 로딩 중일 때만 로딩 표시 (AttendanceContext 대기 제거)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 출근하지 않았거나 퇴근한 경우 안내 메시지
  // AttendanceContext가 아직 로딩 중이면 출근 여부를 확인할 수 없으므로 일단 허용
  // (물품 요청은 이미 로드되었으므로 표시 가능)
  // 출근 정보가 로딩 완료되었고, 출근하지 않은 경우에만 안내 메시지 표시
  if (!attendanceLoading && !isClockedIn && supplies.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 mb-20 md:mb-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">
            관리시작 후 물품 요청을 확인할 수 있습니다.
          </p>
          <p className="text-yellow-600 text-sm">
            관리시작/종료 페이지에서 관리시작을 먼저 진행해주세요.
          </p>
        </div>
      </div>
    )
  }

  const categoryOptions: Array<{ value: SupplyRequestCategory; label: string; icon: string }> = [
    { value: '걸레', label: '걸레', icon: '🧹' },
    { value: '쓰레기봉투', label: '쓰레기봉투', icon: '🗑️' },
    { value: '약품', label: '약품', icon: '🧴' },
    { value: '직접입력', label: '직접입력', icon: '✏️' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-2 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6 mb-16 md:mb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">물품 요청</h1>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) {
              // 취소 시 폼 초기화
              setFormData({
                store_id: attendanceStoreId || '',
                title: '',
                description: '',
                category: '' as SupplyRequestCategory | '',
                customCategory: '',
                photo_url: '',
              })
            }
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showForm
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {showForm ? '취소' : '+ 새 요청'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-100">
          <div>
            <h2 className="text-xl font-bold mb-2">물품 요청하기</h2>
            <p className="text-sm text-gray-500">필요한 물품을 요청해주세요</p>
          </div>

          {/* 매장 정보 (읽기 전용) */}
          {attendanceStoreId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">출근 매장:</span>
                <span className="text-sm text-blue-700 font-semibold">
                  {storeName || attendanceStoreId}
                </span>
              </div>
            </div>
          )}

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (option.value === '직접입력') {
                      setFormData({ ...formData, category: option.value, customCategory: '' })
                    } else {
                      setFormData({ ...formData, category: option.value, customCategory: '' })
                    }
                  }}
                  className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    formData.category === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
            {formData.category === '직접입력' && (
              <input
                type="text"
                value={formData.customCategory}
                onChange={(e) =>
                  setFormData({ ...formData, customCategory: e.target.value })
                }
                className="w-full mt-3 px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="카테고리를 입력하세요"
                autoFocus
              />
            )}
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="예: 걸레 5개 필요"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              상세 설명 <span className="text-gray-400 text-xs">(선택사항)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
              placeholder="추가로 알려주실 내용이 있으면 입력해주세요"
            />
          </div>

          {/* 사진 업로드 */}
          {formData.store_id && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                사진 <span className="text-gray-400 text-xs">(선택사항)</span>
              </label>
              <PhotoUploader
                storeId={formData.store_id}
                entity="supply"
                onUploadComplete={(url) =>
                  setFormData({ ...formData, photo_url: url })
                }
                className="border-2 border-dashed border-gray-300 rounded-lg"
              />
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={!formData.title.trim() || !formData.category || (formData.category === '직접입력' && !formData.customCategory.trim())}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              요청 접수하기
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <SupplyList
          supplies={supplies}
          onStatusChange={handleStatusChange}
          userRole="staff"
        />
      </div>
    </div>
  )
}

