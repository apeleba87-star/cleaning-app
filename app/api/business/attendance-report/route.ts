import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { getYesterdayDateKST, getTodayDateKST } from '@/lib/utils/date'

/**
 * 어제 날짜의 요일을 한국어로 반환합니다 (일, 월, 화, 수, 목, 금, 토)
 */
function getYesterdayDayNameKST(): string {
  const now = new Date()
  const kstOffset = 9 * 60 // 분 단위
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const kst = new Date(utc + (kstOffset * 60 * 1000))
  
  // 어제 날짜 계산
  kst.setDate(kst.getDate() - 1)
  
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[kst.getDay()]
}

/**
 * 매장의 근무일인지 확인합니다
 * management_days 형식: "월,수,금" 또는 "월수금"
 */
function isWorkDay(managementDays: string | null, dayName: string): boolean {
  if (!managementDays) return false
  
  // 쉼표로 분리 시도
  let days = managementDays.split(',').map(d => d.trim().replace(/\s+/g, ''))
  
  // 쉼표가 없으면 (예: "월수금") 각 요일을 분리
  if (days.length === 1 && days[0].length > 1) {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const text = days[0]
    days = []
    for (let i = 0; i < text.length; i++) {
      if (dayNames.includes(text[i])) {
        days.push(text[i])
      }
    }
  }
  
  return days.includes(dayName)
}

/**
 * 어제 미관리 매장 현황을 조회합니다.
 * - 저장된 집계 결과를 우선 조회
 * - 없으면 실시간 집계 수행
 * @param includeNightShift - 야간 매장 포함 여부 (기본값: false)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: '회사 정보가 없습니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const includeNightShift = searchParams.get('include_night_shift') === 'true'

    // 어제 날짜
    const yesterday = getYesterdayDateKST()
    const yesterdayDayName = getYesterdayDayNameKST()
    
    // 저장된 집계 결과 조회 (일반 매장만)
    const { data: generalSummary } = await supabase
      .from('unmanaged_stores_summary')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('report_date', yesterday)
      .eq('store_type', 'general')
      .single()

    // 저장된 집계 결과가 있으면 사용
    if (generalSummary) {
      // 매장 정보 조회 (일반 매장만)
      const storeIds = new Set<string>()
      if (generalSummary?.unmanaged_store_ids) {
        generalSummary.unmanaged_store_ids.forEach((id: string) => storeIds.add(id))
      }

      const { data: stores } = await supabase
        .from('stores')
        .select('id, name, is_night_shift')
        .in('id', Array.from(storeIds))
        .is('deleted_at', null)

      const storeMap = new Map((stores || []).map(s => [s.id, s]))

      // 일반 매장 전체 조회 (관리 완료 + 미관리)
      const allStoreIds = new Set<string>()
      if (generalSummary) {
        const { data: allGeneralStores } = await supabase
          .from('stores')
          .select('id, name, is_night_shift')
          .eq('company_id', user.company_id)
          .eq('is_night_shift', false)
          .is('deleted_at', null)
        
        if (allGeneralStores) {
          allGeneralStores.forEach(s => allStoreIds.add(s.id))
        }
      }

      const { data: allStores } = await supabase
        .from('stores')
        .select('id, name, is_night_shift')
        .in('id', Array.from(allStoreIds))
        .is('deleted_at', null)

      const allStoreMap = new Map((allStores || []).map(s => [s.id, s]))
      const unmanagedStoreIds = new Set<string>()
      
      if (generalSummary?.unmanaged_store_ids) {
        generalSummary.unmanaged_store_ids.forEach((id: string) => unmanagedStoreIds.add(id))
      }

      // 리포트 데이터 구성 (모든 매장 포함)
      const reportStores: any[] = Array.from(allStoreIds).map(storeId => {
        const store = allStoreMap.get(storeId)
        if (!store) return null
        
        return {
          store_id: store.id,
          store_name: store.name,
          is_night_shift: store.is_night_shift,
          has_attendance: !unmanagedStoreIds.has(store.id),
          is_not_counted: false,
          clock_in_at: null,
          user_id: null,
        }
      }).filter(Boolean) as any[]

      // 집계 시각 (다음날 00:00)
      const reportTime = '00:00'
      const aggregatedAt = generalSummary?.aggregated_at

      const totalStores = generalSummary?.total_stores || 0
      const managedCount = generalSummary?.managed_count || 0
      const unmanagedCount = generalSummary?.unmanaged_count || 0

      return NextResponse.json({
        success: true,
        data: {
          report_date: yesterday,
          report_time: reportTime,
          aggregated_at: aggregatedAt,
          is_morning_report: false,
          include_night_shift: false,
          total_stores: totalStores,
          attended_stores: managedCount,
          not_attended_stores: unmanagedCount,
          not_counted_stores: 0,
          total_night_stores: 0,
          stores: reportStores.sort((a, b) => a.store_name.localeCompare(b.store_name))
        }
      })
    }

    // 저장된 집계 결과가 없으면 실시간 집계 (폴백)
    // 현재 시간 확인
    const now = new Date()
    const kstOffset = 9 * 60
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
    const kst = new Date(utc + (kstOffset * 60 * 1000))
    const currentHour = kst.getHours()
    const isMorningReport = currentHour < 12 // 낮 12시 이전이면 오전 리포트

    // 회사에 속한 매장 조회 (근무일 정보 및 야간 근무 시간 포함)
    let storesQuery = supabase
      .from('stores')
      .select('id, name, is_night_shift, management_days, work_start_hour, work_end_hour')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    // 오전 리포트일 때는 야간 매장 제외하지 않음 (미집계로 표시하기 위해)
    // 오후 리포트일 때만 includeNightShift 파라미터에 따라 필터링
    if (!isMorningReport && !includeNightShift) {
      storesQuery = storesQuery.eq('is_night_shift', false)
    }

    const { data: stores, error: storesError } = await storesQuery

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json({ error: '매장 조회에 실패했습니다.' }, { status: 500 })
    }

    if (!stores || stores.length === 0) {
      console.log(`[Attendance Report] No stores found for company_id: ${user.company_id}`)
      return NextResponse.json({ 
        success: true, 
        data: {
          report_date: yesterday,
          report_time: isMorningReport ? '06:00' : '13:00',
          is_morning_report: isMorningReport,
          include_night_shift: includeNightShift,
          total_stores: 0,
          attended_stores: 0,
          not_attended_stores: 0,
          not_counted_stores: 0,
          total_night_stores: 0,
          stores: []
        }
      })
    }

    // 디버깅: 매장 정보 로그
    console.log(`[Attendance Report] Found ${stores.length} stores. Yesterday: ${yesterday} (${yesterdayDayName})`)
    stores.forEach(store => {
      console.log(`  - ${store.name}: management_days="${store.management_days}", is_night_shift=${store.is_night_shift}`)
    })

    // 어제 근무일인 매장만 필터링
    // management_days가 null이거나 빈 값인 경우는 리포트에서 제외 (관리일이 명확하지 않으므로)
    const workDayStores = stores.filter(store => {
      if (!store.management_days || store.management_days.trim() === '') {
        // management_days가 없으면 리포트에서 제외
        // 관리일이 설정되지 않은 매장은 관리 현황 리포트에 포함할 수 없음
        return false
      }
      return isWorkDay(store.management_days, yesterdayDayName)
    })
    
    console.log(`[Attendance Report] Total stores: ${stores.length}, Work day stores: ${workDayStores.length}, Yesterday day: ${yesterdayDayName}`)
    
    if (workDayStores.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: {
          report_date: yesterday,
          report_time: isMorningReport ? '06:00' : '13:00',
          is_morning_report: isMorningReport,
          include_night_shift: includeNightShift,
          total_stores: 0,
          attended_stores: 0,
          not_attended_stores: 0,
          not_counted_stores: 0,
          total_night_stores: 0,
          stores: []
        }
      })
    }

    const today = getTodayDateKST()
    const regularStoreIds: string[] = []
    const nightStores: Array<{ id: string; work_end_hour: number }> = []
    
    workDayStores.forEach(store => {
      if (store.is_night_shift) {
        nightStores.push({
          id: store.id,
          work_end_hour: store.work_end_hour ?? 8  // 기본값 8시 (하위 호환성)
        })
      } else {
        regularStoreIds.push(store.id)
      }
    })

    // 일반 매장: 어제 하루 종일 (00:00:00 ~ 23:59:59) 기준 출근 기록 조회
    const yesterdayStart = new Date(`${yesterday}T00:00:00+09:00`).toISOString()
    const yesterdayEnd = new Date(`${yesterday}T23:59:59+09:00`).toISOString()
    
    let regularAttendances: any[] = []
    if (regularStoreIds.length > 0) {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, store_id, user_id, clock_in_at, work_date')
        .in('store_id', regularStoreIds)
        .eq('work_date', yesterday)
        .gte('clock_in_at', yesterdayStart)
        .lte('clock_in_at', yesterdayEnd)
      
      if (error) {
        console.error('Error fetching regular attendances:', error)
      } else {
        regularAttendances = data || []
      }
    }

    // 야간 매장: 매장별 work_end_hour 기준으로 조회
    // 각 매장의 work_end_hour 이전 출근 기록 = yesterday 관리일
    let nightAttendances: any[] = []
    if (nightStores.length > 0 && !isMorningReport) {
      try {
        // 각 야간 매장별로 work_end_hour 기준으로 조회
        const nightAttendancesPromises = nightStores.map(async (nightStore) => {
          const endHour = nightStore.work_end_hour
          
          // yesterday 00:00 ~ today {endHour}:00 범위로 조회
          const yesterdayStartTime = new Date(`${yesterday}T00:00:00+09:00`).toISOString()
          const todayEndTime = new Date(`${today}T${String(endHour).padStart(2, '0')}:00:00+09:00`).toISOString()

          const { data, error } = await supabase
            .from('attendance')
            .select('id, store_id, user_id, clock_in_at, work_date')
            .eq('store_id', nightStore.id)
            .eq('work_date', yesterday) // work_date = yesterday만 조회
            .gte('clock_in_at', yesterdayStartTime)
            .lte('clock_in_at', todayEndTime)

          if (error) {
            console.error(`Error fetching night store attendance for ${nightStore.id}:`, error)
            return []
          }

          return data || []
        })

        const nightAttendancesResults = await Promise.all(nightAttendancesPromises)
        nightAttendances = nightAttendancesResults.flat()
      } catch (error) {
        console.error('Error fetching night store attendances:', error)
        // 에러가 발생해도 계속 진행 (빈 배열로 처리)
      }
    }

    const allAttendances = [...regularAttendances, ...nightAttendances]

    // 매장별 출근 여부 확인
    const attendedStoreIds = new Set(allAttendances.map(a => a.store_id))
    
    const reportData = workDayStores.map(store => {
      // 오전 리포트이고 야간 매장이면 미집계
      if (isMorningReport && store.is_night_shift) {
        return {
          store_id: store.id,
          store_name: store.name,
          is_night_shift: store.is_night_shift,
          has_attendance: false,
          is_not_counted: true, // 미집계 표시
          clock_in_at: null,
          user_id: null,
        }
      }

      const hasAttendance = attendedStoreIds.has(store.id)
      const attendance = allAttendances.find(a => a.store_id === store.id)
      
      return {
        store_id: store.id,
        store_name: store.name,
        is_night_shift: store.is_night_shift,
        has_attendance: hasAttendance,
        is_not_counted: false,
        clock_in_at: attendance?.clock_in_at || null,
        user_id: attendance?.user_id || null,
      }
    })

    const attendedCount = reportData.filter(s => s.has_attendance).length
    const notAttendedCount = reportData.filter(s => !s.has_attendance && !s.is_not_counted).length
    const notCountedCount = reportData.filter(s => s.is_not_counted).length
    // 야간 매장 총 개수 (집계 여부와 관계없이)
    const totalNightStores = reportData.filter(s => s.is_night_shift).length

    return NextResponse.json({
      success: true,
      data: {
        report_date: yesterday,
        report_time: isMorningReport ? '06:00' : '13:00',
        is_morning_report: isMorningReport,
        include_night_shift: includeNightShift,
        total_stores: reportData.length,
        attended_stores: attendedCount,
        not_attended_stores: notAttendedCount,
        not_counted_stores: notCountedCount,
        total_night_stores: totalNightStores, // 야간 매장 총 개수 추가
        stores: reportData.sort((a, b) => {
          // 미집계 매장을 가장 먼저 표시
          if (a.is_not_counted && !b.is_not_counted) return -1
          if (!a.is_not_counted && b.is_not_counted) return 1
          // 출근 안한 매장을 다음에 표시
          if (a.has_attendance && !b.has_attendance) return 1
          if (!a.has_attendance && b.has_attendance) return -1
          return a.store_name.localeCompare(b.store_name)
        })
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/attendance-report:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
