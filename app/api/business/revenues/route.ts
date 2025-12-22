import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 매출/청구 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view revenues')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const period = searchParams.get('period')

    let query = supabase
      .from('revenues')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    if (period) {
      query = query.eq('service_period', period)
    }

    const { data: revenues, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch revenues: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: revenues || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 매출/청구 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create revenues')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { store_id, service_period, amount, due_date, billing_memo } = body

    if (!store_id || !service_period || !amount || !due_date) {
      throw new Error('store_id, service_period, amount, and due_date are required')
    }

    // service_period 형식 검증 (YYYY-MM)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(service_period)) {
      throw new Error('service_period must be in YYYY-MM format')
    }

    // RLS 우회를 위해 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error: Service role key is required')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인 및 payment_method 조회
    const { data: store } = await supabase
      .from('stores')
      .select('id, company_id, payment_method')
      .eq('id', store_id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    const revenueAmount = parseFloat(amount)
    const isAutoPayment = store.payment_method === 'auto_payment'

    // 매출(청구) 생성 - 서비스 역할 키 사용
    const { data: revenue, error } = await adminSupabase
      .from('revenues')
      .insert({
        store_id,
        company_id: user.company_id,
        service_period,
        amount: revenueAmount,
        due_date,
        billing_memo: billing_memo?.trim() || null,
        status: isAutoPayment ? 'paid' : 'unpaid', // 자동결제면 완납, 아니면 미수금
      })
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to create revenue: ${error.message}`)
    }

    // 자동결제인 경우 수금도 자동 등록 - 서비스 역할 키 사용
    if (isAutoPayment && revenue) {
      const { error: receiptError } = await adminSupabase
        .from('receipts')
        .insert({
          revenue_id: revenue.id,
          company_id: user.company_id,
          received_at: new Date().toISOString(),
          amount: revenueAmount,
          memo: '자동결제',
        })

      if (receiptError) {
        console.error('Failed to create auto receipt:', receiptError)
        // 수금 등록 실패해도 매출은 생성되었으므로 경고만
      }
    }

    return Response.json({
      success: true,
      data: revenue,
      auto_payment: isAutoPayment,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

