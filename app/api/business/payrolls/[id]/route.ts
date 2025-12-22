import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 인건비 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can update payrolls')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { 
      pay_period, 
      amount, 
      paid_at, 
      status, 
      memo,
      // 일당 근로자 필드
      worker_name,
      resident_registration_number,
      work_days,
      daily_wage
    } = body

    const supabase = await createServerSupabaseClient()

    // 인건비가 회사에 속해있는지 확인
    const { data: existingPayroll } = await supabase
      .from('payrolls')
      .select('id, company_id, user_id, worker_name')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingPayroll) {
      throw new ForbiddenError('Payroll not found or access denied')
    }

    const updateData: any = {}
    if (pay_period) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(pay_period)) {
        throw new Error('pay_period must be in YYYY-MM format')
      }
      updateData.pay_period = pay_period
    }
    if (paid_at !== undefined) updateData.paid_at = paid_at || null
    if (status) updateData.status = status
    if (memo !== undefined) updateData.memo = memo?.trim() || null

    // 정규 직원인 경우
    if (existingPayroll.user_id) {
      if (amount !== undefined) updateData.amount = parseFloat(amount)
    }
    // 일당 근로자인 경우
    else if (existingPayroll.worker_name) {
      if (worker_name !== undefined) updateData.worker_name = worker_name.trim()
      if (work_days !== undefined) {
        updateData.work_days = parseInt(work_days)
        // work_days가 변경되면 amount 재계산
        if (daily_wage !== undefined || existingPayroll.daily_wage) {
          const wage = daily_wage !== undefined ? parseFloat(daily_wage) : existingPayroll.daily_wage
          updateData.amount = wage * parseInt(work_days)
        }
      }
      if (daily_wage !== undefined) {
        updateData.daily_wage = parseFloat(daily_wage)
        // daily_wage가 변경되면 amount 재계산
        if (work_days !== undefined || existingPayroll.work_days) {
          const days = work_days !== undefined ? parseInt(work_days) : existingPayroll.work_days
          updateData.amount = parseFloat(daily_wage) * days
        }
      }
      
      // 주민등록번호 업데이트
      if (resident_registration_number !== undefined) {
        if (resident_registration_number) {
          try {
            const { encrypt } = await import('@/lib/utils/encryption')
            const cleaned = resident_registration_number.replace(/[-\s]/g, '')
            if (cleaned.length !== 13 || !/^\d{13}$/.test(cleaned)) {
              throw new Error('주민등록번호 형식이 올바르지 않습니다.')
            }
            const formatted = `${cleaned.substring(0, 6)}-${cleaned.substring(6)}`
            updateData.resident_registration_number_encrypted = encrypt(formatted)
          } catch (error: any) {
            throw new Error(`주민등록번호 암호화 실패: ${error.message}`)
          }
        } else {
          updateData.resident_registration_number_encrypted = null
        }
      }
    }

    const { data: payroll, error } = await supabase
      .from('payrolls')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        users:user_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update payroll: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: payroll,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 인건비 삭제 (Soft Delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can delete payrolls')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    // Service role key를 사용하여 RLS 우회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      throw new Error('Server configuration error')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Server configuration error')
    }

    const { createClient } = await import('@supabase/supabase-js')
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 인건비가 회사에 속해있는지 확인
    const { data: existingPayroll } = await adminSupabase
      .from('payrolls')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!existingPayroll) {
      throw new ForbiddenError('Payroll not found or access denied')
    }

    const { error } = await adminSupabase
      .from('payrolls')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to delete payroll: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

