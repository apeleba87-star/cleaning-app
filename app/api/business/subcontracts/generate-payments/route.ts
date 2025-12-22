import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 월별 정산 자동 생성
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

    // 활성 도급 조회 (기존 subcontracts 테이블)
    const { data: activeSubcontracts, error: subcontractsError } = await adminSupabase
      .from('subcontracts')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    if (subcontractsError) {
      throw new Error(`Failed to fetch subcontracts: ${subcontractsError.message}`)
    }

    // 사용자 관리에 등록된 도급 사용자 조회
    const { data: subcontractUsers, error: usersError } = await adminSupabase
      .from('users')
      .select('id, name, role, salary_date, pay_amount, business_registration_number')
      .eq('company_id', user.company_id)
      .in('role', ['subcontract_individual', 'subcontract_company'])
      .eq('employment_active', true)
      .is('deleted_at', null)

    if (usersError) {
      console.error('Error fetching subcontract users:', usersError)
    }

    // 사용자 기반 도급을 subcontracts 테이블에 자동 생성/조회
    const userBasedSubcontracts = []
    for (const subcontractUser of (subcontractUsers || [])) {
      // 해당 사용자의 활성 도급이 있는지 확인
      const { data: existingSubcontract } = await adminSupabase
        .from('subcontracts')
        .select('*')
        .eq('company_id', user.company_id)
        .or(`worker_id.eq.${subcontractUser.id},worker_name.eq.${subcontractUser.name}`)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle()

      if (!existingSubcontract) {
        // 도급이 없으면 자동 생성
        const monthlyAmount = subcontractUser.pay_amount || 0
        if (monthlyAmount > 0) {
          const taxRate = subcontractUser.role === 'subcontract_individual' ? 0.033 : 0
          const { data: newSubcontract, error: createError } = await adminSupabase
            .from('subcontracts')
            .insert({
              company_id: user.company_id,
              subcontract_type: subcontractUser.role === 'subcontract_individual' ? 'individual' : 'company',
              worker_id: subcontractUser.role === 'subcontract_individual' ? subcontractUser.id : null,
              worker_name: subcontractUser.role === 'subcontract_individual' ? subcontractUser.name : subcontractUser.name,
              monthly_amount: monthlyAmount,
              tax_rate: taxRate,
              contract_period_start: new Date().toISOString().slice(0, 10),
              status: 'active',
            })
            .select()
            .single()

          if (!createError && newSubcontract) {
            userBasedSubcontracts.push(newSubcontract)
          }
        }
      } else {
        userBasedSubcontracts.push(existingSubcontract)
      }
    }

    // 기존 도급과 사용자 기반 도급 합치기
    const allSubcontracts = [...(activeSubcontracts || []), ...userBasedSubcontracts]
    
    // 중복 제거 (같은 worker_id 또는 worker_name이 있는 경우)
    const uniqueSubcontracts = allSubcontracts.filter((sub, index, self) =>
      index === self.findIndex((s) => {
        if (sub.subcontract_type === 'individual') {
          return (s.worker_id === sub.worker_id && sub.worker_id) || 
                 (s.worker_name === sub.worker_name && sub.worker_name && !sub.worker_id)
        } else {
          return s.subcontractor_id === sub.subcontractor_id && sub.subcontractor_id
        }
      })
    )

    if (uniqueSubcontracts.length === 0) {
      return Response.json({
        success: true,
        message: '생성할 도급 정산이 없습니다.',
        created: 0,
      })
    }

    // 기간 검증 (계약 기간 내인지 확인)
    const [year, month] = pay_period.split('-').map(Number)
    const periodDate = new Date(year, month - 1, 1)

    const validSubcontracts = uniqueSubcontracts.filter((sub) => {
      const startDate = new Date(sub.contract_period_start)
      if (sub.contract_period_end) {
        const endDate = new Date(sub.contract_period_end)
        return periodDate >= startDate && periodDate <= endDate
      }
      return periodDate >= startDate
    })

    // 이미 생성된 정산 확인
    const { data: existingPayments } = await adminSupabase
      .from('subcontract_payments')
      .select('subcontract_id, pay_period')
      .eq('company_id', user.company_id)
      .eq('pay_period', pay_period)
      .is('deleted_at', null)

    const existingKeys = new Set(
      existingPayments?.map((p) => `${p.subcontract_id}_${p.pay_period}`) || []
    )

    // 각 도급에 대해 정산 생성
    const createdPayments = []
    const errors = []

    for (const subcontract of validSubcontracts) {
      try {
        const key = `${subcontract.id}_${pay_period}`
        if (existingKeys.has(key)) {
          continue // 이미 생성된 정산은 건너뜀
        }

        const baseAmount = subcontract.monthly_amount
        const deductionAmount = baseAmount * subcontract.tax_rate
        const finalAmount = Math.floor(baseAmount * (1 - subcontract.tax_rate))

        const { data: payment, error: paymentError } = await adminSupabase
          .from('subcontract_payments')
          .insert({
            subcontract_id: subcontract.id,
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
        const name = subcontract.subcontract_type === 'company'
          ? `업체: ${subcontract.subcontractor_id}`
          : `개인: ${subcontract.worker_name || '이름 없음'}`
        errors.push(`${name}: ${err.message}`)
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

