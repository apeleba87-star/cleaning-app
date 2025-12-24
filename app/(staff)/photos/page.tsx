'use client'

import { useState, useEffect } from 'react'
import { PhotoUploader } from '@/components/PhotoUploader'
import { createClient } from '@/lib/supabase/client'
import { CleaningPhoto } from '@/types/db'
import { useTodayAttendance } from '@/lib/hooks/useTodayAttendance'
import StoreSelector from '../attendance/StoreSelector'

export default function PhotosPage() {
  const [storeId, setStoreId] = useState('')
  const [areaCategory, setAreaCategory] = useState('')
  const [kind, setKind] = useState<'before' | 'after'>('before')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photos, setPhotos] = useState<CleaningPhoto[]>([])
  const [loading, setLoading] = useState(true)

  // 출근 정보 가져오기
  const { storeId: attendanceStoreId, isClockedIn, loading: attendanceLoading } = useTodayAttendance()

  useEffect(() => {
    if (!attendanceLoading) {
      // 출근한 매장이 있으면 자동으로 설정
      if (attendanceStoreId && isClockedIn) {
        setStoreId(attendanceStoreId)
      }
      loadPhotos()
    }
  }, [attendanceLoading, attendanceStoreId, isClockedIn])

  const loadPhotos = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    let query = supabase
      .from('cleaning_photos')
      .select('*')
      .eq('user_id', session.user.id)

    // 출근한 매장이 있으면 해당 매장의 사진만 조회
    if (attendanceStoreId && isClockedIn) {
      query = query.eq('store_id', attendanceStoreId)
    }

    const { data } = await query.order('created_at', { ascending: false })

    setPhotos(data || [])
    setLoading(false)
  }

  const handleUploadComplete = async (url: string) => {
    if (!storeId || !areaCategory) {
      alert('매장과 구역을 입력해주세요.')
      return
    }

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const { error } = await supabase.from('cleaning_photos').insert({
      store_id: storeId,
      user_id: session.user.id,
      area_category: areaCategory,
      kind,
      photo_url: url,
      review_status: 'pending',
    })

    if (error) {
      alert(`업로드 실패: ${error.message}`)
    } else {
      setPhotoUrl(null)
      setAreaCategory('')
      loadPhotos()
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
      <div className="max-w-4xl mx-auto px-4 py-6 mb-16 md:mb-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">
            출근 후 청소 사진을 확인할 수 있습니다.
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
      <h1 className="text-2xl font-bold">청소 사진</h1>

      {/* 업로드 폼 */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">사진 업로드</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              매장 <span className="text-red-500">*</span>
            </label>
            <StoreSelector
              selectedStoreId={storeId}
              onSelectStore={setStoreId}
              disabled={true} // 출근한 매장으로 고정
            />
            <p className="mt-1 text-xs text-gray-500">
              출근한 매장: {attendanceStoreId}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              구역 카테고리
            </label>
            <input
              type="text"
              value={areaCategory}
              onChange={(e) => setAreaCategory(e.target.value)}
              placeholder="예: 화장실, 주방"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            종류
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="before"
                checked={kind === 'before'}
                onChange={(e) => setKind(e.target.value as 'before' | 'after')}
                className="mr-2"
              />
              청소 전
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="after"
                checked={kind === 'after'}
                onChange={(e) => setKind(e.target.value as 'before' | 'after')}
                className="mr-2"
              />
              청소 후
            </label>
          </div>
        </div>
        {storeId && (
          <PhotoUploader
            storeId={storeId}
            entity="cleaning"
            onUploadComplete={handleUploadComplete}
            onUploadError={(err) => alert(err)}
          />
        )}
      </div>

      {/* 사진 리스트 */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold mb-4">업로드된 사진</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="border border-gray-300 rounded-lg p-3">
              <img
                src={photo.photo_url}
                alt={photo.area_category}
                className="w-full h-48 object-cover rounded-md mb-2"
              />
              <div className="text-sm">
                <p className="font-medium">{photo.area_category}</p>
                <p className="text-gray-600">
                  {photo.kind === 'before' ? '청소 전' : '청소 후'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(photo.created_at).toLocaleString('ko-KR')}
                </p>
                <span
                  className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                    photo.review_status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : photo.review_status === 'reshoot_requested'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {photo.review_status === 'approved'
                    ? '승인'
                    : photo.review_status === 'reshoot_requested'
                    ? '재촬영 요청'
                    : '검토 중'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

