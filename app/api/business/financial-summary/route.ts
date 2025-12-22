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
    const revenueCount = revenues?.length || 0

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
    let receiptCount = 0
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
      receiptCount = receipts?.length || 0
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
    let allReceiptsForUnpaid: Array<{ revenue_id: string; amount: number }> = []
    if (allRevenueIds.length > 0) {
      const { data: receiptsData, error: allReceiptsForUnpaidError } = await supabase
        .from('receipts')
        .select('revenue_id, amount')
        .in('revenue_id', allRevenueIds)
        .is('deleted_at', null)

      if (allReceiptsForUnpaidError) {
        throw new Error(`Failed to fetch all receipts: ${allReceiptsForUnpaidError.message}`)
      }

      allReceiptsForUnpaid = receiptsData || []
      totalAllReceived = allReceiptsForUnpaid.reduce((sum, r) => sum + (r.amount || 0), 0)
    }

    const totalUnpaid = totalAllRevenue - totalAllReceived
    // 미수금 건수: 미수금이 있는 매출 개수
    const unpaidRevenues = allRevenues?.filter(r => {
      const received = allReceiptsForUnpaid
        .filter(rec => rec.revenue_id === r.id)
        .reduce((sum, rec) => sum + (rec.amount || 0), 0)
      return (r.amount || 0) > received
    }) || []
    const unpaidCount = unpaidRevenues.length

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
    const expenseCount = expenses?.length || 0

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
    const paidPayrolls = payrolls?.filter(p => p.status === 'paid') || []
    const scheduledPayrolls = payrolls?.filter(p => p.status === 'scheduled') || []
    const paidPayroll = paidPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0)
    const scheduledPayroll = scheduledPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0)
    const paidPayrollCount = paidPayrolls.length
    const scheduledPayrollCount = scheduledPayrolls.length

    // 미수금 상위 매장 리스트
    const { data: allStores } = await supabase
      .from('stores')
      .select('id, name, payment_day')
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
          payment_day: store.payment_day,
        }
      })
    )

    const topUnpaidStores = unpaidByStore
      .filter(s => s.unpaid_amount > 0)
      .sort((a, b) => b.unpaid_amount - a.unpaid_amount)
      .slice(0, 10)

    // 오늘 급여일인 직원 조회
    const today = new Date()
    const todayDay = today.getDate() // 1-31
    
    // salary_date가 숫자 타입이므로 명시적으로 숫자로 비교
    // 모든 사용자를 가져온 후 필터링하여 타입 불일치 문제 방지
    // 일당 직원 제외: pay_type이 'monthly'이거나 null이거나, salary_date가 있는 직원만
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, name, salary_date, salary_amount, pay_type')
      .eq('company_id', user.company_id)
      .eq('employment_active', true)
      .order('name')

    if (allUsersError) {
      console.error('Error fetching users:', allUsersError)
    }

    // 오늘 급여일인 직원 필터링 및 인건비 상태 확인
    // 일당 직원 제외: pay_type이 'daily'인 직원은 제외
    const todaySalaryUsersWithStatus = await Promise.all(
      (allUsers || []).map(async (user) => {
        // 일당 직원 제외
        if (user.pay_type === 'daily') {
          return null
        }
        
        const salaryDate = user.salary_date
        
        // null이 아니고 숫자이며 오늘 날짜와 일치하는 경우
        if (salaryDate === null || salaryDate === undefined) {
          return null
        }
        
        // 문자열이나 숫자 모두 처리
        const salaryDateNum = typeof salaryDate === 'string' 
          ? parseInt(salaryDate.trim(), 10) 
          : Number(salaryDate)
        
        const isMatch = !isNaN(salaryDateNum) && salaryDateNum === todayDay
        
        if (!isMatch) {
          return null
        }

        // 이번 달 인건비 조회하여 지급 상태 확인
        const { data: payrolls } = await supabase
          .from('payrolls')
          .select('id, status, paid_at')
          .eq('user_id', user.id)
          .eq('pay_period', period)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)

        const payrollStatus = payrolls && payrolls.length > 0 
          ? (payrolls[0].status === 'paid' ? 'paid' : 'scheduled')
          : 'scheduled' // 인건비가 없으면 예정 상태

        const payrollId = payrolls && payrolls.length > 0 ? payrolls[0].id : null

        return {
          id: user.id,
          name: user.name,
          salary_date: user.salary_date,
          salary_amount: user.salary_amount,
          payroll_status: payrollStatus, // 'paid' 또는 'scheduled'
          payroll_id: payrollId, // 인건비 ID 추가
        }
      })
    )

    // null이 아닌 항목만 필터링
    const todaySalaryUsers = todaySalaryUsersWithStatus.filter((user): user is NonNullable<typeof user> => user !== null)

    // 오늘 수금일인 매장 조회 및 결제 상태 확인
    const { data: todayPaymentStoresRaw, error: todayPaymentError } = await supabase
      .from('stores')
      .select('id, name, payment_day, service_amount, payment_method')
      .eq('company_id', user.company_id)
      .eq('payment_day', todayDay)
      .eq('unpaid_tracking_enabled', true)
      .is('deleted_at', null)
      .order('name')

    if (todayPaymentError) {
      console.error('Error fetching today payment stores:', todayPaymentError)
    }

    // 각 매장의 결제 완료 여부 확인
    const todayPaymentStores = await Promise.all(
      (todayPaymentStoresRaw || []).map(async (store) => {
        // 해당 매장의 이번 달 매출 조회
        const { data: storeRevenues } = await supabase
          .from('revenues')
          .select('id, amount')
          .eq('store_id', store.id)
          .eq('service_period', period)
          .is('deleted_at', null)

        let isPaid = false
        let isAutoPayment = store.payment_method === 'auto_payment'

        if (storeRevenues && storeRevenues.length > 0) {
          // 매출 총액 계산
          const totalRevenue = storeRevenues.reduce((sum, r) => sum + (r.amount || 0), 0)
          
          // 수금 총액 계산
          const revenueIds = storeRevenues.map(r => r.id)
          if (revenueIds.length > 0) {
            const { data: receipts } = await supabase
              .from('receipts')
              .select('amount')
              .in('revenue_id', revenueIds)
              .is('deleted_at', null)

            const totalReceived = receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
            
            // 완납 여부 확인 (매출액과 수금액이 같거나 수금액이 더 큰 경우)
            isPaid = totalReceived >= totalRevenue
          }
        }

        return {
          id: store.id,
          name: store.name,
          payment_day: store.payment_day,
          service_amount: store.service_amount,
          is_paid: isPaid,
          is_auto_payment: isAutoPayment,
        }
      })
    )

    // 도급 직원/업체 조회 (오늘 급여일 기준)
    const subcontractUsers = (allUsers || []).filter(
      (u) => u.role === 'subcontract_individual' || u.role === 'subcontract_company'
    )

    const todaySubcontractUsers = await Promise.all(
      subcontractUsers.map(async (subcontractUser) => {
        // salary_date가 오늘인 경우만
        const salaryDate = subcontractUser.salary_date
        if (salaryDate === null || salaryDate === undefined) {
          return null
        }
        
        const salaryDateNum = typeof salaryDate === 'string' 
          ? parseInt(salaryDate.trim(), 10) 
          : Number(salaryDate)
        
        if (isNaN(salaryDateNum) || salaryDateNum !== todayDay) {
          return null
        }

        // 해당 사용자의 활성 도급 조회
        const { data: subcontract } = await supabase
          .from('subcontracts')
          .select('id, subcontract_type, monthly_amount, tax_rate')
          .eq('company_id', user.company_id)
          .or(`worker_id.eq.${subcontractUser.id},worker_name.eq.${subcontractUser.name}`)
          .eq('status', 'active')
          .is('deleted_at', null)
          .single()

        if (!subcontract) {
          // 도급이 등록되지 않았으면 기본 정보만 반환
          return {
            id: subcontractUser.id,
            name: subcontractUser.name,
            role: subcontractUser.role,
            salary_date: subcontractUser.salary_date,
            pay_amount: subcontractUser.pay_amount || subcontractUser.salary_amount || 0,
            payment_status: 'scheduled' as const,
            payment_id: null,
            payment_amount: subcontractUser.pay_amount || subcontractUser.salary_amount || 0,
            base_amount: subcontractUser.pay_amount || subcontractUser.salary_amount || 0,
            deduction_amount: 0,
          }
        }

        // 이번 달 도급 정산 조회 (subcontract_payments)
        const { data: subcontractPayments } = await supabase
          .from('subcontract_payments')
          .select('id, status, amount, base_amount, deduction_amount')
          .eq('subcontract_id', subcontract.id)
          .eq('pay_period', period)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)

        const payment = subcontractPayments && subcontractPayments.length > 0 ? subcontractPayments[0] : null
        const paymentStatus = payment ? (payment.status === 'paid' ? 'paid' : 'scheduled') : 'scheduled'
        const paymentId = payment?.id || null
        const monthlyAmount = subcontract.monthly_amount || subcontractUser.pay_amount || subcontractUser.salary_amount || 0
        const taxRate = subcontract.tax_rate || 0

        return {
          id: subcontractUser.id,
          name: subcontractUser.name,
          role: subcontractUser.role,
          salary_date: subcontractUser.salary_date,
          pay_amount: monthlyAmount,
          payment_status: paymentStatus,
          payment_id: paymentId,
          payment_amount: payment?.amount || Math.floor(monthlyAmount * (1 - taxRate)),
          base_amount: payment?.base_amount || monthlyAmount,
          deduction_amount: payment?.deduction_amount || Math.floor(monthlyAmount * taxRate),
        }
      })
    )
    
    const todaySubcontractUsersFiltered = todaySubcontractUsers.filter((u): u is NonNullable<typeof u> => u !== null)

    // 디버깅용 로그
    console.log('[Financial Summary API] Today data:', {
      todayDay,
      totalUsers: allUsers?.length || 0,
      todaySalaryUsersCount: todaySalaryUsers.length,
      todaySalaryUsers: todaySalaryUsers.map(u => ({ name: u.name, salary_date: u.salary_date })),
      todaySubcontractUsersCount: todaySubcontractUsersFiltered.length,
      todaySubcontractUsers: todaySubcontractUsersFiltered.map(u => ({ name: u.name, role: u.role })),
      todayPaymentStoresCount: todayPaymentStores.length,
      todayPaymentStores: todayPaymentStores.map(s => ({ 
        name: s.name, 
        is_paid: s.is_paid, 
        is_auto_payment: s.is_auto_payment 
      })),
    })

    return Response.json({
      success: true,
      data: {
        period,
        total_revenue: totalRevenue,
        revenue_count: revenueCount,
        total_received: totalReceived,
        receipt_count: receiptCount,
        total_unpaid: totalUnpaid,
        unpaid_count: unpaidCount,
        total_expenses: totalExpenses,
        expense_count: expenseCount,
        total_payroll: totalPayroll,
        paid_payroll: paidPayroll,
        paid_payroll_count: paidPayrollCount,
        scheduled_payroll: scheduledPayroll,
        scheduled_payroll_count: scheduledPayrollCount,
        top_unpaid_stores: topUnpaidStores,
        today_salary_users: todaySalaryUsers || [],
        today_subcontract_users: todaySubcontractUsersFiltered || [],
        today_payment_stores: todayPaymentStores || [],
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

