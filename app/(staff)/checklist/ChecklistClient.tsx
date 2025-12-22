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
import { getTodayDateKST } from '@/lib/utils/date'

export default function ChecklistClient() {
  const router = useRouter()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [completedChecklists, setCompletedChecklists] = useState<Checklist[]>([])
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'completed'>('list') // list: 목록 보기, completed: 완료 내역 보기
  
  // 출근 정보 가져오기
  const { storeId: attendanceStoreId, activeStoreIds = [], isClockedIn, loading: attendanceLoading } = useTodayAttendance()
  
  // 체크리스트 수행 폼 상태
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [note, setNote] = useState('')
  const [cameraMode, setCameraMode] = useState<'before' | 'after' | null>(null)
  const [activeTab, setActiveTab] = useState<'incomplete' | 'completed'>('incomplete')
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null)
  const [viewingPhotoMode, setViewingPhotoMode] = useState<'before' | 'after' | null>(null)

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
    const today = getTodayDateKST() // 한국 시간대 기준 오늘 날짜
    
    console.log('Today (YYYY-MM-DD, KST):', today)
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

    // 오늘 날짜의 체크리스트 로드
    let todayQuery = supabase
      .from('checklist')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)

    if (storeIdsToCheck.length > 0) {
      todayQuery = todayQuery
        .in('store_id', storeIdsToCheck)
        .eq('work_date', today) // 오늘 날짜의 체크리스트만
        .eq('assigned_user_id', session.user.id) // 본인에게 배정된 체크리스트만
      console.log('✅ Filtering by store IDs and today:', storeIdsToCheck, today)
    }

    const { data: todayData, error: todayError } = await todayQuery.order('created_at', { ascending: false })

    // 완료된 체크리스트 로드 (이전 날짜 포함)
    let completedQuery = supabase
      .from('checklist')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)

    if (storeIdsToCheck.length > 0) {
      completedQuery = completedQuery
        .in('store_id', storeIdsToCheck)
        .lte('work_date', today) // 오늘 이전 날짜 포함
        .eq('assigned_user_id', session.user.id) // 본인에게 배정된 체크리스트만
    }

    const { data: allData, error: allError } = await completedQuery.order('work_date', { ascending: false })

    if (todayError || allError) {
      console.error('❌ Error loading checklists:', todayError || allError)
      setError(`체크리스트를 불러오는 중 오류가 발생했습니다: ${(todayError || allError)?.message}`)
    } else {
      console.log('✅ Loaded today checklists:', todayData?.length || 0)
      console.log('✅ Loaded all checklists:', allData?.length || 0)
      
      // 오늘 날짜의 체크리스트
      setChecklists(todayData || [])
      
      // 완료된 체크리스트 (100% 완료된 것만)
      const completed = (allData || []).filter((cl: Checklist) => {
        const progress = calculateChecklistProgress(cl)
        return progress.percentage === 100
      })
      setCompletedChecklists(completed)
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
    const normalizedItems = checklistItems.map((item: any, originalIndex: number) => ({
      ...item,
      type: item.type || 'check',
      checked: item.checked || false,
      originalIndex, // 원래 순서를 유지하기 위해 인덱스 추가
    }))
    // 사진 타입 항목을 먼저, 체크 타입 항목을 나중에 정렬
    const sortedItems = normalizedItems.sort((a, b) => {
      // 사진 타입이 체크 타입보다 먼저 오도록 정렬
      if (a.type === 'photo' && b.type === 'check') {
        return -1
      }
      if (a.type === 'check' && b.type === 'photo') {
        return 1
      }
      // 같은 타입이면 원래 순서 유지
      return (a.originalIndex || 0) - (b.originalIndex || 0)
    })
    setItems(sortedItems)
    setNote(checklist.note || '')
    setError(null)
    setCameraMode(null) // 카메라 모드 자동 시작 비활성화
    
    // 저장된 상태 확인 메시지
    const hasBeforePhotos = sortedItems.some(item => item.type === 'photo' && item.before_photo_url)
    const hasCheckedItems = sortedItems.some(item => item.type === 'check' && item.checked)
    if (hasBeforePhotos || hasCheckedItems) {
      console.log('저장된 체크리스트 진행 상황을 불러왔습니다.')
    }
  }

  // 체크리스트 진행 상황 저장 (부분 저장)
  const saveChecklistProgress = async (
    checklistId: string,
    itemsToSave: ChecklistItem[],
    noteToSave: string
  ) => {
    if (!selectedChecklist) return

    const validItems = itemsToSave.filter((item) => item.area.trim() !== '')
    
    const response = await fetch(`/api/staff/checklists/${checklistId}`, {
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
        before_photo_url: null,
        after_photo_url: null,
        note: noteToSave.trim() || null,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '체크리스트 저장에 실패했습니다.')
    }

    // 체크리스트 진행률 업데이트를 위해 이벤트 트리거
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('checklistUpdated'))
    }
  }

  const handleItemsChange = async (updatedItems: ChecklistItem[]) => {
    setItems(updatedItems)
    
    // 체크리스트 항목 변경 시 자동 저장 (debounce 적용)
    if (selectedChecklist) {
      // 이전 타이머 취소
      if ((window as any).checklistSaveTimer) {
        clearTimeout((window as any).checklistSaveTimer)
      }
      
      // 1초 후 자동 저장
      ;(window as any).checklistSaveTimer = setTimeout(async () => {
        try {
          await saveChecklistProgress(selectedChecklist.id, updatedItems, note)
          console.log('체크리스트 진행 상황이 자동 저장되었습니다.')
        } catch (error: any) {
          console.error('자동 저장 실패:', error)
          // 자동 저장 실패는 조용히 처리 (사용자에게 알림하지 않음)
        }
      }, 1000)
    }
  }

  const handleSubmit = async () => {
    if (!selectedChecklist) return

    const validItems = items.filter((item) => item.area.trim() !== '')
    if (validItems.length === 0) {
      setError('최소 하나의 체크리스트 항목을 입력해주세요.')
      return
    }

    // 관리후 사진은 모든 체크리스트 완료 후에만 가능
    const photoItems = validItems.filter((item) => item.type === 'photo')
    const checkItems = validItems.filter((item) => item.type === 'check')
    
    // 모든 체크리스트 항목이 완료되었는지 확인
    const hasAllCheckItemsCompleted = checkItems.length === 0 || checkItems.every(item => item.checked)
    if (!hasAllCheckItemsCompleted) {
      const incompleteCount = checkItems.filter(item => !item.checked).length
      setError(`모든 체크리스트 항목을 완료해야 합니다. (남은 항목: ${incompleteCount}개)`)
      return
    }

    // 관리후 사진이 모두 촬영되었는지 확인
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
      await saveChecklistProgress(selectedChecklist.id, validItems, note)

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
    // 선택한 날짜의 완료된 체크리스트 찾기
    const completedForDate = completedChecklists.filter((c) => {
      const workDate = new Date(c.work_date).toISOString().split('T')[0]
      return workDate === date
    })
    
    if (completedForDate.length > 0) {
      // 완료된 체크리스트가 있으면 완료 내역 보기 모드로 전환
      setViewMode('completed')
      setSelectedChecklist(null) // 체크리스트 선택 해제하여 완료 내역 목록 표시
    } else {
      // 완료된 체크리스트가 없으면 오늘 날짜의 체크리스트 찾기
      const today = getTodayDateKST()
      if (date === today) {
    const checklist = checklists.find((c) => {
      return activeStoreIds.includes(c.store_id)
    })
    if (checklist) {
          setViewMode('list')
      handleSelectChecklist(checklist)
        }
      }
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
        onComplete={async (updatedItems) => {
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
          
          // 관리전/관리후 사진 촬영 완료 시 자동 저장
          if (selectedChecklist) {
            try {
              await saveChecklistProgress(selectedChecklist.id, updatedAllItems, note)
              if (cameraMode === 'before') {
                alert('관리전 사진이 저장되었습니다. 대시보드로 돌아가 다른 업무를 진행할 수 있습니다.')
              } else {
                // 관리후 사진 저장 완료 시 체크리스트 완료 여부 확인
                const photoItems = updatedAllItems.filter(item => item.type === 'photo' && item.area?.trim())
                const checkItems = updatedAllItems.filter(item => item.type === 'check' && item.area?.trim())
                const hasAllAfterPhotos = photoItems.length === 0 || photoItems.every(item => item.after_photo_url)
                const hasAllCheckItemsCompleted = checkItems.length === 0 || checkItems.every(item => item.checked)
                
                if (hasAllAfterPhotos && hasAllCheckItemsCompleted) {
                  alert('관리후 사진이 저장되었습니다. 체크리스트가 완료되었습니다.')
                } else {
                  alert('관리후 사진이 저장되었습니다.')
                }
              }
            } catch (error: any) {
              console.error('자동 저장 실패:', error)
              alert('저장 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'))
            }
          }
          
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
              // 현재 상태의 items로 진행률 계산
              const checklistWithCurrentItems = {
                ...selectedChecklist,
                items: items
              }
              const progress = calculateChecklistProgress(checklistWithCurrentItems)
              
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
                    {progress.completedItems} / {progress.totalItems} 완료
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

          {/* 체크리스트 항목 테이블 - 체크 및 사진 업로드 */}
          <ChecklistTable
            items={items}
            storeId={selectedChecklist.store_id}
            onItemsChange={handleItemsChange}
            onCameraModeRequest={(mode) => setCameraMode(mode)}
          />

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
            const photoItems = items.filter(item => item.type === 'photo' && item.area?.trim())
            const checkItems = items.filter(item => item.type === 'check' && item.area?.trim())
            
            const hasAllBeforePhotos = photoItems.length === 0 || photoItems.every(item => item.before_photo_url)
            const hasAllAfterPhotos = photoItems.length === 0 || photoItems.every(item => item.after_photo_url)
            const hasAllCheckItemsCompleted = checkItems.length === 0 || checkItems.every(item => item.checked)

            // 관리 전 사진이 없으면 관리 전 사진 촬영 버튼 표시
            if (!hasAllBeforePhotos) {
              const incompletePhotoItems = photoItems.filter(item => !item.before_photo_url)
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

            // 관리 전 사진은 모두 있고, 모든 체크리스트 항목이 완료되었을 때만 관리 후 사진 촬영 버튼 표시
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
            
            // 관리 전 사진은 모두 있지만 체크리스트가 완료되지 않은 경우
            if (hasAllBeforePhotos && !hasAllCheckItemsCompleted) {
              const incompleteCheckCount = checkItems.filter(item => !item.checked).length
              return (
                <div className="w-full px-6 py-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-center">
                  <p className="text-yellow-800 font-medium">
                    모든 체크리스트 항목을 완료한 후 관리후 사진을 촬영할 수 있습니다.
                  </p>
                  <p className="text-yellow-600 text-sm mt-1">
                    남은 항목: {incompleteCheckCount}개
                  </p>
                </div>
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
        </div>
      </div>
    )
  }

  // 완료된 체크리스트 보기 모드
  if (viewMode === 'completed' && selectedDate) {
    const completedForDate = completedChecklists.filter((c) => {
      const workDate = new Date(c.work_date).toISOString().split('T')[0]
      return workDate === selectedDate
    })

    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mb-20 md:mb-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            완료된 체크리스트 - {new Date(selectedDate).toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </h1>
          <button
            onClick={() => {
              setViewMode('list')
              setSelectedDate(null)
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← 목록으로
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ChecklistCalendar
              checklists={checklists}
              completedChecklists={completedChecklists}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate || undefined}
            />
          </div>

          <div className="lg:col-span-2">
            {completedForDate.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500">해당 날짜에 완료된 체크리스트가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedForDate.map((checklist) => {
                  const checklistItems = Array.isArray(checklist.items) ? checklist.items : []
                  // 사진 타입 항목을 먼저, 체크 타입 항목을 나중에 정렬
                  const sortedChecklistItems = [...checklistItems].sort((a: any, b: any) => {
                    const aType = a.type || 'check'
                    const bType = b.type || 'check'
                    // 사진 타입이 체크 타입보다 먼저 오도록 정렬
                    if (aType === 'photo' && bType === 'check') {
                      return -1
                    }
                    if (aType === 'check' && bType === 'photo') {
                      return 1
                    }
                    // 같은 타입이면 원래 순서 유지 (인덱스 기반)
                    return 0
                  })
                  
                  return (
                    <div
                      key={checklist.id}
                      className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500"
                    >
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold mb-2">
                          {(checklist as any).stores?.name || '매장'}
                        </h2>
                        <p className="text-sm text-gray-600">
                          항목 수: {checklistItems.length}개
                        </p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">체크리스트 진행률</span>
                            <span className="font-semibold text-blue-600">
                              100%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: '100%' }}
                            ></div>
                          </div>
                        </div>
                        {checklist.note && (
                          <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                            비고: {checklist.note}
                          </p>
                        )}
                      </div>

                      {/* 완료된 항목 목록 (읽기 전용) */}
                      <div className="space-y-3 mt-4">
                        <h3 className="font-semibold text-gray-700">완료된 항목</h3>
                        {sortedChecklistItems.map((item: any, index: number) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {item.type === 'photo' ? (
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-600 text-lg">📷</span>
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <span className="text-green-600 text-lg">✓</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800 mb-2">
                                  {item.area || `항목 ${index + 1}`}
                                </div>
                                
                                {/* 사진 항목 - 관리 전/후 사진 표시 */}
                                {item.type === 'photo' && (
                                  <div className="grid grid-cols-2 gap-3 mt-2">
                                    {item.before_photo_url && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">관리 전</p>
                                        <button
                                          onClick={() => {
                                            setViewingPhotoIndex(index)
                                            setViewingPhotoMode('before')
                                          }}
                                          className="relative group w-full"
                                        >
                                          <img
                                            src={item.before_photo_url}
                                            alt="관리 전"
                                            className="w-full h-32 object-cover rounded border-2 border-blue-300 hover:border-blue-500 transition-colors cursor-pointer"
                                            onError={() => {
                                              console.error('Image load error:', item.before_photo_url)
                                            }}
                                          />
                                        </button>
                                      </div>
                                    )}
                                    {item.after_photo_url && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">관리 후</p>
                                        <button
                                          onClick={() => {
                                            setViewingPhotoIndex(index)
                                            setViewingPhotoMode('after')
                                          }}
                                          className="relative group w-full"
                                        >
                                          <img
                                            src={item.after_photo_url}
                                            alt="관리 후"
                                            className="w-full h-32 object-cover rounded border-2 border-green-300 hover:border-green-500 transition-colors cursor-pointer"
                                            onError={() => {
                                              console.error('Image load error:', item.after_photo_url)
                                            }}
                                          />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* 체크 항목 - 상태 및 코멘트 */}
                                {item.type === 'check' && (
                                  <div className="mt-2">
                                    {item.status && (
                                      <div className="flex items-center gap-2 mb-2">
                                        {item.status === 'good' ? (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            양호
                                          </span>
                                        ) : item.status === 'bad' ? (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            불량
                                          </span>
                                        ) : null}
                                      </div>
                                    )}
                                    {item.comment && (
                                      <div className="text-gray-600 text-sm p-2 bg-gray-50 rounded">
                                        {item.comment}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 사진 확인 모달 */}
        {viewingPhotoIndex !== null && viewingPhotoMode && completedForDate.length > 0 && (() => {
          // 모든 완료된 체크리스트에서 해당 인덱스의 항목 찾기
          let foundItem: any = null
          let foundChecklist: Checklist | null = null
          
          for (const checklist of completedForDate) {
            const items = Array.isArray(checklist.items) ? checklist.items : []
            if (items[viewingPhotoIndex]) {
              foundItem = items[viewingPhotoIndex]
              foundChecklist = checklist
              break
            }
          }
          
          if (!foundItem || !foundChecklist) return null
          
          const photoUrl = viewingPhotoMode === 'before' ? foundItem.before_photo_url : foundItem.after_photo_url
          if (!photoUrl) return null
          
          return (
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setViewingPhotoIndex(null)
                setViewingPhotoMode(null)
              }}
            >
              <div className="relative max-w-4xl w-full max-h-[90vh]">
                <button
                  onClick={() => {
                    setViewingPhotoIndex(null)
                    setViewingPhotoMode(null)
                  }}
                  className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-lg"
                >
                  ×
                </button>
                <img
                  src={photoUrl}
                  alt={`${foundItem.area} - ${viewingPhotoMode === 'before' ? '관리 전' : '관리 후'}`}
                  className="w-full h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
                  {foundItem.area} - {viewingPhotoMode === 'before' ? '관리 전' : '관리 후'}
                </div>
              </div>
            </div>
          )
        })()}
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
            completedChecklists={completedChecklists}
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
                              {progress.completedItems} / {progress.totalItems} 완료
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
                          onClick={() => {
                            setViewMode('list')
                            handleSelectChecklist(checklist)
                          }}
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


