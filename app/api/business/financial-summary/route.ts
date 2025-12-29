import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { getTodayDateKST, adjustPaymentDayToLastDay, isTodayPaymentDay } from '@/lib/utils/date'

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
    const { data: unpaidTrackingStores } = await supabase
      .from('stores')
      .select('id, name, payment_day')
      .eq('company_id', user.company_id)
      .eq('unpaid_tracking_enabled', true)
      .is('deleted_at', null)

    const unpaidByStore = await Promise.all(
      (unpaidTrackingStores || []).map(async (store) => {
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

    // 오늘 급여일인 직원 조회 (KST 기준)
    const todayKST = getTodayDateKST() // 'YYYY-MM-DD' 형식
    const todayDay = parseInt(todayKST.split('-')[2], 10) // 일(day) 추출 (1-31)
    
    console.log('[Financial Summary] Today KST:', todayKST, 'Today Day:', todayDay)
    
    // salary_date가 숫자 타입이므로 명시적으로 숫자로 비교
    // 모든 사용자를 가져온 후 필터링하여 타입 불일치 문제 방지
    // 일당 직원 제외: pay_type이 'monthly'이거나 null이거나, salary_date가 있는 직원만
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, name, salary_date, salary_amount, pay_amount, pay_type, role')
      .eq('company_id', user.company_id)
      .eq('employment_active', true)
      .order('name')

    if (allUsersError) {
      console.error('Error fetching users:', allUsersError)
    }

    console.log('[Financial Summary] All users:', allUsers?.map((u: any) => ({
      name: u.name,
      salary_date: u.salary_date,
      pay_type: u.pay_type,
      role: u.role
    })))

    // 오늘 급여일인 직원 필터링 및 인건비 상태 확인
    // 일당 직원 제외: pay_type이 'daily'인 직원은 제외
    // 도급 직원/업체 포함
    const companyId = user.company_id // 변수명 충돌 방지
    const todaySalaryUsersWithStatus = await Promise.all(
      (allUsers || []).map(async (userRecord) => {
        // 일당 직원 제외
        if (userRecord.pay_type === 'daily') {
          console.log(`[Financial Summary] User ${userRecord.name} excluded: pay_type is daily`)
          return null
        }
        
        const salaryDate = userRecord.salary_date
        
        // null이 아니고 숫자인 경우
        if (salaryDate === null || salaryDate === undefined) {
          console.log(`[Financial Summary] User ${userRecord.name} excluded: salary_date is null/undefined`)
          return null
        }
        
        // 문자열이나 숫자 모두 처리
        const salaryDateNum = typeof salaryDate === 'string' 
          ? parseInt(salaryDate.trim(), 10) 
          : Number(salaryDate)
        
        if (isNaN(salaryDateNum)) {
          console.log(`[Financial Summary] User ${userRecord.name} excluded: salary_date is not a valid number`)
          return null
        }
        
        console.log(`[Financial Summary] User ${userRecord.name}: salary_date=${salaryDate}, salaryDateNum=${salaryDateNum}, todayDay=${todayDay}`)
        
        // 급여일이 오늘인지 확인 (말일 조정 포함)
        // 오늘 날짜 기준으로 조정된 급여일이 오늘인지 확인
        const isMatch = isTodayPaymentDay(salaryDateNum)
        
        if (!isMatch) {
          console.log(`[Financial Summary] User ${userRecord.name} excluded: salary_date (${salaryDateNum}) is not today (adjusted)`)
          return null
        }
        
        console.log(`[Financial Summary] User ${userRecord.name} matched! salary_date=${salaryDateNum} is today (adjusted)`)

        const isSubcontract = userRecord.role === 'subcontract_individual' || userRecord.role === 'subcontract_company'

        // 도급 직원/업체인 경우 도급 정산 정보 조회
        if (isSubcontract) {
          // 사용자 테이블의 도급 금액 (우선 사용)
          const userAmount = userRecord.pay_amount || userRecord.salary_amount || 0
          
          // 해당 사용자의 활성 도급 조회
          const { data: subcontract } = await supabase
            .from('subcontracts')
            .select('id, subcontract_type, monthly_amount, tax_rate')
            .eq('company_id', companyId)
            .or(`worker_id.eq.${userRecord.id},worker_name.eq.${userRecord.name}`)
            .eq('status', 'active')
            .is('deleted_at', null)
            .maybeSingle()

          // 도급 정산이 있으면 정산 금액 사용, 없으면 사용자 테이블의 금액 사용
          let subcontractAmount = userAmount
          let paymentStatus: 'paid' | 'scheduled' = 'scheduled'
          let paymentId: string | null = null
          
          if (subcontract) {
            // 이번 달 도급 정산 조회 (subcontract_payments)
            const { data: subcontractPayments } = await supabase
              .from('subcontract_payments')
              .select('id, status, amount, base_amount, deduction_amount, paid_at')
              .eq('subcontract_id', subcontract.id)
              .eq('pay_period', period)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)

            const payment = subcontractPayments && subcontractPayments.length > 0 ? subcontractPayments[0] : null
            if (payment) {
              // 정산이 있으면 정산 금액 사용
              subcontractAmount = payment.amount || userAmount
              
              // 지급완료된 경우, paid_at이 오늘인지 확인하여 당일만 표시
              if (payment.status === 'paid') {
                if (payment.paid_at) {
                  const paidDate = payment.paid_at.split('T')[0] // 'YYYY-MM-DD'
                  if (paidDate === todayKST) {
                    paymentStatus = 'paid' // 오늘 지급완료된 것만 표시
                  } else {
                    // 오늘이 아닌 날 지급완료된 것은 null 반환하여 제외
                    return null
                  }
                } else {
                  paymentStatus = 'scheduled'
                }
              } else {
                paymentStatus = 'scheduled'
              }
              
              paymentId = payment.id
            } else {
              // 정산이 없으면 사용자 테이블의 금액에 세율 적용
              const taxRate = subcontract.tax_rate || (userRecord.role === 'subcontract_individual' ? 0.033 : 0)
              subcontractAmount = Math.floor(userAmount * (1 - taxRate))
            }
          } else {
            // 도급이 등록되지 않았으면 사용자 테이블의 금액에 기본 세율 적용
            const taxRate = userRecord.role === 'subcontract_individual' ? 0.033 : 0
            subcontractAmount = Math.floor(userAmount * (1 - taxRate))
          }

          return {
            id: userRecord.id,
            name: userRecord.name,
            salary_date: userRecord.salary_date,
            salary_amount: null, // 도급은 salary_amount 사용 안 함
            subcontract_amount: subcontractAmount, // 도급금액
            payroll_status: paymentStatus,
            payroll_id: null,
            payment_id: paymentId, // 도급 정산 ID
            role: userRecord.role,
          }
        }

        // 일반 직원인 경우 인건비 조회
        // 이번 달 인건비 조회하여 지급 상태 확인
        const { data: payrolls } = await supabase
          .from('payrolls')
          .select('id, status, paid_at, amount')
          .eq('user_id', userRecord.id)
          .eq('pay_period', period)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)

        const payroll = payrolls && payrolls.length > 0 ? payrolls[0] : null
        let payrollStatus: 'paid' | 'scheduled' = 'scheduled'
        
        if (payroll) {
          if (payroll.status === 'paid') {
            // 지급완료된 경우, paid_at이 오늘인지 확인하여 당일만 표시
            if (payroll.paid_at) {
              const paidDate = payroll.paid_at.split('T')[0] // 'YYYY-MM-DD'
              if (paidDate === todayKST) {
                payrollStatus = 'paid' // 오늘 지급완료된 것만 표시
              } else {
                // 오늘이 아닌 날 지급완료된 것은 null 반환하여 제외
                return null
              }
            } else {
              // paid_at이 없으면 scheduled로 처리
              payrollStatus = 'scheduled'
            }
          } else {
            payrollStatus = 'scheduled'
          }
        }

        const payrollId = payroll ? payroll.id : null
        
        // 인건비가 있으면 인건비 금액을 사용, 없으면 사용자의 salary_amount 사용
        const displaySalaryAmount = payroll && payroll.amount !== null
          ? payroll.amount
          : userRecord.salary_amount

        return {
          id: userRecord.id,
          name: userRecord.name,
          salary_date: userRecord.salary_date,
          salary_amount: displaySalaryAmount,
          subcontract_amount: null, // 일반 직원은 도급금액 없음
          payroll_status: payrollStatus, // 'paid' 또는 'scheduled'
          payroll_id: payrollId, // 인건비 ID 추가
          payment_id: null,
          role: userRecord.role, // 역할 추가 (도급 역할 표시용)
        }
      })
    )

    // null이 아닌 항목만 필터링 (지급완료된 항목도 포함하여 당일 표시용으로 포함)
    const todaySalaryUsers = todaySalaryUsersWithStatus.filter((user): user is NonNullable<typeof user> => user !== null)

    // 오늘 수금일인 매장 조회 및 결제 상태 확인
    // 모든 매장을 가져온 후 말일 조정하여 필터링
    const { data: allStores, error: allStoresError } = await supabase
      .from('stores')
      .select('id, name, payment_day, service_amount, payment_method')
      .eq('company_id', user.company_id)
      .eq('unpaid_tracking_enabled', true)
      .is('deleted_at', null)
      .order('name')

    if (allStoresError) {
      console.error('Error fetching stores:', allStoresError)
    }

    // 말일 조정하여 오늘 수금일인 매장만 필터링
    const todayPaymentStoresRaw = (allStores || []).filter((store) => {
      return isTodayPaymentDay(store.payment_day)
    })

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


    // 일당 직원 조회 (worker_name이 있는 payrolls)
    // 지급완료된 것도 포함하여 당일 표시 (paid_at이 오늘인 것만)
    const { data: dailyPayrolls, error: dailyPayrollsError } = await supabase
      .from('payrolls')
      .select('id, worker_name, pay_period, work_days, daily_wage, amount, paid_at, status')
      .eq('company_id', user.company_id)
      .not('worker_name', 'is', null) // worker_name이 있는 것만 (일당 직원)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (dailyPayrollsError) {
      console.error('Error fetching daily payrolls:', dailyPayrollsError)
    }

    // 예정 상태이거나 오늘 지급완료된 일당만 필터링
    const todayDailyPayrolls = (dailyPayrolls || [])
      .filter((payroll) => {
        // 예정 상태는 항상 포함
        if (payroll.status === 'scheduled') return true
        // 지급완료된 것은 paid_at이 오늘인 것만 포함 (당일만 표시)
        if (payroll.status === 'paid' && payroll.paid_at) {
          const paidDate = payroll.paid_at.split('T')[0] // 'YYYY-MM-DD'
          return paidDate === todayKST
        }
        return false
      })
      .map((payroll) => ({
        id: payroll.id,
        worker_name: payroll.worker_name || '',
        pay_period: payroll.pay_period,
        work_days: payroll.work_days,
        daily_wage: payroll.daily_wage,
        amount: payroll.amount,
        paid_at: payroll.paid_at,
        status: payroll.status,
      }))

    // 월별 성장률 계산 (수금액 기준)
    const nowForGrowth = new Date()
    // 한국 시간대로 현재 날짜 가져오기
    const koreaTimeForGrowth = new Date(nowForGrowth.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    
    // 이번 달 시작일/종료일 (KST 기준)
    const growthCurrentYear = koreaTimeForGrowth.getFullYear()
    const growthCurrentMonth = koreaTimeForGrowth.getMonth()
    const currentMonthStart = new Date(growthCurrentYear, growthCurrentMonth, 1, 0, 0, 0, 0)
    const currentMonthEnd = new Date(growthCurrentYear, growthCurrentMonth + 1, 0, 23, 59, 59, 999)
    
    // 전월 시작일/종료일 (KST 기준)
    const previousMonthStart = new Date(growthCurrentYear, growthCurrentMonth - 1, 1, 0, 0, 0, 0)
    const previousMonthEnd = new Date(growthCurrentYear, growthCurrentMonth, 0, 23, 59, 59, 999)
    
    // 이번 달 수금액 계산 (received_at 기준)
    const { data: currentMonthReceipts, error: currentMonthReceiptsError } = await supabase
      .from('receipts')
      .select('amount')
      .eq('company_id', user.company_id)
      .gte('received_at', currentMonthStart.toISOString())
      .lte('received_at', currentMonthEnd.toISOString())
      .is('deleted_at', null)
    
    if (currentMonthReceiptsError) {
      console.error('Error fetching current month receipts:', currentMonthReceiptsError)
    }
    
    const currentMonthRevenue = currentMonthReceipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    
    // 전월 수금액 계산 (received_at 기준)
    const { data: previousMonthReceipts, error: previousMonthReceiptsError } = await supabase
      .from('receipts')
      .select('amount')
      .eq('company_id', user.company_id)
      .gte('received_at', previousMonthStart.toISOString())
      .lte('received_at', previousMonthEnd.toISOString())
      .is('deleted_at', null)
    
    if (previousMonthReceiptsError) {
      console.error('Error fetching previous month receipts:', previousMonthReceiptsError)
    }
    
    const previousMonthRevenue = previousMonthReceipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    
    // 성장률 계산
    let monthlyGrowthRate: number | null = null
    if (previousMonthRevenue > 0) {
      monthlyGrowthRate = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    } else if (currentMonthRevenue > 0) {
      // 전월은 없지만 이번 달 수입이 있으면 null로 설정 (신규로 표시)
      monthlyGrowthRate = null
    }

    // 디버깅용 로그
    console.log('[Financial Summary API] Today data:', {
      todayDay,
      totalUsers: allUsers?.length || 0,
      todaySalaryUsersCount: todaySalaryUsers.length,
      todaySalaryUsers: todaySalaryUsers.map(u => ({ name: u.name, role: u.role, salary_date: u.salary_date, salary_amount: u.salary_amount, subcontract_amount: u.subcontract_amount })),
      todayDailyPayrollsCount: todayDailyPayrolls.length,
      todayDailyPayrolls: todayDailyPayrolls.map(p => ({ worker_name: p.worker_name, amount: p.amount })),
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
        today_daily_payrolls: todayDailyPayrolls || [],
        today_payment_stores: todayPaymentStores || [],
        monthly_growth_rate: monthlyGrowthRate,
        current_month_revenue: currentMonthRevenue,
        previous_month_revenue: previousMonthRevenue,
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

