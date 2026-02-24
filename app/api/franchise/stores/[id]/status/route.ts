import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { getTodayDateKST } from '@/lib/utils/date'

// 특정 매장의 상태만 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'franchise_manager') {
      throw new ForbiddenError('Only franchise managers can view store status')
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id, company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      throw new ForbiddenError('Franchise ID is required')
    }

    // 매장이 프렌차이즈에 속해있는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, address, management_days, franchise_id, company_id')
      .eq('id', params.id)
      .eq('franchise_id', userData.franchise_id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .single()

    if (storeError || !store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // 오늘 날짜 (한국 시간 기준)
    const todayDate = getTodayDateKST()
    const todayStart = new Date(`${todayDate}T00:00:00+09:00`)
    const todayEnd = new Date(`${todayDate}T23:59:59.999+09:00`)

    // 오늘 요일 확인 (한국 시간 기준)
    const now = new Date()
    const kstOffset = 9 * 60
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
    const koreaTime = new Date(utc + (kstOffset * 60 * 1000))
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[koreaTime.getDay()]

    // 오늘이 출근일인지 확인
    const isWorkDay = store.management_days
      ? store.management_days.split(',').map((d) => d.trim()).includes(todayDayName)
      : false

    // 오늘 출근 정보
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('clock_in_at, clock_out_at, user_id')
      .eq('store_id', params.id)
      .eq('work_date', todayDate)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 출근한 직원 정보 조회
    let staffName: string | null = null
    if (todayAttendance?.user_id) {
      const { data: staff } = await supabase
        .from('users')
        .select('name')
        .eq('id', todayAttendance.user_id)
        .single()
      staffName = staff?.name || null
    }

    // 오늘 문제보고
    const { data: todayIssues } = await supabase
      .from('issues')
      .select('id')
      .eq('store_id', params.id)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    // 오늘 제품 입고/보관제품 사진
    const { data: todayInventoryPhotos } = await supabase
      .from('cleaning_photos')
      .select('id')
      .eq('store_id', params.id)
      .eq('area_category', 'inventory')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    // 오늘 물품 요청 사항
    const { data: todaySupplyRequests } = await supabase
      .from('supply_requests')
      .select('id')
      .eq('store_id', params.id)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    // 오늘 체크리스트 수행률
    const { data: todayChecklists } = await supabase
      .from('checklist')
      .select('items, updated_at')
      .eq('store_id', params.id)
      .eq('work_date', todayDate)

    // 오늘 관리전후사진
    const { data: todayCleaningPhotos } = await supabase
      .from('cleaning_photos')
      .select('id, kind, created_at')
      .eq('store_id', params.id)
      .neq('area_category', 'inventory')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    const beforePhotos = todayCleaningPhotos?.filter((p: any) => p.kind === 'before') || []
    const afterPhotos = todayCleaningPhotos?.filter((p: any) => p.kind === 'after') || []

    // 오늘 처리중인 요청란
    const { data: todayRequests } = await supabase
      .from('requests')
      .select('id, title, created_at')
      .eq('store_id', params.id)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })

    // 체크리스트 진행률 계산
    let checklistCompletionRate = 0
    let checklistCompleted = 0
    let checklistTotal = 0
    let beforePhotoCompleted = 0
    let beforePhotoTotal = 0
    let afterPhotoCompleted = 0
    let afterPhotoTotal = 0

    if (todayChecklists && todayChecklists.length > 0) {
      todayChecklists.forEach((checklist: any) => {
        const items = checklist.items || []
        items.forEach((item: any) => {
          if (item.type === 'check') {
            checklistTotal++
            if (item.checked && (item.status === 'good' || (item.status === 'bad' && item.comment))) {
              checklistCompleted++
            }
          } else if (item.type === 'photo') {
            checklistTotal++
            beforePhotoTotal++
            afterPhotoTotal++
            if (item.before_photo_url) {
              beforePhotoCompleted++
            }
            if (item.after_photo_url) {
              afterPhotoCompleted++
            }
            if (item.before_photo_url && item.after_photo_url) {
              checklistCompleted++
            }
          }
        })
      })

      const totalCompleted = checklistCompleted + beforePhotoCompleted + afterPhotoCompleted
      const totalItems = checklistTotal + beforePhotoTotal + afterPhotoTotal
      checklistCompletionRate = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
    }

    // 마지막 업데이트 시간
    let lastUpdateTime: string | null = null
    const allUpdates = [
      todayAttendance?.clock_in_at,
      todayAttendance?.clock_out_at,
      todayChecklists?.[0]?.updated_at,
      todayCleaningPhotos?.[0]?.created_at,
    ].filter(Boolean)

    if (allUpdates.length > 0) {
      lastUpdateTime = allUpdates.sort().reverse()[0]
    }

    // 출근 상태 결정
    let attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
    let clockInTime: string | null = null
    let clockOutTime: string | null = null

    if (todayAttendance) {
      if (todayAttendance.clock_out_at) {
        attendanceStatus = 'clocked_out'
        clockOutTime = todayAttendance.clock_out_at
      } else {
        attendanceStatus = 'clocked_in'
      }
      clockInTime = todayAttendance.clock_in_at
    }

    // 최근 30일 문제보고 (매장 문제 보고, 자판기 내부 문제, 분실물)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const { data: problemReports } = await supabase
      .from('problem_reports')
      .select('id, category, status')
      .eq('store_id', params.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())

    const { data: lostItems } = await supabase
      .from('lost_items')
      .select('id, status')
      .eq('store_id', params.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())

    // 문제보고 카운트 (카테고리별, 상태별)
    const storeProblemCount = problemReports?.filter((p: any) => p.category === 'store_problem').length || 0
    const vendingProblemCount = problemReports?.filter((p: any) => p.category === 'vending_machine').length || 0
    const lostItemCount = lostItems?.length || 0

    // 미처리/처리 완료 카운트 (매장 문제 보고)
    const unprocessedStoreProblems = problemReports?.filter(
      (p: any) => p.category === 'store_problem' && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
    ).length || 0
    const completedStoreProblems = problemReports?.filter(
      (p: any) => p.category === 'store_problem' && p.status === 'completed'
    ).length || 0

    // 미확인/확인 카운트 (자판기 내부 문제, 분실물)
    const unconfirmedVendingProblems = problemReports?.filter(
      (p: any) => p.category === 'vending_machine' && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
    ).length || 0
    const confirmedVendingProblems = problemReports?.filter(
      (p: any) => p.category === 'vending_machine' && p.status === 'completed'
    ).length || 0

    const unconfirmedLostItems = lostItems?.filter(
      (l: any) => l.status === 'pending' || l.status === 'received' || l.status === 'submitted'
    ).length || 0
    const confirmedLostItems = lostItems?.filter(
      (l: any) => l.status === 'completed'
    ).length || 0

    // 오늘 제품 입고 사진 (product_receipt, order_sheet)
    const { data: todayProductInflow } = await supabase
      .from('inventory_photos')
      .select('id')
      .eq('store_id', params.id)
      .in('photo_type', ['product_receipt', 'order_sheet'])
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    // 최근 보관 사진 (store_storage, parcel_locker) - 최대 2개
    const { data: recentStoragePhotos } = await supabase
      .from('inventory_photos')
      .select('id')
      .eq('store_id', params.id)
      .in('photo_type', ['store_storage', 'parcel_locker'])
      .order('created_at', { ascending: false })
      .limit(2)

    // 최근 30일 요청란 (진행중, 완료)
    const { data: recentRequests } = await supabase
      .from('requests')
      .select('id, status')
      .eq('store_id', params.id)
      .in('status', ['in_progress', 'completed'])
      .gte('created_at', thirtyDaysAgo.toISOString())

    const inProgressRequestCount = recentRequests?.filter((r: any) => r.status === 'in_progress').length || 0
    const completedRequestCount = recentRequests?.filter((r: any) => r.status === 'completed').length || 0
    const unconfirmedCompletedCount = completedRequestCount

    const hasProblem = storeProblemCount > 0 || vendingProblemCount > 0 || lostItemCount > 0

    return Response.json({
      success: true,
      data: {
        store_id: params.id,
        store_name: store.name,
        store_address: store.address,
        management_days: store.management_days,
        work_day: store.management_days,
        is_work_day: isWorkDay,
        attendance_status: attendanceStatus,
        clock_in_time: clockInTime,
        clock_out_time: clockOutTime,
        staff_name: staffName,
        has_problem: hasProblem,
        store_problem_count: storeProblemCount,
        vending_problem_count: vendingProblemCount,
        lost_item_count: lostItemCount,
        unprocessed_store_problems: unprocessedStoreProblems,
        completed_store_problems: completedStoreProblems,
        unconfirmed_vending_problems: unconfirmedVendingProblems,
        confirmed_vending_problems: confirmedVendingProblems,
        unconfirmed_lost_items: unconfirmedLostItems,
        confirmed_lost_items: confirmedLostItems,
        has_product_inflow_today: (todayProductInflow?.length || 0) > 0,
        has_storage_photos: (recentStoragePhotos?.length || 0) > 0,
        in_progress_request_count: inProgressRequestCount,
        completed_request_count: completedRequestCount,
        unconfirmed_completed_request_count: unconfirmedCompletedCount,
        before_photo_count: beforePhotos.length,
        after_photo_count: afterPhotos.length,
        checklist_completion_rate: checklistCompletionRate,
        checklist_completed: checklistCompleted,
        checklist_total: checklistTotal,
        last_update_time: lastUpdateTime,
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



