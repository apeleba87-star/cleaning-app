import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 월별 도급 자동 생성 (사용자 관리의 급여일과 도급 금액 기준)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can generate subcontract payments')
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

    // 사용자 관리에 등록된 도급 사용자 조회 (급여일과 도급 금액이 있는 사용자만)
    const { data: subcontractUsers, error: usersError } = await adminSupabase
      .from('users')
      .select('id, name, role, salary_date, pay_amount, salary_amount, business_registration_number')
      .eq('company_id', user.company_id)
      .in('role', ['subcontract_individual', 'subcontract_company'])
      .eq('employment_active', true)
      .not('salary_date', 'is', null)

    if (usersError) {
      throw new Error(`Failed to fetch subcontract users: ${usersError.message}`)
    }

    if (!subcontractUsers || subcontractUsers.length === 0) {
      return Response.json({
        success: true,
        message: '생성할 도급 정산이 없습니다. (급여일이 설정된 도급 사용자가 없습니다.)',
        created: 0,
      })
    }

    // 각 사용자에 대해 subcontract와 payment 생성/조회
    const [year, month] = pay_period.split('-').map(Number)
    const createdPayments = []
    const errors = []

    for (const subcontractUser of subcontractUsers) {
      try {
        // 도급 금액 확인 (pay_amount 또는 salary_amount)
        const monthlyAmount = subcontractUser.pay_amount || subcontractUser.salary_amount || 0
        if (monthlyAmount <= 0) {
          continue // 도급 금액이 없으면 건너뜀
        }

        // 해당 사용자의 활성 도급(subcontract)이 있는지 확인 또는 생성
        let subcontractId: string
        const { data: existingSubcontract } = await adminSupabase
          .from('subcontracts')
          .select('id')
          .eq('company_id', user.company_id)
          .or(`worker_id.eq.${subcontractUser.id},worker_name.eq.${subcontractUser.name}`)
          .eq('status', 'active')
          .is('deleted_at', null)
          .maybeSingle()

        if (existingSubcontract) {
          subcontractId = existingSubcontract.id
        } else {
          // 도급이 없으면 자동 생성
          const taxRate = subcontractUser.role === 'subcontract_individual' ? 0.033 : 0
          const { data: newSubcontract, error: createError } = await adminSupabase
            .from('subcontracts')
            .insert({
              company_id: user.company_id,
              subcontract_type: subcontractUser.role === 'subcontract_individual' ? 'individual' : 'company',
              worker_id: subcontractUser.role === 'subcontract_individual' ? subcontractUser.id : null,
              worker_name: subcontractUser.name,
              monthly_amount: monthlyAmount,
              tax_rate: taxRate,
              contract_period_start: new Date().toISOString().slice(0, 10),
              status: 'active',
            })
            .select('id')
            .single()

          if (createError || !newSubcontract) {
            throw new Error(`도급 생성 실패: ${createError?.message || 'Unknown error'}`)
          }
          subcontractId = newSubcontract.id
        }

        // 이미 생성된 정산 확인
        const { data: existingPayment } = await adminSupabase
          .from('subcontract_payments')
          .select('id')
          .eq('subcontract_id', subcontractId)
          .eq('company_id', user.company_id)
          .eq('pay_period', pay_period)
          .is('deleted_at', null)
          .maybeSingle()

        if (existingPayment) {
          continue // 이미 생성된 정산은 건너뜀
        }

        // 정산 생성
        const taxRate = subcontractUser.role === 'subcontract_individual' ? 0.033 : 0
        const baseAmount = monthlyAmount
        const deductionAmount = baseAmount * taxRate
        const finalAmount = Math.floor(baseAmount * (1 - taxRate))

        const { data: payment, error: paymentError } = await adminSupabase
          .from('subcontract_payments')
          .insert({
            subcontract_id: subcontractId,
            company_id: user.company_id,
            pay_period: pay_period,
            amount: finalAmount,
            base_amount: baseAmount,
            deduction_amount: Math.floor(deductionAmount),
            status: 'scheduled',
            created_by: user.id,
          })
          .select()
          .single()

        if (paymentError) {
          throw new Error(paymentError.message)
        }

        createdPayments.push(payment)
      } catch (err: any) {
        errors.push(`${subcontractUser.name}: ${err.message}`)
      }
    }

    return Response.json({
      success: true,
      message: `${createdPayments.length}건의 도급 정산이 생성되었습니다.`,
      created: createdPayments.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

