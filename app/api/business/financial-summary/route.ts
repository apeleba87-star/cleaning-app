import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { assertBusinessFeature } from '@/lib/plan-features-server'
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

    const feature = await assertBusinessFeature(user.company_id, 'financial')
    if (!feature.allowed) {
      throw new ForbiddenError(feature.message)
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7) // YYYY-MM

    // 병렬 쿼리 실행으로 최적화: 독립적인 쿼리들을 동시에 실행
    const currentMonth = new Date().toISOString().slice(0, 7)
    const [year, month] = currentMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const startDate = `${currentMonth}-01`
    const endDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`

    // 병렬로 실행 가능한 쿼리들
    const [
      { data: revenues, error: revenuesError },
      { data: periodRevenues, error: periodRevenuesError },
      { data: allRevenues, error: allRevenuesError },
      { data: expenses, error: expensesError },
      { data: payrolls, error: payrollsError },
      { data: subcontractPayments, error: subcontractPaymentsError },
    ] = await Promise.all([
      supabase
        .from('revenues')
        .select('amount')
        .eq('company_id', user.company_id)
        .eq('service_period', period)
        .is('deleted_at', null),
      supabase
        .from('revenues')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('service_period', period)
        .is('deleted_at', null),
      supabase
        .from('revenues')
        .select('id, amount')
        .eq('company_id', user.company_id)
        .is('deleted_at', null),
      supabase
        .from('expenses')
        .select('amount, recurring_expense_id')
        .eq('company_id', user.company_id)
        .gte('date', startDate)
        .lte('date', endDate)
        .is('deleted_at', null),
      supabase
        .from('payrolls')
        .select('amount, status')
        .eq('company_id', user.company_id)
        .eq('pay_period', period)
        .is('deleted_at', null),
      supabase
        .from('subcontract_payments')
        .select('amount, status')
        .eq('company_id', user.company_id)
        .eq('pay_period', period)
        .is('deleted_at', null),
    ])

    if (revenuesError) {
      throw new Error(`Failed to fetch revenues: ${revenuesError.message}`)
    }
    if (periodRevenuesError) {
      throw new Error(`Failed to fetch period revenues: ${periodRevenuesError.message}`)
    }
    if (allRevenuesError) {
      throw new Error(`Failed to fetch all revenues: ${allRevenuesError.message}`)
    }
    if (expensesError) {
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`)
    }
    if (payrollsError) {
      throw new Error(`Failed to fetch payrolls: ${payrollsError.message}`)
    }
    if (subcontractPaymentsError) {
      throw new Error(`Failed to fetch subcontract payments: ${subcontractPaymentsError.message}`)
    }

    const totalRevenue = revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    const revenueCount = revenues?.length || 0

    // 이번 달 수금 합계
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

    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    const expenseCount = expenses?.length || 0
    const totalRecurringExpenses = expenses?.filter(e => e.recurring_expense_id !== null).reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    // 이번 달 인건비 합계: 정규 인건비(payrolls) + 도급 정산(subcontract_payments) 포함
    const regularPayrollTotal = payrolls?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const regularPaidPayrolls = payrolls?.filter(p => p.status === 'paid') || []
    const regularScheduledPayrolls = payrolls?.filter(p => p.status === 'scheduled') || []
    const regularPaidPayrollTotal = regularPaidPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0)
    const regularScheduledPayrollTotal = regularScheduledPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0)

    const subcontractPayrollTotal = subcontractPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const paidSubcontractPayrolls = subcontractPayments?.filter(p => p.status === 'paid') || []
    const scheduledSubcontractPayrolls = subcontractPayments?.filter(p => p.status === 'scheduled') || []
    const paidSubcontractPayrollTotal = paidSubcontractPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0)
    const scheduledSubcontractPayrollTotal = scheduledSubcontractPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0)

    const totalPayroll = regularPayrollTotal + subcontractPayrollTotal
    const paidPayroll = regularPaidPayrollTotal + paidSubcontractPayrollTotal
    const scheduledPayroll = regularScheduledPayrollTotal + scheduledSubcontractPayrollTotal
    const paidPayrollCount = regularPaidPayrolls.length + paidSubcontractPayrolls.length
    const scheduledPayrollCount = regularScheduledPayrolls.length + scheduledSubcontractPayrolls.length

    // 미수금 상위 매장 리스트 - 배치 쿼리로 최적화
    const { data: unpaidTrackingStores } = await supabase
      .from('stores')
      .select('id, name, payment_day')
      .eq('company_id', user.company_id)
      .eq('unpaid_tracking_enabled', true)
      .is('deleted_at', null)

    // 모든 매장의 매출을 한 번에 조회
    const storeIds = (unpaidTrackingStores || []).map(s => s.id)
    let allStoreRevenues: Array<{ id: string; store_id: string; amount: number }> = []
    let allStoreReceipts: Array<{ revenue_id: string; amount: number }> = []
    
    if (storeIds.length > 0) {
      // 모든 매장의 매출을 한 번에 조회
      const { data: revenuesData, error: revenuesError } = await supabase
        .from('revenues')
        .select('id, amount, store_id')
        .in('store_id', storeIds)
        .is('deleted_at', null)

      if (revenuesError) {
        console.error('Error fetching all store revenues:', revenuesError)
      } else {
        allStoreRevenues = revenuesData || []
      }

      // 모든 매장의 수금을 한 번에 조회
      const revenueIds = allStoreRevenues.map(r => r.id)
      if (revenueIds.length > 0) {
        const { data: receiptsData, error: receiptsError } = await supabase
          .from('receipts')
          .select('revenue_id, amount')
          .in('revenue_id', revenueIds)
          .is('deleted_at', null)

        if (receiptsError) {
          console.error('Error fetching all store receipts:', receiptsError)
        } else {
          allStoreReceipts = receiptsData || []
        }
      }
    }

    // 메모리에서 매장별로 그룹화하여 계산
    const revenuesByStore = new Map<string, Array<{ id: string; amount: number }>>()
    const receiptsByRevenue = new Map<string, number>()
    
    // 매출을 매장별로 그룹화
    allStoreRevenues.forEach(revenue => {
      if (!revenuesByStore.has(revenue.store_id)) {
        revenuesByStore.set(revenue.store_id, [])
      }
      revenuesByStore.get(revenue.store_id)!.push({ id: revenue.id, amount: revenue.amount || 0 })
    })

    // 수금을 revenue_id별로 합산
    allStoreReceipts.forEach(receipt => {
      const current = receiptsByRevenue.get(receipt.revenue_id) || 0
      receiptsByRevenue.set(receipt.revenue_id, current + (receipt.amount || 0))
    })

    // 각 매장의 미수금 계산
    const unpaidByStore = (unpaidTrackingStores || []).map(store => {
      const storeRevenues = revenuesByStore.get(store.id) || []
      const storeRevenue = storeRevenues.reduce((sum, r) => sum + r.amount, 0)
      
      // 해당 매장의 수금액 계산
      const storeReceived = storeRevenues.reduce((sum, r) => {
        const received = receiptsByRevenue.get(r.id) || 0
        return sum + received
      }, 0)

      const unpaid = storeRevenue - storeReceived

      return {
        store_id: store.id,
        store_name: store.name,
        unpaid_amount: unpaid,
        payment_day: store.payment_day,
      }
    })

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

    // 오늘 급여일인 직원 필터링 및 인건비 상태 확인 - 배치 쿼리로 최적화
    // 일당 직원 제외: pay_type이 'daily'인 직원은 제외
    // 도급 직원/업체 포함
    const companyId = user.company_id // 변수명 충돌 방지
    
    // 먼저 오늘 급여일인 사용자만 필터링
    const todaySalaryUsers = (allUsers || []).filter(userRecord => {
      // 일당 직원 제외
      if (userRecord.pay_type === 'daily') {
        return false
      }
      
      const salaryDate = userRecord.salary_date
      if (salaryDate === null || salaryDate === undefined) {
        return false
      }
      
      const salaryDateNum = typeof salaryDate === 'string' 
        ? parseInt(salaryDate.trim(), 10) 
        : Number(salaryDate)
      
      if (isNaN(salaryDateNum)) {
        return false
      }
      
      return isTodayPaymentDay(salaryDateNum)
    })

    const todaySalaryUserIds = todaySalaryUsers.map(u => u.id)
    const subcontractUserIds = todaySalaryUsers
      .filter(u => u.role === 'subcontract_individual' || u.role === 'subcontract_company')
      .map(u => u.id)
    const regularUserIds = todaySalaryUsers
      .filter(u => u.role !== 'subcontract_individual' && u.role !== 'subcontract_company')
      .map(u => u.id)

    // 배치 쿼리: 모든 도급 정보를 한 번에 조회
    let allSubcontracts: Array<{ id: string; worker_id: string | null; worker_name: string | null; monthly_amount: number; tax_rate: number }> = []
    if (subcontractUserIds.length > 0) {
      const subcontractUserNames = todaySalaryUsers
        .filter(u => subcontractUserIds.includes(u.id))
        .map(u => u.name)
      
      const { data: subcontractsData, error: subcontractsError } = await supabase
        .from('subcontracts')
        .select('id, worker_id, worker_name, monthly_amount, tax_rate')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .or(`worker_id.in.(${subcontractUserIds.join(',')}),worker_name.in.(${subcontractUserNames.map(n => `"${n}"`).join(',')})`)

      if (subcontractsError) {
        console.error('Error fetching subcontracts:', subcontractsError)
      } else {
        allSubcontracts = subcontractsData || []
      }
    }

    // 배치 쿼리: 모든 도급 정산 정보를 한 번에 조회
    const subcontractIds = allSubcontracts.map(s => s.id)
    let allSubcontractPayments: Array<{ subcontract_id: string; id: string; status: string; amount: number; paid_at: string | null }> = []
    if (subcontractIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('subcontract_payments')
        .select('id, subcontract_id, status, amount, paid_at')
        .in('subcontract_id', subcontractIds)
        .eq('pay_period', period)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (paymentsError) {
        console.error('Error fetching subcontract payments:', paymentsError)
      } else {
        // 각 subcontract_id별로 가장 최근 것만 선택
        const paymentsBySubcontract = new Map<string, typeof paymentsData[0]>()
        paymentsData?.forEach(payment => {
          if (!paymentsBySubcontract.has(payment.subcontract_id)) {
            paymentsBySubcontract.set(payment.subcontract_id, payment)
          }
        })
        allSubcontractPayments = Array.from(paymentsBySubcontract.values())
      }
    }

    // 배치 쿼리: 모든 인건비 정보를 한 번에 조회
    let allPayrolls: Array<{ user_id: string; id: string; status: string; amount: number | null; paid_at: string | null }> = []
    if (regularUserIds.length > 0) {
      const { data: payrollsData, error: payrollsError } = await supabase
        .from('payrolls')
        .select('id, user_id, status, amount, paid_at')
        .in('user_id', regularUserIds)
        .eq('pay_period', period)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (payrollsError) {
        console.error('Error fetching payrolls:', payrollsError)
      } else {
        // 각 user_id별로 가장 최근 것만 선택
        const payrollsByUser = new Map<string, typeof payrollsData[0]>()
        payrollsData?.forEach(payroll => {
          if (!payrollsByUser.has(payroll.user_id)) {
            payrollsByUser.set(payroll.user_id, payroll)
          }
        })
        allPayrolls = Array.from(payrollsByUser.values())
      }
    }

    // 메모리에서 매핑 생성
    const subcontractsByWorkerId = new Map<string, typeof allSubcontracts[0]>()
    const subcontractsByWorkerName = new Map<string, typeof allSubcontracts[0]>()
    allSubcontracts.forEach(sub => {
      if (sub.worker_id) subcontractsByWorkerId.set(sub.worker_id, sub)
      if (sub.worker_name) subcontractsByWorkerName.set(sub.worker_name, sub)
    })

    const paymentsBySubcontractId = new Map<string, typeof allSubcontractPayments[0]>()
    allSubcontractPayments.forEach(payment => {
      paymentsBySubcontractId.set(payment.subcontract_id, payment)
    })

    const payrollsByUserId = new Map<string, typeof allPayrolls[0]>()
    allPayrolls.forEach(payroll => {
      payrollsByUserId.set(payroll.user_id, payroll)
    })

    // 각 사용자별로 데이터 조합
    const todaySalaryUsersWithStatus = todaySalaryUsers.map(userRecord => {
      const isSubcontract = userRecord.role === 'subcontract_individual' || userRecord.role === 'subcontract_company'

      // 도급 직원/업체인 경우
      if (isSubcontract) {
        const userAmount = userRecord.pay_amount || userRecord.salary_amount || 0
        const subcontract = subcontractsByWorkerId.get(userRecord.id) || subcontractsByWorkerName.get(userRecord.name)
        
        let subcontractAmount = userAmount
        let paymentStatus: 'paid' | 'scheduled' = 'scheduled'
        let paymentId: string | null = null
        
        if (subcontract) {
          const payment = paymentsBySubcontractId.get(subcontract.id)
          if (payment) {
            subcontractAmount = payment.amount || userAmount
            
            if (payment.status === 'paid') {
              if (payment.paid_at) {
                const paidDate = payment.paid_at.split('T')[0]
                if (paidDate === todayKST) {
                  paymentStatus = 'paid'
                } else {
                  return null // 오늘이 아닌 날 지급완료된 것은 제외
                }
              } else {
                paymentStatus = 'scheduled'
              }
            } else {
              paymentStatus = 'scheduled'
            }
            
            paymentId = payment.id
          } else {
            const taxRate = subcontract.tax_rate || (userRecord.role === 'subcontract_individual' ? 0.033 : 0)
            subcontractAmount = Math.floor(userAmount * (1 - taxRate))
          }
        } else {
          const taxRate = userRecord.role === 'subcontract_individual' ? 0.033 : 0
          subcontractAmount = Math.floor(userAmount * (1 - taxRate))
        }

        return {
          id: userRecord.id,
          name: userRecord.name,
          salary_date: userRecord.salary_date,
          salary_amount: null,
          subcontract_amount: subcontractAmount,
          payroll_status: paymentStatus,
          payroll_id: null,
          payment_id: paymentId,
          role: userRecord.role,
        }
      }

      // 일반 직원인 경우
      const payroll = payrollsByUserId.get(userRecord.id)
      let payrollStatus: 'paid' | 'scheduled' = 'scheduled'
      const payrollId = payroll ? payroll.id : null
      
      if (payroll) {
        if (payroll.status === 'paid') {
          if (payroll.paid_at) {
            const paidDate = payroll.paid_at.split('T')[0]
            if (paidDate === todayKST) {
              payrollStatus = 'paid'
            } else {
              return null // 오늘이 아닌 날 지급완료된 것은 제외
            }
          } else {
            payrollStatus = 'scheduled'
          }
        } else {
          payrollStatus = 'scheduled'
        }
      }

      const displaySalaryAmount = payroll && payroll.amount !== null
        ? payroll.amount
        : userRecord.salary_amount

      return {
        id: userRecord.id,
        name: userRecord.name,
        salary_date: userRecord.salary_date,
        salary_amount: displaySalaryAmount,
        subcontract_amount: null,
        payroll_status: payrollStatus,
        payroll_id: payrollId,
        payment_id: null,
        role: userRecord.role,
      }
    }).filter((user): user is NonNullable<typeof user> => user !== null)

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

    // 배치 쿼리로 최적화: 모든 매장의 매출과 수금을 한 번에 조회
    const todayPaymentStoreIds = todayPaymentStoresRaw.map(s => s.id)
    let allPaymentStoreRevenues: Array<{ id: string; store_id: string; amount: number }> = []
    let allPaymentStoreReceipts: Array<{ revenue_id: string; amount: number }> = []
    
    if (todayPaymentStoreIds.length > 0) {
      // 모든 매장의 이번 달 매출을 한 번에 조회
      const { data: revenuesData, error: revenuesError } = await supabase
        .from('revenues')
        .select('id, amount, store_id')
        .in('store_id', todayPaymentStoreIds)
        .eq('service_period', period)
        .is('deleted_at', null)

      if (revenuesError) {
        console.error('Error fetching payment store revenues:', revenuesError)
      } else {
        allPaymentStoreRevenues = revenuesData || []
      }

      // 모든 매장의 수금을 한 번에 조회
      const revenueIds = allPaymentStoreRevenues.map(r => r.id)
      if (revenueIds.length > 0) {
        const { data: receiptsData, error: receiptsError } = await supabase
          .from('receipts')
          .select('revenue_id, amount')
          .in('revenue_id', revenueIds)
          .is('deleted_at', null)

        if (receiptsError) {
          console.error('Error fetching payment store receipts:', receiptsError)
        } else {
          allPaymentStoreReceipts = receiptsData || []
        }
      }
    }

    // 메모리에서 매장별로 그룹화하여 계산 (todayPaymentStores용)
    const paymentRevenuesByStore = new Map<string, Array<{ id: string; amount: number }>>()
    const paymentReceiptsByRevenue = new Map<string, number>()
    
    // 매출을 매장별로 그룹화
    allPaymentStoreRevenues.forEach(revenue => {
      if (!paymentRevenuesByStore.has(revenue.store_id)) {
        paymentRevenuesByStore.set(revenue.store_id, [])
      }
      paymentRevenuesByStore.get(revenue.store_id)!.push({ id: revenue.id, amount: revenue.amount || 0 })
    })

    // 수금을 revenue_id별로 합산
    allPaymentStoreReceipts.forEach(receipt => {
      const current = paymentReceiptsByRevenue.get(receipt.revenue_id) || 0
      paymentReceiptsByRevenue.set(receipt.revenue_id, current + (receipt.amount || 0))
    })

    // 각 매장의 결제 완료 여부 확인
    const todayPaymentStores = todayPaymentStoresRaw.map(store => {
      const storeRevenues = paymentRevenuesByStore.get(store.id) || []
      let isPaid = false
      const isAutoPayment = store.payment_method === 'auto_payment'

      if (storeRevenues.length > 0) {
        // 매출 총액 계산
        const totalRevenue = storeRevenues.reduce((sum, r) => sum + r.amount, 0)
        
        // 수금 총액 계산
        const totalReceived = storeRevenues.reduce((sum, r) => {
          const received = paymentReceiptsByRevenue.get(r.id) || 0
          return sum + received
        }, 0)
        
        // 완납 여부 확인 (매출액과 수금액이 같거나 수금액이 더 큰 경우)
        isPaid = totalReceived >= totalRevenue
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

    // 수금일 매장 정렬: 결제 상태 우선순위 (미결제 > 결제완료) + 매장 이름 순서
    todayPaymentStores.sort((a, b) => {
      // 결제 상태 우선순위: 미결제(false)가 결제완료(true)보다 앞에
      if (a.is_paid !== b.is_paid) {
        return a.is_paid ? 1 : -1
      }
      // 같은 결제 상태 내에서는 매장 이름 순서
      return a.name.localeCompare(b.name, 'ko')
    })


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
    // 한국 시간대 계산 (안전한 방식 - toLocaleString 사용 안 함)
    const kstOffset = 9 * 60 // 분 단위
    const utcForGrowth = nowForGrowth.getTime() + (nowForGrowth.getTimezoneOffset() * 60 * 1000)
    const koreaTimeForGrowth = new Date(utcForGrowth + (kstOffset * 60 * 1000))
    
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
      todaySalaryUsersCount: todaySalaryUsersWithStatus.length,
      todaySalaryUsers: todaySalaryUsersWithStatus.map(u => ({ name: u.name, role: u.role, salary_date: u.salary_date, salary_amount: u.salary_amount, subcontract_amount: u.subcontract_amount })),
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
        total_recurring_expenses: totalRecurringExpenses,
        total_payroll: totalPayroll,
        paid_payroll: paidPayroll,
        paid_payroll_count: paidPayrollCount,
        scheduled_payroll: scheduledPayroll,
        scheduled_payroll_count: scheduledPayrollCount,
        top_unpaid_stores: topUnpaidStores,
        today_salary_users: todaySalaryUsersWithStatus || [],
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

