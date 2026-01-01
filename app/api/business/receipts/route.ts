import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 수금 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view receipts')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const revenueId = searchParams.get('revenue_id')

    let query = supabase
      .from('receipts')
      .select(`
        *,
        revenues:revenue_id (
          id,
          store_id,
          service_period,
          amount,
          stores:store_id (
            id,
            name
          )
        )
      `)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (revenueId) {
      query = query.eq('revenue_id', revenueId)
    }

    const { data: receipts, error } = await query.order('received_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch receipts: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: receipts || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 수금 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create receipts')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { revenue_id, received_at, amount, memo } = body

    if (!revenue_id || !amount) {
      throw new Error('revenue_id and amount are required')
    }

    const supabase = await createServerSupabaseClient()

    // 매출이 회사에 속해있는지 확인
    const { data: revenue } = await supabase
      .from('revenues')
      .select('id, company_id, amount')
      .eq('id', revenue_id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!revenue) {
      throw new ForbiddenError('Revenue not found or access denied')
    }

    // RLS 우회를 위해 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      console.error('[Receipts API] Missing environment variables:', {
        hasServiceRoleKey: !!serviceRoleKey,
        hasSupabaseUrl: !!supabaseUrl,
        nodeEnv: process.env.NODE_ENV,
      })
      throw new Error('Server configuration error: Service role key is required')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('[Receipts API] Creating receipt:', {
      revenue_id,
      company_id: user.company_id,
      amount: parseFloat(amount),
      received_at: received_at || new Date().toISOString(),
    })

    const { data: receipt, error } = await adminSupabase
      .from('receipts')
      .insert({
        revenue_id,
        company_id: user.company_id,
        received_at: received_at || new Date().toISOString(),
        amount: parseFloat(amount),
        memo: memo?.trim() || null,
      })
      .select(`
        *,
        revenues:revenue_id (
          id,
          store_id,
          service_period,
          amount,
          stores:store_id (
            id,
            name
          )
        )
      `)
      .single()

    if (error) {
      console.error('[Receipts API] Failed to create receipt:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        revenue_id,
        company_id: user.company_id,
        amount: parseFloat(amount),
      })
      throw new Error(`Failed to create receipt: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: receipt,
    })
  } catch (error: any) {
    console.error('[Receipts API] Error in POST:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    })
    return handleApiError(error)
  }
}

