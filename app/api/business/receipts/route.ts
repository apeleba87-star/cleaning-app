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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { searchParams } = new URL(request.url)
    const revenueId = searchParams.get('revenue_id')
    const period = searchParams.get('period') // YYYY-MM 형식
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '1000') // 기본값 1000 (페이지네이션 없을 때)
    const offset = (page - 1) * limit

    let query = dataClient
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
      `, { count: 'exact' })
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (revenueId) {
      // 기존 로직: revenue_id로 필터링
      query = query.eq('revenue_id', revenueId)
    } else if (period) {
      // 새로운 로직: period로 필터링 (해당 기간의 revenue에 연결된 수금만 조회)
      // 먼저 해당 기간의 revenue_id 목록 가져오기
      const { data: revenues } = await dataClient
        .from('revenues')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('service_period', period)
        .is('deleted_at', null)
      
      const revenueIds = revenues?.map(r => r.id) || []
      
      if (revenueIds.length > 0) {
        query = query.in('revenue_id', revenueIds)
      } else {
        // 해당 기간에 revenue가 없으면 빈 배열 반환
        return Response.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0
          }
        })
      }
    }

    // 페이지네이션 적용
    query = query.order('received_at', { ascending: false })
    if (limit < 1000) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: receipts, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch receipts: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: receipts || [],
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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) throw new Error('Server configuration error')
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: revenue } = await adminSupabase
      .from('revenues')
      .select('id, company_id, amount')
      .eq('id', revenue_id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!revenue) {
      throw new ForbiddenError('Revenue not found or access denied')
    }

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

