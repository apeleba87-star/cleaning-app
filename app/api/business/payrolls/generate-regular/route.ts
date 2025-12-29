import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'
import { adjustPaymentDayToLastDay } from '@/lib/utils/date'

// 정규 직원 인건비 자동 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can generate payrolls')
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
    if (!serviceRoleKey) {
      throw new Error('Server configuration error')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Server configuration error')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 근무중인 직원 조회 (role='staff', employment_active=true, is_active=true, pay_amount가 있는 경우만)
    const { data: activeStaff, error: staffError } = await adminSupabase
      .from('users')
      .select('id, name, pay_amount, pay_type, salary_date')
      .eq('company_id', user.company_id)
      .eq('role', 'staff')
      .eq('employment_active', true)
      .eq('is_active', true)
      .not('pay_amount', 'is', null)

    if (staffError) {
      throw new Error(`Failed to fetch active staff: ${staffError.message}`)
    }

    if (!activeStaff || activeStaff.length === 0) {
      return Response.json({
        success: true,
        count: 0,
        message: '근무중인 직원이 없거나 급여 정보가 설정되지 않은 직원이 없습니다.',
      })
    }

    // 이미 해당 기간에 인건비가 있는 직원 조회
    const { data: existingPayrolls, error: existingError } = await adminSupabase
      .from('payrolls')
      .select('user_id')
      .eq('company_id', user.company_id)
      .eq('pay_period', pay_period)
      .not('user_id', 'is', null)
      .is('deleted_at', null)

    if (existingError) {
      throw new Error(`Failed to fetch existing payrolls: ${existingError.message}`)
    }

    const existingUserIds = new Set((existingPayrolls || []).map(p => p.user_id))

    // 인건비가 없는 직원만 필터링
    const staffToCreate = activeStaff.filter(s => !existingUserIds.has(s.id))

    if (staffToCreate.length === 0) {
      return Response.json({
        success: true,
        count: 0,
        message: '이미 모든 근무중인 직원의 인건비가 생성되어 있습니다.',
      })
    }

    // 인건비 생성 (급여일을 지급일로 설정)
    const [year, month] = pay_period.split('-')
    const payrollsToInsert = staffToCreate.map(staff => {
      // 급여일이 있으면 해당 기간의 지급일 계산 (예: salary_date=10, pay_period=2025-12 → 2025-12-10)
      // 말일 조정 적용
      let paidAt: string | null = null
      if (staff.salary_date && staff.salary_date >= 1 && staff.salary_date <= 31) {
        // 말일로 조정된 급여일 계산
        const payDay = adjustPaymentDayToLastDay(parseInt(year), parseInt(month), staff.salary_date)
        paidAt = `${year}-${month.padStart(2, '0')}-${String(payDay).padStart(2, '0')}`
      }
      
      return {
        company_id: user.company_id,
        user_id: staff.id,
        pay_period,
        amount: staff.pay_amount || 0,
        status: 'scheduled',
        paid_at: paidAt,
        memo: null,
      }
    })

    const { data: createdPayrolls, error: insertError } = await adminSupabase
      .from('payrolls')
      .insert(payrollsToInsert)
      .select()

    if (insertError) {
      throw new Error(`Failed to create payrolls: ${insertError.message}`)
    }

    return Response.json({
      success: true,
      count: createdPayrolls?.length || 0,
      message: `${createdPayrolls?.length || 0}명의 직원 인건비가 생성되었습니다.`,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

