import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { getTodayDateKST } from '@/lib/utils/date'

// PATCH: 스태프가 배정된 체크리스트를 수행 완료 (전후 사진, 비고 포함)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'staff') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { items, before_photo_url, after_photo_url, note } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items는 필수입니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // 배정된 체크리스트인지 확인
    // assigned_user_id가 본인이거나, 또는 assigned_user_id가 null이면서 본인이 배정받은 매장의 체크리스트인 경우
    const { data: checklist, error: checklistError } = await supabase
      .from('checklist')
      .select('id, assigned_user_id, store_id')
      .eq('id', params.id)
      .single()

    if (checklistError || !checklist) {
      console.error('Checklist fetch error:', checklistError)
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 직접 배정된 경우
    const isDirectlyAssigned = checklist.assigned_user_id === user.id
    
    // assigned_user_id가 null이면서 본인이 배정받은 매장의 체크리스트인지 확인
    let isStoreAssigned = false
    if (!checklist.assigned_user_id) {
      const { data: storeAssign, error: assignError } = await supabase
        .from('store_assign')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', checklist.store_id)
        .maybeSingle()
      
      if (!assignError && storeAssign) {
        isStoreAssigned = true
      }
    }

    if (!isDirectlyAssigned && !isStoreAssigned) {
      return NextResponse.json({ error: '배정된 체크리스트만 완료할 수 있습니다.' }, { status: 403 })
    }

    // work_date는 출근 시 이미 설정되었으므로 변경하지 않음
    // 직원은 출근한 날에만 체크리스트를 수행할 수 있음
    const today = getTodayDateKST() // 한국 시간 기준 오늘 날짜
    
    // 체크리스트의 work_date가 오늘인지 확인
    const { data: checklistCheck, error: checkError } = await supabase
      .from('checklist')
      .select('work_date')
      .eq('id', params.id)
      .single()

    if (checkError || !checklistCheck) {
      return NextResponse.json({ error: '체크리스트를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (checklistCheck.work_date !== today) {
      return NextResponse.json({ error: '출근한 날에만 체크리스트를 수행할 수 있습니다.' }, { status: 403 })
    }

    // 체크리스트 완료 여부 확인
    let isCompleted = false
    if (Array.isArray(items) && items.length > 0) {
      let totalItems = 0
      let completedItems = 0

      items.forEach((item: any) => {
        // area가 없는 항목은 제외
        if (!item.area || !item.area.trim()) {
          return
        }

        const itemType = item.type || 'check'

        if (itemType === 'check') {
          // 체크 항목: 체크만 되면 완료
          totalItems++
          if (item.checked) {
            completedItems++
          }
        } else if (itemType === 'before_photo') {
          // 관리 전 사진: before_photo_url만 확인
          totalItems++
          if (item.before_photo_url) {
            completedItems++
          }
        } else if (itemType === 'after_photo') {
          // 관리 후 사진: after_photo_url만 확인
          totalItems++
          if (item.after_photo_url) {
            completedItems++
          }
        } else if (itemType === 'before_after_photo') {
          // 관리 전/후 사진: 둘 다 완료되어야 함
          totalItems += 2
          if (item.before_photo_url) {
            completedItems++
          }
          if (item.after_photo_url) {
            completedItems++
          }
        }
      })

      // 모든 항목이 완료되었으면 완료 처리
      isCompleted = totalItems > 0 && completedItems === totalItems
    }

    const updateData: any = {
      items,
      before_photo_url: before_photo_url || null,
      after_photo_url: after_photo_url || null,
      note: note || null,
      // work_date는 변경하지 않음 (이미 출근 날짜로 설정됨)
      review_status: 'pending', // 검토 대기
      // updated_at은 데이터베이스 트리거가 자동으로 현재 시간(UTC)으로 업데이트함
    }

    // 완료되었으면 completed_at 설정
    if (isCompleted) {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('checklist')
      .update(updateData)
      .eq('id', params.id)

    if (error) {
      console.error('Error updating checklist:', error)
      return NextResponse.json({ error: '체크리스트 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PATCH /api/staff/checklists/[id]:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

