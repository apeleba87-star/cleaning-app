import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { assertBusinessFeature } from '@/lib/plan-features-server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 매장별 수금/미수금 현황 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view receivables')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const feature = await assertBusinessFeature(user.company_id, 'receivables')
    if (feature.allowed === false) {
      throw new ForbiddenError(feature.message)
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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')

    // 매장 목록 조회 (서비스 역할 키 사용)
    const { data: stores, error: storesError } = await adminSupabase
      .from('stores')
      .select('id, name, unpaid_tracking_enabled')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .order('name')

    if (storesError) {
      throw new Error(`Failed to fetch stores: ${storesError.message}`)
    }

    // 각 매장별 수금/미수금 현황 계산
    const receivables = await Promise.all(
      (stores || []).map(async (store) => {
        // 해당 매장의 매출(청구) 조회 - 서비스 역할 키 사용
        let revenueQuery = adminSupabase
          .from('revenues')
          .select('id, amount, status, service_period, due_date, billing_memo')
          .eq('store_id', store.id)
          .eq('company_id', user.company_id)
          .is('deleted_at', null)

        if (period) {
          revenueQuery = revenueQuery.eq('service_period', period)
        }

        const { data: revenues, error: revenuesError } = await revenueQuery

        if (revenuesError) {
          console.error(`Error fetching revenues for store ${store.id} (${store.name}):`, revenuesError)
          return {
            store_id: store.id,
            store_name: store.name,
            unpaid_tracking_enabled: store.unpaid_tracking_enabled,
            total_revenue: 0,
            total_received: 0,
            unpaid_amount: 0,
            revenue_count: 0,
            revenues: [],
          }
        }

        // 각 매출별 수금액 계산 - 서비스 역할 키 사용
        let totalRevenue = 0
        let totalReceived = 0
        const revenueDetails = []

        for (const revenue of revenues || []) {
          const { data: receipts, error: receiptsError } = await adminSupabase
            .from('receipts')
            .select('amount')
            .eq('revenue_id', revenue.id)
            .eq('company_id', user.company_id)
            .is('deleted_at', null)

          if (receiptsError) {
            console.error(`Error fetching receipts for revenue ${revenue.id}:`, receiptsError)
            continue
          }

          const receivedAmount = (receipts || []).reduce((sum, r) => sum + r.amount, 0)
          totalRevenue += revenue.amount
          totalReceived += receivedAmount

          revenueDetails.push({
            id: revenue.id,
            service_period: revenue.service_period,
            amount: revenue.amount,
            received: receivedAmount,
            unpaid: revenue.amount - receivedAmount,
            status: revenue.status,
            due_date: revenue.due_date,
            billing_memo: revenue.billing_memo,
          })
        }

        return {
          store_id: store.id,
          store_name: store.name,
          unpaid_tracking_enabled: store.unpaid_tracking_enabled,
          total_revenue: totalRevenue,
          total_received: totalReceived,
          unpaid_amount: totalRevenue - totalReceived,
          revenue_count: revenues?.length || 0,
          revenues: revenueDetails,
        }
      })
    )

    // 모든 매장 표시 (미수금 추적 활성화 여부와 관계없이)
    return Response.json({
      success: true,
      data: receivables,
      period: period || null,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

