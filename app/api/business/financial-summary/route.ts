import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 재무 요약 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view financial summary')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7) // YYYY-MM

    // 이번 달 매출(청구 합계)
    const { data: revenues, error: revenuesError } = await supabase
      .from('revenues')
      .select('amount')
      .eq('company_id', user.company_id)
      .eq('service_period', period)
      .is('deleted_at', null)

    if (revenuesError) {
      throw new Error(`Failed to fetch revenues: ${revenuesError.message}`)
    }

    const totalRevenue = revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

    // 이번 달 수금 합계
    // 먼저 해당 기간의 revenue_id 목록 가져오기
    const { data: periodRevenues } = await supabase
      .from('revenues')
      .select('id')
      .eq('company_id', user.company_id)
      .eq('service_period', period)
      .is('deleted_at', null)

    const revenueIds = periodRevenues?.map(r => r.id) || []
    
    let totalReceived = 0
    if (revenueIds.length > 0) {
      const { data: receipts, error: receiptsError } = await supabase
        .from('receipts')
        .select('amount')
        .in('revenue_id', revenueIds)
        .is('deleted_at', null)

      if (receiptsError) {
        throw new Error(`Failed to fetch receipts: ${receiptsError.message}`)
      }

      totalReceived = receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    }

    // 현재 미수금 잔액 (전체)
    const { data: allRevenues, error: allRevenuesError } = await supabase
      .from('revenues')
      .select('id, amount')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (allRevenuesError) {
      throw new Error(`Failed to fetch all revenues: ${allRevenuesError.message}`)
    }

    const totalAllRevenue = allRevenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    
    // 전체 수금액 계산
    const allRevenueIds = allRevenues?.map(r => r.id) || []
    let totalAllReceived = 0
    if (allRevenueIds.length > 0) {
      const { data: allReceiptsForUnpaid, error: allReceiptsForUnpaidError } = await supabase
        .from('receipts')
        .select('amount')
        .in('revenue_id', allRevenueIds)
        .is('deleted_at', null)

      if (allReceiptsForUnpaidError) {
        throw new Error(`Failed to fetch all receipts: ${allReceiptsForUnpaidError.message}`)
      }

      totalAllReceived = allReceiptsForUnpaid?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    }

    const totalUnpaid = totalAllRevenue - totalAllReceived

    // 이번 달 지출 합계
    const currentMonth = new Date().toISOString().slice(0, 7)
    const [year, month] = currentMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate() // 해당 월의 마지막 날짜
    const startDate = `${currentMonth}-01`
    const endDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`
    
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('company_id', user.company_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .is('deleted_at', null)

    if (expensesError) {
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`)
    }

    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    // 이번 달 인건비 합계 (지급완료/예정 분리)
    const { data: payrolls, error: payrollsError } = await supabase
      .from('payrolls')
      .select('amount, status')
      .eq('company_id', user.company_id)
      .eq('pay_period', period)
      .is('deleted_at', null)

    if (payrollsError) {
      throw new Error(`Failed to fetch payrolls: ${payrollsError.message}`)
    }

    const totalPayroll = payrolls?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const paidPayroll = payrolls?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const scheduledPayroll = payrolls?.filter(p => p.status === 'scheduled').reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // 미수금 상위 매장 리스트
    const { data: allStores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('company_id', user.company_id)
      .eq('unpaid_tracking_enabled', true)
      .is('deleted_at', null)

    const unpaidByStore = await Promise.all(
      (allStores || []).map(async (store) => {
        const { data: storeRevenues } = await supabase
          .from('revenues')
          .select('id, amount')
          .eq('store_id', store.id)
          .is('deleted_at', null)

        const storeRevenue = storeRevenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
        
        // 해당 매장의 수금액 계산
        const storeRevenueIds = storeRevenues?.map(r => r.id) || []
        let storeReceived = 0
        if (storeRevenueIds.length > 0) {
          const { data: storeReceipts } = await supabase
            .from('receipts')
            .select('amount')
            .in('revenue_id', storeRevenueIds)
            .is('deleted_at', null)

          storeReceived = storeReceipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
        }

        const unpaid = storeRevenue - storeReceived

        return {
          store_id: store.id,
          store_name: store.name,
          unpaid_amount: unpaid,
        }
      })
    )

    const topUnpaidStores = unpaidByStore
      .filter(s => s.unpaid_amount > 0)
      .sort((a, b) => b.unpaid_amount - a.unpaid_amount)
      .slice(0, 10)

    return Response.json({
      success: true,
      data: {
        period,
        total_revenue: totalRevenue,
        total_received: totalReceived,
        total_unpaid: totalUnpaid,
        total_expenses: totalExpenses,
        total_payroll: totalPayroll,
        paid_payroll: paidPayroll,
        scheduled_payroll: scheduledPayroll,
        top_unpaid_stores: topUnpaidStores,
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

