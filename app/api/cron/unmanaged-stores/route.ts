import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getYesterdayDateKST, getTodayDateKST } from '@/lib/utils/date'
import { createClient } from '@supabase/supabase-js'

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
 * 미관리 매장 집계 Cron Job
 * - 다음날 00:00: 일반 매장 집계 (전날 00:00~23:59:59)
 * - 야간 매장은 제외
 * 
 * Vercel Cron Job 설정:
 * - Schedule: "0 0 * * *" (매일 자정 00:00 KST)
 * - Path: /api/cron/unmanaged-stores
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
    const currentMinute = kst.getMinutes()

    // 자정 00:00에만 실행 (정확히 00분에 실행)
    if (!(currentHour === 0 && currentMinute === 0)) {
      return NextResponse.json({
        success: true,
        message: `현재 시간(${currentHour}:${String(currentMinute).padStart(2, '0')})은 집계 시간이 아닙니다. (00:00에만 실행)`,
        skipped: true
      })
    }

    // Service Role Key를 사용하여 RLS 우회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const yesterday = getYesterdayDateKST()
    const yesterdayDayName = getYesterdayDayNameKST()
    const aggregatedAt = kst.toISOString()

    // 모든 회사 조회
    const { data: companies, error: companiesError } = await adminSupabase
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

    // 각 회사별로 집계 (일반 매장만)
    for (const company of companies) {
      try {
        // 일반 매장만 집계 (야간 매장 제외)
        const { data: stores, error: storesError } = await adminSupabase
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
        const workDayStores = stores.filter(store => 
          store.management_days && isWorkDay(store.management_days, yesterdayDayName)
        )
        
        if (workDayStores.length === 0) {
          continue
        }

        // 일반 매장: 어제 하루 종일 (00:00:00 ~ 23:59:59) 기준 출근 기록 조회
        const yesterdayStart = new Date(`${yesterday}T00:00:00+09:00`).toISOString()
        const yesterdayEnd = new Date(`${yesterday}T23:59:59+09:00`).toISOString()
        
        const { data: attendances } = await adminSupabase
          .from('attendance')
          .select('store_id')
          .in('store_id', workDayStores.map(s => s.id))
          .eq('work_date', yesterday)
          .gte('clock_in_at', yesterdayStart)
          .lte('clock_in_at', yesterdayEnd)

        const attendedStoreIds = new Set((attendances || []).map(a => a.store_id))
        const notAttendedStores = workDayStores.filter(s => !attendedStoreIds.has(s.id))
        const notAttendedStoreIds = notAttendedStores.map(s => s.id)

        // 집계 결과를 DB에 저장
        const { error: upsertError } = await adminSupabase
          .from('unmanaged_stores_summary')
          .upsert({
            company_id: company.id,
            report_date: yesterday,
            store_type: 'general',
            aggregated_at: aggregatedAt,
            total_stores: workDayStores.length,
            managed_count: attendedStoreIds.size,
            unmanaged_count: notAttendedStores.length,
            unmanaged_store_ids: notAttendedStoreIds,
            updated_at: aggregatedAt,
          }, {
            onConflict: 'company_id,report_date,store_type'
          })

        if (upsertError) {
          console.error(`Error upserting summary for company ${company.id}:`, upsertError)
        }

        results.push({
          company_id: company.id,
          company_name: company.name,
          store_type: 'general',
          total_stores: workDayStores.length,
          managed_count: attendedStoreIds.size,
          unmanaged_count: notAttendedStores.length,
        })

        console.log(`[${yesterday} 00:00] ${company.name}: 일반 매장 ${notAttendedStores.length}/${workDayStores.length} 미관리`)
      } catch (error) {
        console.error(`Error processing company ${company.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      report_date: yesterday,
      report_time: '00:00',
      store_type: 'general',
      processed_companies: results.length,
      results
    })
  } catch (error: any) {
    console.error('Error in GET /api/cron/unmanaged-stores:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
