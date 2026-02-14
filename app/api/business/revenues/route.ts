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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const period = searchParams.get('period')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '1000') // 기본값 1000 (페이지네이션 없을 때)
    const offset = (page - 1) * limit

    let query = dataClient
      .from('revenues')
      .select(`
        *,
        stores:store_id (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    if (period) {
      query = query.eq('service_period', period)
    }

    // 페이지네이션 적용
    query = query.order('created_at', { ascending: false })
    if (limit < 1000) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: revenues, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch revenues: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: revenues || [],
      pagination: limit < 1000 ? {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      } : undefined
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
    const { store_id, service_period, amount, due_date, billing_memo, revenue_name, revenue_memo } = body

    // 필수 필드 검증
    if (!service_period || !amount || !due_date) {
      throw new Error('service_period, amount, and due_date are required')
    }

    // store_id가 있는 경우와 없는 경우(신규 매출) 모두 허용
    // store_id가 있으면 매장 검증, 없으면 신규 매출로 처리
    if (store_id && (!revenue_name || !revenue_name.trim())) {
      // 기존 매장 매출 등록: store_id 필수
    } else if (!store_id && (!revenue_name || !revenue_name.trim())) {
      // 신규 매출 등록: revenue_name 필수
      throw new Error('revenue_name is required for new revenue (without store)')
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

    let store = null
    let isAutoPayment = false
    const isNewRevenue = !store_id // 신규 매출 여부

    if (store_id) {
      const { data: storeData } = await adminSupabase
        .from('stores')
        .select('id, company_id, payment_method')
        .eq('id', store_id)
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
        .single()

      if (!storeData) {
        throw new ForbiddenError('Store not found or access denied')
      }

      store = storeData
      isAutoPayment = store.payment_method === 'auto_payment'
    }

    const revenueAmount = parseFloat(amount)

    // status 결정: 신규 매출은 무조건 완납, 기존 매장은 자동결제면 완납, 아니면 미수금
    const revenueStatus = isNewRevenue ? 'paid' : (isAutoPayment ? 'paid' : 'unpaid')

    // 매출(청구) 생성 - 서비스 역할 키 사용
    const { data: revenue, error } = await adminSupabase
      .from('revenues')
      .insert({
        store_id: store_id || null,
        company_id: user.company_id,
        service_period,
        amount: revenueAmount,
        due_date,
        billing_memo: billing_memo?.trim() || null,
        revenue_name: revenue_name?.trim() || null,
        revenue_memo: revenue_memo?.trim() || null,
        status: revenueStatus,
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

    // 완납 상태인 경우 수금도 자동 등록 (신규 매출 또는 자동결제)
    if (revenueStatus === 'paid' && revenue) {
      const receiptMemo = isNewRevenue ? '신규 매출 (입금 확인 완료)' : '자동결제'
      const { error: receiptError } = await adminSupabase
        .from('receipts')
        .insert({
          revenue_id: revenue.id,
          company_id: user.company_id,
          received_at: new Date().toISOString(),
          amount: revenueAmount,
          memo: receiptMemo,
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

