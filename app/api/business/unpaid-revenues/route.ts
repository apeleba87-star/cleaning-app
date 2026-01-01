import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 미수금 목록 조회 (최적화: 한 번의 쿼리로 모든 데이터 조회)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view unpaid revenues')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 모든 매출 조회 (매장 정보 포함)
    const { data: revenues, error: revenuesError } = await supabase
      .from('revenues')
      .select(`
        id,
        store_id,
        service_period,
        amount,
        due_date,
        stores:store_id (
          id,
          name
        )
      `)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (revenuesError) {
      throw new Error(`Failed to fetch revenues: ${revenuesError.message}`)
    }

    if (!revenues || revenues.length === 0) {
      return Response.json({
        success: true,
        data: [],
      })
    }

    // 모든 수금 조회 (한 번에)
    const revenueIds = revenues.map(r => r.id)
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('revenue_id, amount')
      .in('revenue_id', revenueIds)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (receiptsError) {
      throw new Error(`Failed to fetch receipts: ${receiptsError.message}`)
    }

    // 수금액을 revenue_id별로 그룹화
    const receiptsByRevenue = new Map<string, number>()
    ;(receipts || []).forEach(receipt => {
      const current = receiptsByRevenue.get(receipt.revenue_id) || 0
      receiptsByRevenue.set(receipt.revenue_id, current + (receipt.amount || 0))
    })

    // 미수금 계산 및 필터링
    const today = new Date()
    const unpaidRevenues = revenues
      .map(revenue => {
        const receivedAmount = receiptsByRevenue.get(revenue.id) || 0
        const unpaidAmount = revenue.amount - receivedAmount

        // 미수금이 있는 경우만 포함
        if (unpaidAmount > 0) {
          const dueDate = new Date(revenue.due_date)
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

          return {
            revenue_id: revenue.id,
            store_id: revenue.store_id,
            store_name: (revenue.stores as any)?.name || '-',
            service_period: revenue.service_period,
            amount: revenue.amount,
            received_amount: receivedAmount,
            unpaid_amount: unpaidAmount,
            due_date: revenue.due_date,
            days_overdue: daysOverdue,
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return Response.json({
      success: true,
      data: unpaidRevenues,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
