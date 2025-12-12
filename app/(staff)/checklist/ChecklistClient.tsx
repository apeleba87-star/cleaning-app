'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChecklistItem } from '@/types/db'
import { createClient } from '@/lib/supabase/client'
import { Checklist } from '@/types/db'
import { ChecklistTable } from './ChecklistTable'
import { ChecklistCalendar } from '@/components/ChecklistCalendar'
import { useTodayAttendance } from '@/lib/hooks/useTodayAttendance'
import { calculateChecklistProgress } from '@/lib/utils/checklist'
import { ChecklistCamera } from '@/components/ChecklistCamera'

export default function ChecklistClient() {
  const router = useRouter()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  // 출근 정보 가져오기
  const { storeId: attendanceStoreId, activeStoreIds = [], isClockedIn, loading: attendanceLoading } = useTodayAttendance()
  
  // 체크리스트 수행 폼 상태
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [note, setNote] = useState('')
  const [cameraMode, setCameraMode] = useState<'before' | 'after' | null>(null)
  const [activeTab, setActiveTab] = useState<'incomplete' | 'completed'>('incomplete')

  const loadAssignedChecklists = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLoading(false)
      return
    }

    console.log('=== Checklist Load Debug ===')
    console.log('User ID:', session.user.id)
    console.log('Active Store IDs:', activeStoreIds)
    console.log('Is Clocked In:', isClockedIn)
    console.log('Attendance Loading:', attendanceLoading)

    // 출근한 매장이 있으면 해당 매장들의 체크리스트만 조회
    // work_date는 출근 날짜(오늘)로 자동 설정되므로 오늘 날짜의 체크리스트만 조회
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    console.log('Today (YYYY-MM-DD):', today)
    console.log('Current time:', new Date().toISOString())
    
    // 출근 중인 매장 목록 가져오기
    let storeIdsToCheck: string[] = []
    
    if (activeStoreIds && activeStoreIds.length > 0 && isClockedIn) {
      storeIdsToCheck = activeStoreIds
      console.log('✅ Using active store IDs:', storeIdsToCheck)
    } else if (isClockedIn) {
      // 출근 중이지만 activeStoreIds가 없는 경우 - 모든 배정 매장 확인
      const { data: storeAssignments } = await supabase
        .from('store_assign')
        .select('store_id')
        .eq('user_id', session.user.id)
      
      storeIdsToCheck = storeAssignments?.map(sa => sa.store_id) || []
      console.log('⚠️ Clocked in but no active stores - checking assigned stores:', storeIdsToCheck)
    } else {
      console.log('❌ Not clocked in - cannot load checklists')
      setLoading(false)
      return
    }

    // 출근한 매장에 대해 새로운 템플릿 체크리스트가 있는지 확인하고 자동 생성
    if (storeIdsToCheck.length > 0) {
      console.log('🔍 Checking for new template checklists for stores:', storeIdsToCheck)
      
      for (const storeId of storeIdsToCheck) {
        try {
          // 1. 해당 매장의 템플릿 체크리스트 조회
          const { data: templateChecklists, error: templateError } = await supabase
            .from('checklist')
            .select('*')
            .eq('store_id', storeId)
            .is('assigned_user_id', null)
            .eq('work_date', '2000-01-01') // 템플릿 날짜

          if (templateError) {
            console.error(`❌ Error loading templates for store ${storeId}:`, templateError)
            continue
          }

          if (!templateChecklists || templateChecklists.length === 0) {
            console.log(`📋 No templates found for store ${storeId}`)
            continue
          }

          console.log(`📋 Found ${templateChecklists.length} template(s) for store ${storeId}`)

          // 2. 오늘 날짜로 이미 생성된 체크리스트 확인
          const { data: existingChecklists } = await supabase
            .from('checklist')
            .select('id, user_id, store_id')
            .eq('store_id', storeId)
            .eq('work_date', today)
            .eq('assigned_user_id', session.user.id)

          // clockInAction과 동일한 방식으로 중복 체크
          const existingTemplateIds = new Set(
            (existingChecklists || []).map((c: any) => c.user_id + '_' + c.store_id)
          )

          // 3. 오늘 날짜로 체크리스트 생성 (템플릿 기반, 중복 체크)
          const checklistsToCreate = templateChecklists
            .filter((template: any) => {
              const templateKey = template.user_id + '_' + template.store_id
              return !existingTemplateIds.has(templateKey)
            })
            .map((template: any) => ({
              store_id: template.store_id,
              user_id: template.user_id, // 원본 생성자 (업체 관리자)
              assigned_user_id: session.user.id, // 현재 사용자에게 배정
              items: template.items,
              note: template.note,
              requires_photos: template.requires_photos || false,
              review_status: 'pending' as const,
              work_date: today, // 오늘 날짜로 설정
            }))

          console.log(`📝 Checklists to create for store ${storeId}:`, checklistsToCreate.length)

          if (checklistsToCreate.length > 0) {
            const { data: createdData, error: createError } = await supabase
              .from('checklist')
              .insert(checklistsToCreate)
              .select()

            if (!createError) {
              console.log(`✅ Checklists created for store ${storeId}:`, createdData?.length || 0)
              console.log('Created checklist IDs:', createdData?.map((c: any) => c.id))
            } else {
              console.error(`❌ Error creating checklists for store ${storeId}:`, createError)
              console.error('Error details:', {
                message: createError.message,
                code: createError.code,
                details: createError.details,
                hint: createError.hint
              })
            }
          } else {
            console.log(`ℹ️ All checklists already created for store ${storeId} today`)
          }
        } catch (error: any) {
          console.error(`❌ Error processing templates for store ${storeId}:`, error)
        }
      }
      
      // 템플릿에서 체크리스트를 생성했으면 잠시 대기 후 계속 진행
      // (Supabase가 새로 생성된 데이터를 인덱싱할 시간을 줌)
      if (storeIdsToCheck.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // 이제 체크리스트 로드
    let query = supabase
      .from('checklist')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)

    if (storeIdsToCheck.length > 0) {
      query = query
        .in('store_id', storeIdsToCheck)
        .eq('work_date', today) // 오늘 날짜의 체크리스트만
        .eq('assigned_user_id', session.user.id) // 본인에게 배정된 체크리스트만
      console.log('✅ Filtering by store IDs and today:', storeIdsToCheck, today)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error loading checklists:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      setError(`체크리스트를 불러오는 중 오류가 발생했습니다: ${error.message}`)
    } else {
      console.log('✅ Loaded checklists:', data?.length || 0)
      console.log('Checklists data:', JSON.stringify(data, null, 2))
      if (data && data.length > 0) {
        data.forEach((cl, idx) => {
          console.log(`  [${idx}] ID: ${cl.id}, Store: ${cl.store_id}, Assigned: ${cl.assigned_user_id}, Work Date: ${cl.work_date}`)
        })
      } else {
        console.log('⚠️ No checklists found. Possible reasons:')
        console.log('  - No checklists created for assigned stores')
        console.log('  - Checklists not created on clock-in')
        console.log('  - RLS policy issue')
        console.log('  - Store assignment issue')
        console.log('  - Today:', today)
        console.log('  - Active Store IDs:', activeStoreIds)
      }
      setChecklists(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!attendanceLoading) {
      loadAssignedChecklists()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceLoading, isClockedIn, JSON.stringify(activeStoreIds)])

  // 카메라 모드가 변경될 때 로딩 상태 관리
  useEffect(() => {
    if (cameraMode) {
      // 카메라 모드일 때는 로딩을 false로 설정하여 무한 로딩 방지
      setLoading(false)
    }
  }, [cameraMode])

  const handleSelectChecklist = (checklist: Checklist) => {
    setSelectedChecklist(checklist)
    const checklistItems = Array.isArray(checklist.items) ? checklist.items : []
    const normalizedItems = checklistItems.map((item: any) => ({
      ...item,
      type: item.type || 'check',
      checked: item.checked || false,
    }))
    setItems(normalizedItems)
    setNote(checklist.note || '')
    setError(null)
    
    // 사진이 필요한 항목이 있고, 관리 전 사진이 모두 없는 경우 자동으로 카메라 시작
    const photoItems = normalizedItems.filter(item => item.type === 'photo' && item.area?.trim())
    const hasBeforePhotos = photoItems.some(item => item.before_photo_url)
    
    if (photoItems.length > 0 && !hasBeforePhotos) {
      // 약간의 지연 후 카메라 모드 시작 (UI 렌더링 완료 후)
      setTimeout(() => {
        setCameraMode('before')
      }, 100)
    }
  }

  const handleItemsChange = (updatedItems: ChecklistItem[]) => {
    setItems(updatedItems)
  }

  const handleSubmit = async () => {
    if (!selectedChecklist) return

    const validItems = items.filter((item) => item.area.trim() !== '')
    if (validItems.length === 0) {
      setError('최소 하나의 체크리스트 항목을 입력해주세요.')
      return
    }


    const photoItems = validItems.filter((item) => item.type === 'photo')
    const incompletePhotoItems = photoItems.filter(
      (item) => !item.before_photo_url || !item.after_photo_url
    )
    if (incompletePhotoItems.length > 0) {
      setError('사진 필요 항목은 관리 전/후 사진을 모두 촬영해야 합니다.')
      return
    }

    const invalidItems = validItems.filter(
      (item) => item.type === 'check' && item.status === 'bad' && !item.comment?.trim()
    )
    if (invalidItems.length > 0) {
      setError('"불량" 상태인 항목은 코멘트를 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/staff/checklists/${selectedChecklist.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: validItems.map((item) => {
            if (item.type === 'check') {
              return {
                area: item.area.trim(),
                type: 'check',
                status: item.status,
                checked: item.checked || false,
                comment: item.comment?.trim() || undefined,
              }
            } else {
              return {
                area: item.area.trim(),
                type: 'photo',
                before_photo_url: item.before_photo_url,
                after_photo_url: item.after_photo_url,
                comment: item.comment?.trim() || undefined,
              }
            }
          }),
          before_photo_url: null, // 전체 청소 전/후 사진 제거
          after_photo_url: null, // 전체 청소 전/후 사진 제거
          note: note.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '체크리스트 제출에 실패했습니다.')
      }

      // 체크리스트 진행률 업데이트를 위해 이벤트 트리거
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('checklistUpdated'))
      }

      // 제출 완료 알림
      alert('체크리스트가 제출되었습니다.')
      
      // 모바일 대시보드로 이동
      router.push('/mobile-dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    // 출근한 날짜의 체크리스트만 찾기 (work_date는 출근 날짜와 동일)
    // 오늘 날짜의 체크리스트만 표시되므로 첫 번째 체크리스트 선택
    const checklist = checklists.find((c) => {
      // 출근한 매장의 체크리스트만 선택
      return activeStoreIds.includes(c.store_id)
    })
    if (checklist) {
      handleSelectChecklist(checklist)
    }
  }

  // 로딩 중
  if (attendanceLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mb-20 md:mb-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // 출근하지 않았거나 퇴근한 경우 안내 메시지
  if (!isClockedIn) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 mb-20 md:mb-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">
            출근 후 체크리스트를 확인할 수 있습니다.
          </p>
          <p className="text-yellow-600 text-sm">
            출퇴근 페이지에서 출근을 먼저 진행해주세요.
          </p>
        </div>
      </div>
    )
  }

  // 카메라 모드
  if (selectedChecklist && cameraMode) {
    const photoItems = items.filter(item => item.type === 'photo' && item.area?.trim())
    
    // 관리 후 사진 모드일 때는 관리 전 사진이 있는 항목만 필터링
    const itemsForCamera = cameraMode === 'after' 
      ? photoItems.filter(item => item.before_photo_url)
      : photoItems
    
    if (itemsForCamera.length === 0) {
      // 사진 촬영할 항목이 없으면 카메라 모드 종료
      setCameraMode(null)
      return null
    }
    
    return (
      <ChecklistCamera
        items={itemsForCamera}
        mode={cameraMode}
        storeId={selectedChecklist.store_id}
        onComplete={(updatedItems) => {
          // 업데이트된 photo 항목을 전체 items에 반영
          const updatedAllItems = items.map(item => {
            if (item.type === 'photo') {
              const updated = updatedItems.find(u => u.area === item.area)
              if (updated) {
                if (cameraMode === 'before') {
                  // 관리전 사진이 촬영되면 자동으로 체크 (checked 상태 추가)
                  return { ...item, before_photo_url: updated.before_photo_url, checked: true }
                } else {
                  return { ...item, after_photo_url: updated.after_photo_url }
                }
              }
            }
            return item
          })
          setItems(updatedAllItems)
          setCameraMode(null)
        }}
        onCancel={() => {
          setCameraMode(null)
        }}
      />
    )
  }

  if (selectedChecklist) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mb-20 md:mb-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">체크리스트 수행</h1>
          <button
            onClick={() => {
              setSelectedChecklist(null)
              setCameraMode(null)
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← 목록으로
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">
              {(selectedChecklist as any).stores?.name || '매장'} - 체크리스트
            </h2>
            {(() => {
              const progress = calculateChecklistProgress(selectedChecklist)
              
              // 진행률에 따른 색상 결정
              let progressColor = 'bg-red-500' // 0-30%
              let textColor = 'text-red-600'
              if (progress.percentage >= 31 && progress.percentage <= 99) {
                progressColor = 'bg-green-400' // 31-99% 연두색
                textColor = 'text-green-600'
              } else if (progress.percentage === 100) {
                progressColor = 'bg-blue-600' // 100% 파란색
                textColor = 'text-blue-600'
              }
              
              return (
                <div className="mt-2 mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">체크리스트 진행률</span>
                    <span className={`font-semibold ${textColor} text-base`}>
                      {progress.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`${progressColor} h-2.5 rounded-full transition-all`}
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {progress.completed} / {progress.total} 완료
                  </p>
                </div>
              )
            })()}
            {selectedChecklist.note && (
              <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                비고: {selectedChecklist.note}
              </p>
            )}
            {selectedChecklist.requires_photos && (
              <p className="text-sm text-red-600 mt-2 p-2 bg-red-50 rounded font-medium">
                ⚠️ 이 체크리스트는 관리 전/후 사진 촬영이 필수입니다.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* 탭 구조 */}
          {(() => {
            const photoItems = items.filter(item => item.type === 'photo' && item.area?.trim())
            const checkItems = items.filter(item => item.type === 'check' && item.area?.trim())
            
            // 미완료 항목: before_photo_url이 없는 사진 항목 + 미완료된 체크 항목
            const incompletePhotoItems = photoItems.filter(item => !item.before_photo_url)
            const incompleteCheckItems = checkItems.filter(item => !item.checked)
            const incompleteItems = [...incompletePhotoItems, ...incompleteCheckItems]
            
            // 완료 항목: after_photo_url이 있는 사진 항목
            const completedPhotoItems = photoItems.filter(item => item.after_photo_url)
            
            const incompleteCount = incompleteItems.length
            const completedCount = completedPhotoItems.length
            
            return (
              <>
                {/* 탭 */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    onClick={() => setActiveTab('incomplete')}
                    className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                      activeTab === 'incomplete'
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    미완료 (관리전) {incompleteCount > 0 && `${incompleteCount}개`}
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                      activeTab === 'completed'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    완료 (관리후) {completedCount > 0 && `${completedCount}개`}
                  </button>
                </div>

                {/* 탭별 콘텐츠 */}
                <div className="mb-6">
                  {activeTab === 'incomplete' ? (
                    <div className="space-y-3">
                      {incompleteItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          미완료 항목이 없습니다.
                        </div>
                      ) : (
                        incompleteItems.map((item, index) => {
                          const actualIndex = items.findIndex(i => i.area === item.area && i.type === item.type)
                          const isChecked = item.type === 'check' ? item.checked : false
                          
                          return (
                            <div
                              key={index}
                              className={`flex items-center space-x-3 p-3 border rounded-lg ${
                                item.type === 'check'
                                  ? 'cursor-pointer hover:bg-gray-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                if (item.type === 'check') {
                                  const newItems = [...items]
                                  if (actualIndex >= 0) {
                                    newItems[actualIndex] = {
                                      ...newItems[actualIndex],
                                      checked: !newItems[actualIndex].checked,
                                    }
                                    setItems(newItems)
                                  }
                                }
                              }}
                            >
                              {item.type === 'photo' ? (
                                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-blue-600 text-lg">
                                  📷
                                </div>
                              ) : (
                                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                  isChecked
                                    ? 'bg-green-500 border-green-600'
                                    : 'border-gray-300'
                                }`}>
                                  {isChecked && (
                                    <span className="text-white text-sm">✓</span>
                                  )}
                                </div>
                              )}
                              <span className="flex-1 text-gray-800">
                                {index + 1}. {item.area}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedPhotoItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          완료된 항목이 없습니다.
                        </div>
                      ) : (
                        completedPhotoItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <span className="flex-1 text-gray-800">
                              {index + 1}. {item.area}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* ChecklistTable은 카메라 모드와 사진 업로드를 위해 필요하므로 제거하지 않음 */}
                {/* 사진 업로드를 위해서는 ChecklistTable의 PhotoUploader 기능이 필요함 */}

                {/* 특이사항 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    특이사항 (비고)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="특이사항이나 참고사항을 입력하세요"
                  />
                </div>

                {/* 사진 촬영 및 제출 버튼 */}
                {(() => {
                  const hasAllBeforePhotos = photoItems.length === 0 || photoItems.every(item => item.before_photo_url)
                  const hasAllAfterPhotos = photoItems.length === 0 || photoItems.every(item => item.after_photo_url)
                  const hasAllCheckItemsCompleted = checkItems.length === 0 || checkItems.every(item => item.checked)

                  // 관리 전 사진이 없으면 관리 전 사진 촬영 버튼 표시
                  if (!hasAllBeforePhotos) {
                    const beforePhotoCount = incompletePhotoItems.length
                    return (
                      <button
                        onClick={() => setCameraMode('before')}
                        className="w-full px-6 py-4 bg-red-400 text-white rounded-lg hover:bg-red-500 font-medium text-lg flex items-center justify-center gap-2"
                      >
                        <span>📷</span>
                        관리전 사진 촬영 {beforePhotoCount > 0 && `(${beforePhotoCount}개)`}
                      </button>
                    )
                  }

                  // 관리 전 사진은 모두 있고, 일반 체크리스트 완료했지만 관리 후 사진이 없으면 관리 후 사진 촬영 버튼
                  if (hasAllBeforePhotos && hasAllCheckItemsCompleted && !hasAllAfterPhotos) {
                    const afterPhotoCount = photoItems.filter(item => item.before_photo_url && !item.after_photo_url).length
                    return (
                      <button
                        onClick={() => setCameraMode('after')}
                        className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg flex items-center justify-center gap-2"
                      >
                        <span>📷</span>
                        관리후 사진 촬영 {afterPhotoCount > 0 && `(${afterPhotoCount}개)`}
                      </button>
                    )
                  }

                  // 모두 완료되었으면 제출 버튼
                  return (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !hasAllAfterPhotos}
                      className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
                    >
                      {submitting ? '제출 중...' : '체크리스트 제출'}
                    </button>
                  )
                })()}
              </>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mb-20 md:mb-0">
      <h1 className="text-2xl font-bold">배정된 체크리스트</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ChecklistCalendar
            checklists={checklists}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate || undefined}
          />
        </div>

        <div className="lg:col-span-2">
          {checklists.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">배정된 체크리스트가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold mb-2">
                        {(checklist as any).stores?.name || '매장'}
                      </h2>
                      <p className="text-sm text-gray-600">
                        항목 수: {Array.isArray(checklist.items) ? checklist.items.length : 0}개
                      </p>
                      {(() => {
                        const progress = calculateChecklistProgress(checklist)
                        const isCompleted = progress.percentage === 100
                        
                        // 진행률에 따른 색상 결정
                        let progressColor = 'bg-red-500' // 0-30%
                        let textColor = 'text-red-600'
                        if (progress.percentage >= 31 && progress.percentage <= 99) {
                          progressColor = 'bg-green-400' // 31-99% 연두색
                          textColor = 'text-green-600'
                        } else if (progress.percentage === 100) {
                          progressColor = 'bg-blue-600' // 100% 파란색
                          textColor = 'text-blue-600'
                        }
                        
                        return (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">체크리스트 진행률</span>
                              <span className={`font-semibold ${textColor}`}>
                                {progress.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`${progressColor} h-2 rounded-full transition-all`}
                                style={{ width: `${progress.percentage}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {progress.completed} / {progress.total} 완료
                            </p>
                          </div>
                        )
                      })()}
                      {checklist.requires_photos && (
                        <p className="text-sm text-red-600 mt-2 font-medium">
                          ⚠️ 필수 사진 촬영
                        </p>
                      )}
                      {checklist.note && (
                        <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                          비고: {checklist.note}
                        </p>
                      )}
                    </div>
                    {(() => {
                      const progress = calculateChecklistProgress(checklist)
                      const isCompleted = progress.percentage === 100
                      
                      return (
                        <button
                          onClick={() => handleSelectChecklist(checklist)}
                          className={`ml-4 px-6 py-3 text-white rounded-md font-medium ${
                            isCompleted
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {isCompleted ? '수정하기' : '수행하기'}
                        </button>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

