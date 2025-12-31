import { createServerSupabaseClient } from '@/lib/supabase/server'

async function MonthlyGrowthRateCard({ companyId }: { companyId: string }) {
  const supabase = await createServerSupabaseClient()

  // 월별 성장률 계산을 위한 날짜 계산 (KST 기준)
  const now = new Date()
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const currentYear = koreaTime.getFullYear()
  const currentMonth = koreaTime.getMonth()
  const currentMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0)
  const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
  const previousMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0)
  const previousMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)

  // 이번 달과 전월 수금 조회
  const [currentMonthReceipts, previousMonthReceipts] = await Promise.all([
    supabase
      .from('receipts')
      .select('amount')
      .eq('company_id', companyId)
      .gte('received_at', currentMonthStart.toISOString())
      .lte('received_at', currentMonthEnd.toISOString())
      .is('deleted_at', null),
    supabase
      .from('receipts')
      .select('amount')
      .eq('company_id', companyId)
      .gte('received_at', previousMonthStart.toISOString())
      .lte('received_at', previousMonthEnd.toISOString())
      .is('deleted_at', null),
  ])

  // 월별 성장률 계산
  const currentMonthRevenue = currentMonthReceipts.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  const previousMonthRevenue = previousMonthReceipts.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  
  let monthlyGrowthRate: number | null = null
  if (previousMonthRevenue > 0) {
    monthlyGrowthRate = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
  } else if (currentMonthRevenue > 0) {
    monthlyGrowthRate = null // 신규 (전월 데이터 없음)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">월별 성장률</h3>
      {monthlyGrowthRate !== null ? (
        <p className={`text-3xl font-bold ${monthlyGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {monthlyGrowthRate >= 0 ? '+' : ''}{monthlyGrowthRate.toFixed(1)}%
        </p>
      ) : (
        <p className="text-3xl font-bold text-gray-600">신규</p>
      )}
    </div>
  )
}

export default MonthlyGrowthRateCard
