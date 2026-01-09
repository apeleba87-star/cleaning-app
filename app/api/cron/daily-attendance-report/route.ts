import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
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
 * 통합된 출근 현황 리포트 Cron Job
 * - 오전 6시: 일반 매장(야간 매장 제외) 리포트 생성
 * - 오후 1시: 모든 매장(일반+야간) 리포트 생성
 * 
 * Vercel Cron Job 설정:
 * - Schedule: "0 6,13 * * *" (매일 오전 6시와 오후 1시 KST)
 * - Path: /api/cron/daily-attendance-report
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron Job 인증 확인
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 현재 시간 확인 (KST)
    const now = new Date()
    const kstOffset = 9 * 60 // 분 단위
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
    const kst = new Date(utc + (kstOffset * 60 * 1000))
    const currentHour = kst.getHours()

    // 오전 6시와 오후 1시에만 실행
    if (currentHour !== 6 && currentHour !== 13) {
      return NextResponse.json({
        success: true,
        message: `현재 시간(${currentHour}시)은 리포트 생성 시간이 아닙니다. (6시 또는 13시에만 실행)`,
        skipped: true
      })
    }

    const supabase = await createServerSupabaseClient()
    const yesterday = getYesterdayDateKST()
    const yesterdayDayName = getYesterdayDayNameKST()
    const isMorningReport = currentHour === 6

    // 모든 회사 조회
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .is('deleted_at', null)

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: '회사 조회에 실패했습니다.' }, { status: 500 })
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '처리할 회사가 없습니다.',
        processed_companies: 0
      })
    }

    const results = []

    // 각 회사별로 리포트 생성
    for (const company of companies) {
      try {
        if (isMorningReport) {
          // 오전 6시: 일반 매장만 조회 (야간 매장 제외)
          const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, name, management_days')
            .eq('company_id', company.id)
            .eq('is_night_shift', false)
            .is('deleted_at', null)

          if (storesError) {
            console.error(`Error fetching stores for company ${company.id}:`, storesError)
            continue
          }

          if (!stores || stores.length === 0) {
            continue
          }

          // 어제 근무일인 매장만 필터링
          const workDayStores = stores.filter(store => isWorkDay(store.management_days, yesterdayDayName))
          
          if (workDayStores.length === 0) {
            continue
          }

          // 일반 매장: 어제 하루 종일 (00:00:00 ~ 23:59:59) 기준 출근 기록 조회
          const yesterdayStart = new Date(`${yesterday}T00:00:00+09:00`).toISOString()
          const yesterdayEnd = new Date(`${yesterday}T23:59:59+09:00`).toISOString()
          
          const { data: attendances } = await supabase
            .from('attendance')
            .select('store_id')
            .in('store_id', workDayStores.map(s => s.id))
            .eq('work_date', yesterday)
            .gte('clock_in_at', yesterdayStart)
            .lte('clock_in_at', yesterdayEnd)

          const attendedStoreIds = new Set((attendances || []).map(a => a.store_id))
          const notAttendedStores = workDayStores.filter(s => !attendedStoreIds.has(s.id))

          results.push({
            company_id: company.id,
            company_name: company.name,
            total_stores: workDayStores.length,
            attended_stores: attendedStoreIds.size,
            not_attended_stores: notAttendedStores.length,
            not_attended_store_names: notAttendedStores.map(s => s.name)
          })

          console.log(`[${yesterday} 06:00] ${company.name}: ${notAttendedStores.length}/${workDayStores.length} 매장 미관리`)
        } else {
          // 오후 1시: 모든 매장 조회 (일반+야간)
          const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, name, is_night_shift, management_days, work_start_hour, work_end_hour')
            .eq('company_id', company.id)
            .is('deleted_at', null)

          if (storesError) {
            console.error(`Error fetching stores for company ${company.id}:`, storesError)
            continue
          }

          if (!stores || stores.length === 0) {
            continue
          }

          // 어제 근무일인 매장만 필터링
          const workDayStores = stores.filter(store => isWorkDay(store.management_days, yesterdayDayName))
          
          if (workDayStores.length === 0) {
            continue
          }

          const today = getTodayDateKST()
          const regularStores = workDayStores.filter(s => !s.is_night_shift)
          const nightStores = workDayStores.filter(s => s.is_night_shift)

          // 일반 매장: 어제 하루 종일 (00:00:00 ~ 23:59:59) 기준 출근 기록 조회
          const yesterdayStart = new Date(`${yesterday}T00:00:00+09:00`).toISOString()
          const yesterdayEnd = new Date(`${yesterday}T23:59:59+09:00`).toISOString()
          
          let regularAttendances: any[] = []
          if (regularStores.length > 0) {
            const { data } = await supabase
              .from('attendance')
              .select('store_id')
              .in('store_id', regularStores.map(s => s.id))
              .eq('work_date', yesterday)
              .gte('clock_in_at', yesterdayStart)
              .lte('clock_in_at', yesterdayEnd)
            regularAttendances = data || []
          }

          // 야간 매장: work_end_hour 경계 사용 - work_date = yesterday 기준으로 조회
          // 각 매장의 work_end_hour에 따라 동적으로 조회
          let nightAttendances: any[] = []
          if (nightStores.length > 0) {
            // work_end_hour별로 그룹화
            const storesByEndHour = new Map<number, typeof nightStores>()
            nightStores.forEach(store => {
              const endHour = store.work_end_hour ?? 9 // 기본값 9 (하위 호환성)
              if (!storesByEndHour.has(endHour)) {
                storesByEndHour.set(endHour, [])
              }
              storesByEndHour.get(endHour)!.push(store)
            })

            // 각 work_end_hour별로 조회
            for (const [endHour, stores] of Array.from(storesByEndHour.entries())) {
              const yesterdayStartTime = new Date(`${yesterday}T00:00:00+09:00`).toISOString()
              const todayEndTime = new Date(`${today}T${String(endHour).padStart(2, '0')}:00:00+09:00`).toISOString()

              const { data } = await supabase
                .from('attendance')
                .select('store_id')
                .in('store_id', stores.map(s => s.id))
                .eq('work_date', yesterday) // work_date = yesterday만 조회
                .gte('clock_in_at', yesterdayStartTime)
                .lte('clock_in_at', todayEndTime)

              if (data) {
                nightAttendances.push(...data)
              }
            }
          }

          const allAttendances = [...regularAttendances, ...nightAttendances]
          const attendedStoreIds = new Set(allAttendances.map(a => a.store_id))
          const notAttendedStores = workDayStores.filter(s => !attendedStoreIds.has(s.id))
          
          const notAttendedRegular = notAttendedStores.filter(s => !s.is_night_shift)
          const notAttendedNight = notAttendedStores.filter(s => s.is_night_shift)

          results.push({
            company_id: company.id,
            company_name: company.name,
            total_stores: workDayStores.length,
            regular_stores: regularStores.length,
            night_stores: nightStores.length,
            attended_stores: attendedStoreIds.size,
            not_attended_stores: notAttendedStores.length,
            not_attended_regular: notAttendedRegular.length,
            not_attended_night: notAttendedNight.length,
            not_attended_store_names: notAttendedStores.map(s => s.name)
          })

          console.log(`[${yesterday} 13:00] ${company.name}: 일반 ${notAttendedRegular.length}/${regularStores.length}, 야간 ${notAttendedNight.length}/${nightStores.length} 매장 미관리`)
        }
      } catch (error) {
        console.error(`Error processing company ${company.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      report_date: yesterday,
      report_time: isMorningReport ? '06:00' : '13:00',
      is_morning_report: isMorningReport,
      include_night_shift: !isMorningReport,
      processed_companies: results.length,
      results
    })
  } catch (error: any) {
    console.error('Error in GET /api/cron/daily-attendance-report:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
