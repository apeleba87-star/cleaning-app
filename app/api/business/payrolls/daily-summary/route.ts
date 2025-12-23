import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 일당 직원 출근 기록 기반 요약 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view daily payroll summary')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7) // YYYY-MM

    // pay_period 형식 검증
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      throw new Error('period must be in YYYY-MM format')
    }

    const supabase = await createServerSupabaseClient()

    // Service role key를 사용하여 RLS 우회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 일당 직원 조회 (pay_type='daily')
    const { data: dailyEmployees, error: employeesError } = await supabase
      .from('users')
      .select('id, name, pay_amount')
      .eq('company_id', user.company_id)
      .eq('employment_active', true)
      .eq('pay_type', 'daily')
      .order('name')

    if (employeesError) {
      throw new Error(`Failed to fetch daily employees: ${employeesError.message}`)
    }

    if (!dailyEmployees || dailyEmployees.length === 0) {
      return Response.json({
        success: true,
        data: [],
      })
    }

    // 기간 계산
    const [year, month] = period.split('-').map(Number)
    const startDate = `${period}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${period}-${String(lastDay).padStart(2, '0')}`

    // 각 일당 직원의 출근 기록 조회 및 계산
    const dailySummary = await Promise.all(
      dailyEmployees.map(async (employee) => {
        // 해당 기간의 출근 기록 조회
        const { data: attendances, error: attendanceError } = await adminSupabase
          .from('attendance')
          .select('id, work_date, clock_in_at, clock_out_at')
          .eq('user_id', employee.id)
          .gte('work_date', startDate)
          .lte('work_date', endDate)
          .not('clock_in_at', 'is', null)

        if (attendanceError) {
          console.error(`Error fetching attendance for ${employee.name}:`, attendanceError)
          return {
            id: employee.id,
            name: employee.name,
            pay_amount: employee.pay_amount,
            attendance_count: 0,
            calculated_amount: 0,
          }
        }

        const attendanceCount = attendances?.length || 0
        const dailyWage = employee.pay_amount || 0
        const calculatedAmount = attendanceCount * dailyWage

        return {
          id: employee.id,
          name: employee.name,
          pay_amount: employee.pay_amount,
          attendance_count: attendanceCount,
          calculated_amount: calculatedAmount,
        }
      })
    )

    // 일당 금액이 설정된 직원만 필터링
    const filteredSummary = dailySummary.filter((emp) => emp.pay_amount && emp.pay_amount > 0)

    return Response.json({
      success: true,
      data: filteredSummary,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



