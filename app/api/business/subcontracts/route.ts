import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 도급 목록 조회 및 생성
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view subcontracts')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const type = searchParams.get('type') // 'company' | 'individual' | null (전체)

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

    let query = adminSupabase
      .from('subcontracts')
      .select(`
        *,
        subcontractor:subcontractor_id (
          id,
          name
        ),
        worker:worker_id (
          id,
          name
        )
      `)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    // 타입 필터링
    if (type && (type === 'company' || type === 'individual')) {
      query = query.eq('subcontract_type', type)
    }

    // 상태 필터링 (활성 도급만)
    query = query.eq('status', 'active')

    const { data: subcontracts, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch subcontracts: ${error.message}`)
    }

    // 기간별 필터링이 필요한 경우 (정산 내역 조회)
    let payments = null
    if (period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      const { data: periodPayments, error: paymentsError } = await adminSupabase
        .from('subcontract_payments')
        .select(`
          *,
          subcontract:subcontract_id (
            id,
            subcontract_type,
            worker_name,
            subcontractor:subcontractor_id (
              id,
              name
            ),
            worker:worker_id (
              id,
              name
            )
          )
        `)
        .eq('company_id', user.company_id)
        .eq('pay_period', period)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (!paymentsError) {
        payments = periodPayments
      }
    }

    return Response.json({
      success: true,
      data: {
        subcontracts: subcontracts || [],
        payments: payments || [],
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 도급 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create subcontracts')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const {
      subcontract_type,
      subcontractor_id,
      worker_id,
      worker_name,
      resident_registration_number,
      bank_name,
      account_number,
      contract_period_start,
      contract_period_end,
      monthly_amount,
      tax_rate,
      memo,
    } = body

    // 필수 필드 검증
    if (!subcontract_type || (subcontract_type !== 'company' && subcontract_type !== 'individual')) {
      throw new Error('subcontract_type must be "company" or "individual"')
    }

    if (subcontract_type === 'company' && !subcontractor_id) {
      throw new Error('subcontractor_id is required for company subcontracts')
    }

    if (subcontract_type === 'individual') {
      if (!worker_name) {
        throw new Error('worker_name is required for individual subcontracts')
      }
    }

    if (!contract_period_start || !monthly_amount) {
      throw new Error('contract_period_start and monthly_amount are required')
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

    // 주민등록번호 암호화 (개인 도급인 경우)
    let encryptedRRN = null
    if (subcontract_type === 'individual' && resident_registration_number) {
      // TODO: 실제 암호화 로직 구현 (현재는 평문 저장, 추후 암호화 필요)
      encryptedRRN = resident_registration_number
    }

    const { data: subcontract, error } = await adminSupabase
      .from('subcontracts')
      .insert({
        company_id: user.company_id,
        subcontract_type,
        subcontractor_id: subcontract_type === 'company' ? subcontractor_id : null,
        worker_id: subcontract_type === 'individual' && worker_id ? worker_id : null,
        worker_name: subcontract_type === 'individual' ? worker_name : null,
        resident_registration_number_encrypted: encryptedRRN,
        bank_name: bank_name?.trim() || null,
        account_number: account_number?.trim() || null,
        contract_period_start,
        contract_period_end: contract_period_end || null,
        monthly_amount: parseFloat(monthly_amount),
        tax_rate: tax_rate ? parseFloat(tax_rate) : subcontract_type === 'individual' ? 0.033 : 0,
        status: 'active',
        memo: memo?.trim() || null,
        created_by: user.id,
      })
      .select(`
        *,
        subcontractor:subcontractor_id (
          id,
          name
        ),
        worker:worker_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to create subcontract: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: subcontract,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

