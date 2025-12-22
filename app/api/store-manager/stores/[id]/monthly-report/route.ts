import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'store_manager') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    
    // RLS 정책 문제로 인해 attendance 조회 시 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let adminSupabase: ReturnType<typeof createClient> | null = null
    
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      console.log('[Monthly Report] 서비스 역할 키를 사용하여 attendance 테이블 조회 (RLS 우회)')
    } else {
      console.warn('[Monthly Report] 서비스 역할 키가 설정되지 않음. RLS 정책에 따라 attendance 조회가 실패할 수 있습니다.')
    }
    
    // attendance 테이블 조회용 클라이언트 (서비스 역할 키 우선 사용)
    const attendanceClient = adminSupabase || supabase
    
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    // 매장이 store_manager에게 배정되어 있는지 확인
    const { data: storeAssign, error: storeAssignError } = await supabase
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .maybeSingle()

    if (storeAssignError || !storeAssign) {
      return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 매장 정보 조회
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 월의 시작일과 종료일 계산 (로컬 시간 기준)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // 해당 월의 마지막 날
    
    // 로컬 날짜를 YYYY-MM-DD 형식으로 변환 (UTC 변환 방지)
    const formatLocalDate = (date: Date): string => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    
    const startDateStr = formatLocalDate(startDate)
    const endDateStr = formatLocalDate(endDate)
    
    console.log('[Monthly Report] Date calculation:', {
      year,
      month,
      startDateStr,
      endDateStr,
      startDateLocal: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
      endDateLocal: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    })

    console.log('[Monthly Report] Date range:', { startDateStr, endDateStr, year, month })

    // 1. 출근/관리 데이터 (일별) - 서비스 역할 키 사용하여 RLS 우회
    const { data: attendanceData, error: attendanceError } = await attendanceClient
      .from('attendance')
      .select('work_date, clock_in_at, clock_out_at')
      .eq('store_id', params.id)
      .gte('work_date', startDateStr)
      .lte('work_date', endDateStr)
      .order('work_date', { ascending: true })

    if (attendanceError) {
      console.error('[Monthly Report] Attendance fetch error:', attendanceError)
    }
    console.log('[Monthly Report] Attendance data count:', attendanceData?.length || 0)

    // 2. 체크리스트 데이터 (일별)
    const { data: checklistData } = await supabase
      .from('checklist')
      .select('id, items, work_date, created_at, updated_at')
      .eq('store_id', params.id)
      .gte('work_date', startDateStr)
      .lte('work_date', endDateStr)
      .order('work_date', { ascending: true })

    // 3. 문제 보고 데이터
    const { data: problemReports } = await supabase
      .from('problem_reports')
      .select('id, title, status, created_at')
      .eq('store_id', params.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    // 4. 분실물 데이터
    const { data: lostItems } = await supabase
      .from('lost_items')
      .select('id, type, status, created_at')
      .eq('store_id', params.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    // 5. 요청 데이터
    const { data: requests } = await supabase
      .from('requests')
      .select('id, title, status, created_at, completed_at, rejected_at')
      .eq('store_id', params.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    // 일별 통계 계산
    const dailyStats: {
      [date: string]: {
        date: string
        attendance_count: number
        attendance_completed: number
        checklist_count: number
        checklist_completed: number
        problem_count: number
        lost_item_count: number
        request_count: number
        request_completed: number
      }
    } = {}

    // 날짜별 초기화
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatLocalDate(d)
      dailyStats[dateStr] = {
        date: dateStr,
        attendance_count: 0,
        attendance_completed: 0,
        checklist_count: 0,
        checklist_completed: 0,
        problem_count: 0,
        lost_item_count: 0,
        request_count: 0,
        request_completed: 0,
      }
    }

    // 출근 데이터 집계
    if (attendanceData && attendanceData.length > 0) {
      attendanceData.forEach((att) => {
        const dateStr = att.work_date
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].attendance_count++
          // 퇴근 완료(clock_out_at이 있음) = 관리 완료
          if (att.clock_out_at) {
            dailyStats[dateStr].attendance_completed++
          }
        } else {
          console.warn('[Monthly Report] Attendance date not in range:', dateStr)
        }
      })
      console.log('[Monthly Report] Attendance aggregated:', {
        total: attendanceData.length,
        withClockOut: attendanceData.filter(a => a.clock_out_at).length
      })
    } else {
      console.log('[Monthly Report] No attendance data found')
    }

    // 체크리스트 데이터 집계
    if (checklistData) {
      checklistData.forEach((checklist) => {
        const dateStr = checklist.work_date
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].checklist_count++
          const items = checklist.items || []
          const totalItems = items.length
          const completedItems = items.filter((item: any) => 
            (item.type === 'photo' && item.before_photo_url && item.after_photo_url) ||
            (item.type === 'check' && item.checked)
          ).length
          if (totalItems > 0 && completedItems === totalItems) {
            dailyStats[dateStr].checklist_completed++
          }
        }
      })
    }

    // 문제 보고 집계
    if (problemReports) {
      problemReports.forEach((problem) => {
        const dateStr = problem.created_at.split('T')[0]
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].problem_count++
        }
      })
    }

    // 분실물 집계
    if (lostItems) {
      lostItems.forEach((item) => {
        const dateStr = item.created_at.split('T')[0]
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].lost_item_count++
        }
      })
    }

    // 요청 집계
    if (requests) {
      requests.forEach((request) => {
        const dateStr = request.created_at.split('T')[0]
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].request_count++
          if (request.status === 'completed' || request.completed_at) {
            dailyStats[dateStr].request_completed++
          }
        }
      })
    }

    // 주차별 통계 계산
    const weeklyStats: {
      [week: number]: {
        week: number
        attendance_count: number
        attendance_completed: number
        checklist_count: number
        checklist_completed: number
        problem_count: number
        request_count: number
        request_completed: number
      }
    } = {}

    Object.values(dailyStats).forEach((stat) => {
      const date = new Date(stat.date)
      const week = Math.ceil(date.getDate() / 7)
      if (!weeklyStats[week]) {
        weeklyStats[week] = {
          week,
          attendance_count: 0,
          attendance_completed: 0,
          checklist_count: 0,
          checklist_completed: 0,
          problem_count: 0,
          request_count: 0,
          request_completed: 0,
        }
      }
      weeklyStats[week].attendance_count += stat.attendance_count
      weeklyStats[week].attendance_completed += stat.attendance_completed
      weeklyStats[week].checklist_count += stat.checklist_count
      weeklyStats[week].checklist_completed += stat.checklist_completed
      weeklyStats[week].problem_count += stat.problem_count
      weeklyStats[week].request_count += stat.request_count
      weeklyStats[week].request_completed += stat.request_completed
    })

    // 전체 통계 계산
    const totalDays = Object.keys(dailyStats).length
    const totalAttendance = Object.values(dailyStats).reduce((sum, stat) => sum + stat.attendance_count, 0)
    const totalAttendanceCompleted = Object.values(dailyStats).reduce((sum, stat) => sum + stat.attendance_completed, 0)
    const totalChecklist = Object.values(dailyStats).reduce((sum, stat) => sum + stat.checklist_count, 0)
    const totalChecklistCompleted = Object.values(dailyStats).reduce((sum, stat) => sum + stat.checklist_completed, 0)
    const totalProblems = problemReports?.length || 0
    const totalLostItems = lostItems?.length || 0
    const totalRequests = requests?.length || 0
    const totalRequestsCompleted = requests?.filter(r => r.status === 'completed' || r.completed_at).length || 0
    
    // 관리일수: 퇴근 완료(관리 완료)가 있는 날짜 수
    const managementDays = Object.values(dailyStats).filter(stat => stat.attendance_completed > 0).length
    
    console.log('[Monthly Report] Summary stats:', {
      totalDays,
      totalAttendance,
      totalAttendanceCompleted,
      managementDays,
      managementCompletionRate: totalAttendance > 0 ? Math.round((totalAttendanceCompleted / totalAttendance) * 100) : 0
    })

    // 문제 유형별 통계 (title 기반으로 분류)
    const problemTypeStats: { [type: string]: number } = {}
    if (problemReports) {
      problemReports.forEach((problem) => {
        // title의 첫 부분을 유형으로 사용하거나, 전체를 카운트
        const type = problem.title || '기타'
        problemTypeStats[type] = (problemTypeStats[type] || 0) + 1
      })
    }

    // 요청 상태별 통계
    const requestStatusStats: { [status: string]: number } = {}
    if (requests) {
      requests.forEach((request) => {
        const status = request.status || 'received'
        requestStatusStats[status] = (requestStatusStats[status] || 0) + 1
      })
    }

    // 이전 달 데이터 조회 (전달대비 계산용)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1)
    const prevEndDate = new Date(prevYear, prevMonth, 0)
    const prevStartDateStr = formatLocalDate(prevStartDate)
    const prevEndDateStr = formatLocalDate(prevEndDate)

    // 이전 달 출근 데이터
    const { data: prevAttendanceData } = await attendanceClient
      .from('attendance')
      .select('work_date, clock_in_at, clock_out_at')
      .eq('store_id', params.id)
      .gte('work_date', prevStartDateStr)
      .lte('work_date', prevEndDateStr)

    // 이전 달 체크리스트 데이터
    const { data: prevChecklistData } = await supabase
      .from('checklist')
      .select('id, items, work_date')
      .eq('store_id', params.id)
      .gte('work_date', prevStartDateStr)
      .lte('work_date', prevEndDateStr)

    // 이전 달 문제 보고 데이터
    const { data: prevProblemReports } = await supabase
      .from('problem_reports')
      .select('id')
      .eq('store_id', params.id)
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    // 이전 달 요청 데이터
    const { data: prevRequests } = await supabase
      .from('requests')
      .select('id, status, completed_at')
      .eq('store_id', params.id)
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    // 이전 달 통계 계산
    const prevTotalAttendance = prevAttendanceData?.length || 0
    const prevTotalAttendanceCompleted = prevAttendanceData?.filter(a => a.clock_out_at).length || 0
    const prevManagementCompletionRate = prevTotalAttendance > 0 
      ? Math.round((prevTotalAttendanceCompleted / prevTotalAttendance) * 100) 
      : 0

    const prevTotalChecklist = prevChecklistData?.length || 0
    const prevTotalChecklistCompleted = prevChecklistData?.filter(c => {
      const items = c.items || []
      const totalItems = items.length
      const completedItems = items.filter((item: any) => 
        (item.type === 'photo' && item.before_photo_url && item.after_photo_url) ||
        (item.type === 'check' && item.checked)
      ).length
      return totalItems > 0 && completedItems === totalItems
    }).length || 0
    const prevChecklistCompletionRate = prevTotalChecklist > 0 
      ? Math.round((prevTotalChecklistCompleted / prevTotalChecklist) * 100) 
      : 0

    const prevTotalProblems = prevProblemReports?.length || 0
    const prevTotalRequests = prevRequests?.length || 0
    const prevTotalRequestsCompleted = prevRequests?.filter(r => r.status === 'completed' || r.completed_at).length || 0
    const prevRequestCompletionRate = prevTotalRequests > 0 
      ? Math.round((prevTotalRequestsCompleted / prevTotalRequests) * 100) 
      : 0

    // 전달대비 계산
    const currentManagementRate = totalAttendance > 0 ? Math.round((totalAttendanceCompleted / totalAttendance) * 100) : 0
    const currentChecklistRate = totalChecklist > 0 ? Math.round((totalChecklistCompleted / totalChecklist) * 100) : 0
    const currentRequestRate = totalRequests > 0 ? Math.round((totalRequestsCompleted / totalRequests) * 100) : 0

    const managementRateDiff = currentManagementRate - prevManagementCompletionRate
    const checklistRateDiff = currentChecklistRate - prevChecklistCompletionRate
    const problemDiff = totalProblems - prevTotalProblems
    const requestRateDiff = currentRequestRate - prevRequestCompletionRate

    // 유저 커버 계산 (요청 처리 완료율로 사용)
    const userCoverage = currentRequestRate
    const prevUserCoverage = prevRequestCompletionRate
    const userCoverageDiff = userCoverage - prevUserCoverage

    return NextResponse.json({
      data: {
        store_name: store.name,
        year,
        month,
        summary: {
          total_days: totalDays,
          management_completion_rate: currentManagementRate,
          checklist_completion_rate: currentChecklistRate,
          total_problems: totalProblems,
          total_lost_items: totalLostItems,
          total_requests: totalRequests,
          request_completion_rate: currentRequestRate,
          management_days: managementDays,
          // 전달대비 데이터
          prev_management_completion_rate: prevManagementCompletionRate,
          prev_checklist_completion_rate: prevChecklistCompletionRate,
          prev_total_problems: prevTotalProblems,
          prev_user_coverage: prevUserCoverage,
          management_rate_diff: managementRateDiff,
          checklist_rate_diff: checklistRateDiff,
          problem_diff: problemDiff,
          user_coverage_diff: userCoverageDiff,
        },
        daily_stats: Object.values(dailyStats),
        weekly_stats: Object.values(weeklyStats).sort((a, b) => a.week - b.week),
        problem_type_stats: problemTypeStats,
        request_status_stats: requestStatusStats,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/store-manager/stores/[id]/monthly-report:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

