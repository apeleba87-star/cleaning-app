import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 자동생성 안된 정규 직원 수 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view pending count')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const { searchParams } = new URL(request.url)
    const pay_period = searchParams.get('period')

    // pay_period 형식 검증 (YYYY-MM)
    if (!pay_period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(pay_period)) {
      throw new Error('period must be in YYYY-MM format')
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

    // 근무중인 정규 직원 조회 (role='staff', employment_active=true, is_active=true, pay_amount가 있는 경우만)
    const { data: activeStaff, error: staffError } = await adminSupabase
      .from('users')
      .select('id')
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
    const pendingCount = activeStaff.filter(s => !existingUserIds.has(s.id)).length

    return Response.json({
      success: true,
      count: pendingCount,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
