import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 일당 인건비 자동 생성 (출근 기록 기반)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can generate daily payrolls')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { pay_period } = body

    // pay_period 형식 검증 (YYYY-MM)
    if (!pay_period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(pay_period)) {
      throw new Error('pay_period must be in YYYY-MM format')
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

    // 일당 직원 조회
    const { data: dailyEmployees, error: employeesError } = await supabase
      .from('users')
      .select('id, name, pay_amount')
      .eq('company_id', user.company_id)
      .eq('employment_active', true)
      .eq('pay_type', 'daily')
      .not('pay_amount', 'is', null)

    if (employeesError) {
      throw new Error(`Failed to fetch daily employees: ${employeesError.message}`)
    }

    if (!dailyEmployees || dailyEmployees.length === 0) {
      return Response.json({
        success: true,
        message: '일당 직원이 없습니다.',
        created: 0,
      })
    }

    // 기간 계산
    const [year, month] = pay_period.split('-').map(Number)
    const startDate = `${pay_period}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${pay_period}-${String(lastDay).padStart(2, '0')}`

    // 이미 생성된 인건비 확인 (중복 방지)
    const { data: existingPayrolls } = await supabase
      .from('payrolls')
      .select('id, worker_name, pay_period')
      .eq('company_id', user.company_id)
      .eq('pay_period', pay_period)
      .is('user_id', null) // 일당 근로자는 user_id가 null

    const existingNames = new Set(
      existingPayrolls?.map((p) => `${p.worker_name}_${p.pay_period}`) || []
    )

    // 각 일당 직원의 출근 기록 조회 및 인건비 생성
    const createdPayrolls = []
    const errors = []

    for (const employee of dailyEmployees) {
      try {
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
          errors.push(`${employee.name}: 출근 기록 조회 실패`)
          continue
        }

        const attendanceCount = attendances?.length || 0

        if (attendanceCount === 0) {
          continue // 출근 기록이 없으면 건너뜀
        }

        // 중복 확인
        const key = `${employee.name}_${pay_period}`
        if (existingNames.has(key)) {
          continue // 이미 생성된 인건비는 건너뜀
        }

        const dailyWage = employee.pay_amount || 0
        const totalAmount = attendanceCount * dailyWage

        // 인건비 생성
        const { data: payroll, error: payrollError } = await adminSupabase
          .from('payrolls')
          .insert({
            company_id: user.company_id,
            user_id: null, // 일당 근로자는 user_id가 null
            worker_name: employee.name,
            work_days: attendanceCount,
            daily_wage: dailyWage,
            amount: totalAmount,
            pay_period: pay_period,
            status: 'scheduled',
            created_by: user.id,
          })
          .select()
          .single()

        if (payrollError) {
          console.error(`Error creating payroll for ${employee.name}:`, payrollError)
          errors.push(`${employee.name}: 인건비 생성 실패`)
          continue
        }

        createdPayrolls.push(payroll)
      } catch (err: any) {
        console.error(`Error processing ${employee.name}:`, err)
        errors.push(`${employee.name}: ${err.message}`)
      }
    }

    return Response.json({
      success: true,
      message: `${createdPayrolls.length}건의 일당 인건비가 생성되었습니다.`,
      created: createdPayrolls.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



