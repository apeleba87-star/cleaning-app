import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'store_manager') {
      throw new ForbiddenError('Only store managers can view attendance data')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const storeIdsParam = searchParams.get('store_ids')

    if (!startDate || !endDate || !storeIdsParam) {
      return Response.json({
        success: false,
        error: 'start_date, end_date, and store_ids are required',
        data: [],
      }, { status: 400 })
    }

    const storeIds = storeIdsParam.split(',').filter(id => id.trim())

    if (storeIds.length === 0) {
      return Response.json({
        success: true,
        data: [],
      })
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
    }
    
    const attendanceClient = adminSupabase || supabase

    // 매장 정보 조회
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .in('id', storeIds)
      .is('deleted_at', null)

    if (!stores || stores.length === 0) {
      return Response.json({
        success: true,
        data: [],
      })
    }

    // 출근 데이터 조회
    const { data: attendances, error: attendanceError } = await attendanceClient
      .from('attendance')
      .select('work_date, store_id')
      .in('store_id', storeIds)
      .gte('work_date', startDate)
      .lte('work_date', endDate)

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
      return Response.json({
        success: false,
        error: attendanceError.message,
        data: [],
      }, { status: 500 })
    }

    // 날짜별, 매장별로 그룹화
    const attendanceMap = new Map<string, Map<string, number>>()

    attendances?.forEach((attendance) => {
      const date = attendance.work_date
      const storeId = attendance.store_id

      if (!attendanceMap.has(date)) {
        attendanceMap.set(date, new Map())
      }

      const dateMap = attendanceMap.get(date)!
      const currentCount = dateMap.get(storeId) || 0
      dateMap.set(storeId, currentCount + 1)
    })

    // 결과 배열 생성
    const result: Array<{ date: string; store_id: string; store_name: string; attendance_count: number }> = []

    attendanceMap.forEach((dateMap, date) => {
      dateMap.forEach((count, storeId) => {
        const store = stores.find(s => s.id === storeId)
        if (store) {
          result.push({
            date,
            store_id: storeId,
            store_name: store.name,
            attendance_count: count,
          })
        }
      })
    })

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

