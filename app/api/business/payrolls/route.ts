import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { encrypt } from '@/lib/utils/encryption'
import { createClient } from '@supabase/supabase-js'

// 인건비 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view payrolls')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const period = searchParams.get('period')

    // user_id가 null인 경우도 조회할 수 있도록 left join 사용
    let query = supabase
      .from('payrolls')
      .select(`
        *,
        users:user_id (
          id,
          name
        )
      `)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .order('pay_period', { ascending: false })
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (period) {
      query = query.eq('pay_period', period)
    }

    const { data: payrolls, error } = await query

    if (error) {
      throw new Error(`Failed to fetch payrolls: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: payrolls || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 인건비 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create payrolls')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { 
      user_id,           // 정규 직원인 경우
      worker_name,       // 일당 근로자인 경우
      resident_registration_number,  // 일당 근로자 주민등록번호 (평문)
      work_days,         // 일당 근로자 근무 일수
      daily_wage,        // 일당 근로자 일당 금액
      pay_period, 
      amount, 
      paid_at, 
      status, 
      memo 
    } = body

    // pay_period 형식 검증 (YYYY-MM)
    if (!pay_period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(pay_period)) {
      throw new Error('pay_period must be in YYYY-MM format')
    }

    const supabase = await createServerSupabaseClient()

    // 정규 직원 또는 일당 근로자 중 하나만 있어야 함
    if (user_id && worker_name) {
      throw new Error('Cannot specify both user_id and worker_name')
    }

    if (!user_id && !worker_name) {
      throw new Error('Either user_id (for regular employee) or worker_name (for daily worker) is required')
    }

    let payrollData: any = {
      company_id: user.company_id,
      pay_period,
      paid_at: paid_at || null,
      status: status || 'scheduled',
      memo: memo?.trim() || null,
    }

    // 정규 직원인 경우
    if (user_id) {
      if (!amount) {
        throw new Error('amount is required for regular employees')
      }

      // 직원이 회사에 속해있는지 확인
      const { data: targetUser } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('id', user_id)
        .eq('company_id', user.company_id)
        .single()

      if (!targetUser) {
        throw new ForbiddenError('User not found or access denied')
      }

      payrollData.user_id = user_id
      payrollData.amount = parseFloat(amount)
    } 
    // 일당 근로자인 경우
    else if (worker_name) {
      if (!work_days || !daily_wage) {
        throw new Error('work_days and daily_wage are required for daily workers')
      }

      if (!worker_name.trim()) {
        throw new Error('worker_name is required')
      }

      payrollData.worker_name = worker_name.trim()
      payrollData.work_days = parseInt(work_days)
      payrollData.daily_wage = parseFloat(daily_wage)
      payrollData.amount = parseFloat(daily_wage) * parseInt(work_days)

      // 주민등록번호 암호화 저장
      if (resident_registration_number) {
        try {
          // 하이픈 제거 후 암호화
          const cleaned = resident_registration_number.replace(/[-\s]/g, '')
          if (cleaned.length !== 13 || !/^\d{13}$/.test(cleaned)) {
            throw new Error('주민등록번호 형식이 올바르지 않습니다. (13자리 숫자)')
          }
          // 하이픈 추가 (YYYYMMDD-GXXXXXX 형식)
          const formatted = `${cleaned.substring(0, 6)}-${cleaned.substring(6)}`
          payrollData.resident_registration_number_encrypted = encrypt(formatted)
        } catch (error: any) {
          throw new Error(`주민등록번호 암호화 실패: ${error.message}`)
        }
      }
    }

    // Service role key를 사용하여 RLS 우회 (일당 근로자도 저장 가능하도록)
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

    const { data: payroll, error } = await adminSupabase
      .from('payrolls')
      .insert(payrollData)
      .select(`
        *,
        users:user_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to create payroll: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: payroll,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

