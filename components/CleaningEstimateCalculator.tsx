'use client'

import { useState, useMemo } from 'react'

type CalcTab = 'area' | 'labor'

const CLEAN_TYPES = [
  { value: 'office', label: '정기 청소' },
  { value: 'stairs', label: '건물 계단 청소' },
] as const
// 계단 청소: 4층 주 1회 = 월 8만, 한 층 추가당 2만. 주 2회면 기본×2. 추가 옵션은 1개당 월 금액
const STAIRS_BASE_MONTHLY_1VISIT = 80_000
const STAIRS_EXTRA_PER_FLOOR = 20_000
// 정기 청소: 기본 = 면적×평당 금액×방문 빈도(월), 추가 옵션 = 월 금액
const TOILET_PER_STALL_OFFICE_MONTHLY = 10_000   // 화장실 1칸 월
const RECYCLING_OPTION_OFFICE_MONTHLY = 15_000   // 분리 수거장 월
const ELEVATOR_OPTION_OFFICE_MONTHLY = 15_000    // 엘리베이터 월
// 계단 추가 옵션 (1개당 월 금액)
const STAIRS_OPTION_ELEVATOR_MONTHLY = 15_000   // 엘리베이터 1개당
const STAIRS_OPTION_PARKING_MONTHLY = 10_000    // 외부 주차장
const STAIRS_OPTION_WINDOW_MONTHLY = 5_000      // 창틀 먼지 제거
const STAIRS_OPTION_TOILET_MONTHLY = 20_000     // 화장실 1개당 (소변기1, 양변기1, 세면대1 기준)
const STAIRS_OPTION_RECYCLING_MONTHLY = 15_000  // 분리 수거장 포함
const PARKING_OPTION = 10_000
const WINDOW_DUST_OPTION = 5_000
const WEEKS_PER_MONTH = 4.3

// 정기 청소: 주 1~7회 업계 평균 회당 평단가 (원)
const OFFICE_AVG_UNIT_BY_VISITS = [2000, 1850, 1750, 1650, 1550, 1480, 1420]
// 계단 청소: 주 1~7회 횟수별 평균 배율 (주 1회 = 1.0)
const STAIRS_VISIT_MULTIPLIER = [1.0, 1.9, 2.7, 3.4, 4.0, 4.6, 5.1]
// 계단 업계 평균 옵션 단가 (월)
const STAIRS_AVG_TOILET = 20_000
const STAIRS_AVG_PARKING = 15_000
const STAIRS_AVG_WINDOW = 5_000
const STAIRS_AVG_RECYCLING = 15_000

const JUDGE_LABELS: Record<string, string> = {
  low: '업계 평균보다 낮은 견적입니다. 인건비·품질을 한 번 더 확인해 보세요.',
  slightlyLow: '업계 평균보다 다소 낮은 수준입니다. 마진이 충분한지 확인해 보세요.',
  avg: '업계 평균 수준의 견적입니다.',
  slightlyHigh: '업계 평균보다 다소 높은 수준입니다. 서비스·품질로 설득할 수 있는 구간입니다.',
  high: '업계 평균보다 높은 견적입니다. 단가 근거(서비스 범위·품질)를 명확히 하는 것이 좋습니다.',
}

const formatWon = (n: number) =>
  new Intl.NumberFormat('ko-KR', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' 원'
const formatNumber = (n: number) =>
  new Intl.NumberFormat('ko-KR', { style: 'decimal', maximumFractionDigits: 0 }).format(n)

// 아이콘 (인라인 SVG)
const IconStar = () => (
  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)
const IconPin = () => (
  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconCalendar = () => (
  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const IconClock = () => (
  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconBath = ({ className }: { className?: string }) => (
  <svg className={`w-4 h-4 flex-shrink-0 ${className ?? 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
  </svg>
)
const IconChart = () => (
  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

export default function CleaningEstimateCalculator() {
  const [activeTab, setActiveTab] = useState<CalcTab>('area')

  const [cleanType, setCleanType] = useState<string>('office')
  const [areaPyeong, setAreaPyeong] = useState<string>('')
  const [officeUnitPrice, setOfficeUnitPrice] = useState<string>('2000')
  const [officeDiscountRate, setOfficeDiscountRate] = useState<number>(0)
  const [visitsPerWeek, setVisitsPerWeek] = useState<number>(1)
  const [toiletStalls, setToiletStalls] = useState<number>(0)
  const [hasRecycling, setHasRecycling] = useState(false)
  const [hasElevator, setHasElevator] = useState(false)
  const [hasParking, setHasParking] = useState(false)
  const [hasWindowDust, setHasWindowDust] = useState(false)
  /** 추가 옵션 - 사용자 추가 항목 (품목명 + 월 금액) */
  const [customExtraItems, setCustomExtraItems] = useState<{ id: number; label: string; amount: string }[]>([])
  const [customExtraNextId, setCustomExtraNextId] = useState(0)
  /** 추가 옵션 - 항목별 금액 수정 (기본값 유지, 빈 값이면 상수 사용) */
  const [customOptionElevator, setCustomOptionElevator] = useState<string>('15000')
  const [customOptionParking, setCustomOptionParking] = useState<string>('10000')
  const [customOptionWindowDust, setCustomOptionWindowDust] = useState<string>('5000')
  const [customOptionRecycling, setCustomOptionRecycling] = useState<string>('15000')
  /** 화장실 단가 (월), 기본 20,000원 */
  const [customOptionToiletAmount, setCustomOptionToiletAmount] = useState<string>('20000')
  const [stairsFloors, setStairsFloors] = useState<number>(4)
  /** 계단 청소 할인률 0~50% */
  const [stairsDiscountRate, setStairsDiscountRate] = useState<number>(0)
  const [regularHourlyWage, setRegularHourlyWage] = useState<string>('')
  const [partTimeHourlyWage, setPartTimeHourlyWage] = useState<string>('')
  const [regularCount, setRegularCount] = useState<number>(1)
  const [partTimeCount, setPartTimeCount] = useState<number>(0)
  const [workHoursNum, setWorkHoursNum] = useState<number>(0)
  const [workMinutesNum, setWorkMinutesNum] = useState<number>(0)
  const [laborVisitsPerWeek, setLaborVisitsPerWeek] = useState<number>(1)
  const [marginRate, setMarginRate] = useState<number>(20)
  /** 내 견적 분석하기 클릭 시 분석 모달 표시 */
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  const areaResult = useMemo(() => {
    const pyeong = Number(areaPyeong) || 0
    const monthlyVisits = visitsPerWeek * WEEKS_PER_MONTH
    if (cleanType === 'office') {
      if (pyeong <= 0) return null
      const extraAmount = customExtraItems.reduce((sum, it) => sum + (Number(it.amount?.replace(/\D/g, '')) || 0), 0)
      const unitPrice = Number(officeUnitPrice) || 2000
      const baseMonthly = pyeong * unitPrice * monthlyVisits
      const elevatorAmt = Number(customOptionElevator?.replace(/\D/g, '')) || ELEVATOR_OPTION_OFFICE_MONTHLY
      const recyclingAmt = Number(customOptionRecycling?.replace(/\D/g, '')) || RECYCLING_OPTION_OFFICE_MONTHLY
      const toiletUnitOffice = Number(customOptionToiletAmount?.replace(/\D/g, '')) || TOILET_PER_STALL_OFFICE_MONTHLY
      const optionMonthly =
        toiletStalls * toiletUnitOffice +
        (hasRecycling ? recyclingAmt : 0) +
        (hasElevator ? elevatorAmt : 0)
      const beforeDiscount = baseMonthly + optionMonthly + extraAmount
      const discountMultiplier = 1 - Math.min(50, Math.max(0, officeDiscountRate)) / 100
      const monthlyTotal = Math.round(beforeDiscount * discountMultiplier)
      const breakdown: { label: string; amount: number }[] = [
        { label: `기본 (면적×평당×방문)`, amount: baseMonthly },
      ]
      if (toiletStalls > 0) breakdown.push({ label: `화장실 ${toiletStalls}칸`, amount: toiletStalls * toiletUnitOffice })
      if (hasRecycling) breakdown.push({ label: '분리수거', amount: recyclingAmt })
      if (hasElevator) breakdown.push({ label: '엘리베이터', amount: elevatorAmt })
      customExtraItems.forEach((it) => {
        const amt = Number(it.amount?.replace(/\D/g, '')) || 0
        if (amt > 0) breakdown.push({ label: it.label?.trim() || '추가 항목', amount: amt })
      })
      if (officeDiscountRate > 0) {
        breakdown.push({ label: '소계', amount: beforeDiscount })
        breakdown.push({ label: `할인 ${officeDiscountRate}%`, amount: -(beforeDiscount - monthlyTotal) })
      }
      return {
        basePerVisit: baseMonthly / monthlyVisits,
        optionPerVisit: optionMonthly / monthlyVisits,
        totalPerVisit: (baseMonthly + optionMonthly) / monthlyVisits,
        monthlyVisits,
        monthlyTotal,
        unitPrice,
        breakdown,
      }
    }
    if (cleanType === 'stairs') {
      const baseMonthly1 =
        STAIRS_BASE_MONTHLY_1VISIT + Math.max(0, stairsFloors - 4) * STAIRS_EXTRA_PER_FLOOR
      const baseMonthly = baseMonthly1 * visitsPerWeek
      const extraAmount = customExtraItems.reduce((sum, it) => sum + (Number(it.amount?.replace(/\D/g, '')) || 0), 0)
      const elevAmt = Number(customOptionElevator?.replace(/\D/g, '')) || STAIRS_OPTION_ELEVATOR_MONTHLY
      const parkAmt = Number(customOptionParking?.replace(/\D/g, '')) || STAIRS_OPTION_PARKING_MONTHLY
      const windowAmt = Number(customOptionWindowDust?.replace(/\D/g, '')) || STAIRS_OPTION_WINDOW_MONTHLY
      const recyAmt = Number(customOptionRecycling?.replace(/\D/g, '')) || STAIRS_OPTION_RECYCLING_MONTHLY
      const toiletUnitStairs = Number(customOptionToiletAmount?.replace(/\D/g, '')) || STAIRS_OPTION_TOILET_MONTHLY
      const optionMonthly =
        (hasElevator ? elevAmt : 0) +
        (hasParking ? parkAmt : 0) +
        (hasWindowDust ? windowAmt : 0) +
        toiletStalls * toiletUnitStairs +
        (hasRecycling ? recyAmt : 0) +
        extraAmount
      const beforeDiscount = baseMonthly + optionMonthly
      const discountMultiplier = 1 - Math.min(50, Math.max(0, stairsDiscountRate)) / 100
      const monthlyTotal = Math.round(beforeDiscount * discountMultiplier)
      const breakdown: { label: string; amount: number }[] = [
        { label: `${stairsFloors}층`, amount: baseMonthly },
      ]
      if (toiletStalls > 0) breakdown.push({ label: `화장실 ${toiletStalls}개`, amount: toiletStalls * toiletUnitStairs })
      if (hasElevator) breakdown.push({ label: '엘리베이터', amount: elevAmt })
      if (hasParking) breakdown.push({ label: '외부 주차장', amount: parkAmt })
      if (hasWindowDust) breakdown.push({ label: '창틀 먼지 제거', amount: windowAmt })
      if (hasRecycling) breakdown.push({ label: '분리수거', amount: recyAmt })
      customExtraItems.forEach((it) => {
        const amt = Number(it.amount?.replace(/\D/g, '')) || 0
        if (amt > 0) breakdown.push({ label: it.label?.trim() || '추가 항목', amount: amt })
      })
      if (stairsDiscountRate > 0) {
        breakdown.push({ label: '소계', amount: beforeDiscount })
        breakdown.push({ label: `할인 ${stairsDiscountRate}%`, amount: -(beforeDiscount - monthlyTotal) })
      }
      return {
        basePerVisit: baseMonthly1 / WEEKS_PER_MONTH,
        optionPerVisit: optionMonthly / monthlyVisits,
        totalPerVisit: baseMonthly1 / WEEKS_PER_MONTH + optionMonthly / monthlyVisits,
        monthlyVisits,
        monthlyTotal,
        floorPrice: baseMonthly1,
        beforeDiscount,
        discountRate: stairsDiscountRate,
        breakdown,
      }
    }
    return null
  }, [cleanType, areaPyeong, visitsPerWeek, officeUnitPrice, officeDiscountRate, toiletStalls, hasRecycling, hasElevator, hasParking, hasWindowDust, stairsFloors, stairsDiscountRate, customExtraItems, customOptionElevator, customOptionParking, customOptionWindowDust, customOptionRecycling, customOptionToiletAmount])

  const laborResult = useMemo(() => {
    const regularWage = Number(regularHourlyWage) || 0
    const partWage = Number(partTimeHourlyWage) || 0
    const totalHours = workHoursNum + workMinutesNum / 60
    const monthlyVisits = laborVisitsPerWeek * WEEKS_PER_MONTH
    if (totalHours <= 0 || (regularCount <= 0 && partTimeCount <= 0)) return null
    const hourlyLabor = regularWage * regularCount + partWage * partTimeCount
    const laborPerVisit = hourlyLabor * totalHours
    const monthlyTotalLabor = laborPerVisit * monthlyVisits
    const marginAmount = monthlyTotalLabor * (marginRate / 100)
    const suggestedQuote = Math.round(monthlyTotalLabor + marginAmount)
    const breakdown: { label: string; amount: number }[] = []
    if (regularCount > 0) {
      const monthlyRegular = regularWage * regularCount * totalHours * monthlyVisits
      breakdown.push({ label: `정직원 인건비 (${regularCount}명)`, amount: Math.round(monthlyRegular) })
    }
    if (partTimeCount > 0) {
      const monthlyPart = partWage * partTimeCount * totalHours * monthlyVisits
      breakdown.push({ label: `알바 인건비 (${partTimeCount}명)`, amount: Math.round(monthlyPart) })
    }
    breakdown.push({ label: '소계 (월 인건비)', amount: Math.round(monthlyTotalLabor) })
    if (marginRate > 0) {
      breakdown.push({ label: `마진 ${marginRate}%`, amount: Math.round(marginAmount) })
    }
    return { hourlyLabor, laborPerVisit, monthlyVisits, monthlyTotalLabor, suggestedQuote, marginRate, breakdown }
  }, [regularHourlyWage, partTimeHourlyWage, regularCount, partTimeCount, workHoursNum, workMinutesNum, laborVisitsPerWeek, marginRate])

  const displayAmount = activeTab === 'area' ? (areaResult?.monthlyTotal ?? 0) : (laborResult?.suggestedQuote ?? 0)
  const hasAreaResult = !!areaResult
  const hasLaborResult = !!laborResult

  /** 면적 기준(정기/계단) 업계 평균 대비 판정 — 모달에서 사용, 면적 결과 있을 때만 */
  const industryCompare = useMemo(() => {
    if (!areaResult) return null
    const userAmount = areaResult.monthlyTotal
    if (userAmount <= 0) return null

    if (cleanType === 'office') {
      const pyeong = Number(areaPyeong) || 0
      const monthlyVisits = visitsPerWeek * WEEKS_PER_MONTH
      if (pyeong <= 0 || monthlyVisits <= 0) return null
      const userUnitPerVisit = userAmount / monthlyVisits / pyeong
      const idx = Math.min(6, Math.max(0, visitsPerWeek - 1))
      const avgUnit = OFFICE_AVG_UNIT_BY_VISITS[idx]
      const diffRate = (userUnitPerVisit - avgUnit) / avgUnit
      let judgment: keyof typeof JUDGE_LABELS
      if (diffRate <= -0.15) judgment = 'low'
      else if (diffRate < -0.05) judgment = 'slightlyLow'
      else if (diffRate <= 0.05) judgment = 'avg'
      else if (diffRate <= 0.15) judgment = 'slightlyHigh'
      else judgment = 'high'
      return { diffRate, judgment, message: JUDGE_LABELS[judgment], avgAmount: avgUnit * monthlyVisits * pyeong }
    }

    if (cleanType === 'stairs') {
      const base1 = 80_000 + Math.max(0, stairsFloors - 4) * 20_000
      const optionsSum =
        toiletStalls * STAIRS_AVG_TOILET +
        (hasParking ? STAIRS_AVG_PARKING : 0) +
        (hasWindowDust ? STAIRS_AVG_WINDOW : 0) +
        (hasRecycling ? STAIRS_AVG_RECYCLING : 0)
      const basePerWeek = base1 + optionsSum
      const idx = Math.min(6, Math.max(0, visitsPerWeek - 1))
      const multiplier = STAIRS_VISIT_MULTIPLIER[idx]
      const avgAmount = Math.round(basePerWeek * multiplier)
      if (avgAmount <= 0) return null
      const diffRate = (userAmount - avgAmount) / avgAmount
      let judgment: keyof typeof JUDGE_LABELS
      if (diffRate <= -0.15) judgment = 'low'
      else if (diffRate < -0.05) judgment = 'slightlyLow'
      else if (diffRate <= 0.05) judgment = 'avg'
      else if (diffRate <= 0.15) judgment = 'slightlyHigh'
      else judgment = 'high'
      return { diffRate, judgment, message: JUDGE_LABELS[judgment], avgAmount }
    }

    return null
  }, [areaResult, cleanType, areaPyeong, visitsPerWeek, stairsFloors, toiletStalls, hasParking, hasWindowDust, hasRecycling])

  const inputBase =
    'w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm'

  return (
    <section id="cleaning-estimate-calculator" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/40 via-white to-slate-50/50 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        {/* 헤더: 아이콘 + 제목 + 부제 + 스텝퍼 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500 text-white mb-4 shadow-lg">
            <IconStar />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
            청소업 표준 견적 계산기
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mb-8">
            면적 기준 또는 인건비 기준으로 견적을 산정하고, PDF로 다운로드할 수 있습니다.
          </p>
          {/* 스텝퍼 */}
          <div className="flex items-center justify-center gap-0 max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-semibold">1</span>
              <span className="text-sm font-medium text-blue-600">견적 정보 입력</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-2 min-w-[24px]" />
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">2</span>
              <span className="text-sm text-gray-400 hidden sm:inline">견적 비교</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-2 min-w-[24px]" />
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">3</span>
              <span className="text-sm text-gray-400 hidden sm:inline">견적서 다운로드</span>
            </div>
          </div>
        </div>

        {/* 2단: 좌(입력) | 우(실시간 견적 + 비교) */}
        <div className="grid lg:grid-cols-[1fr,340px] gap-8 items-start pb-32 lg:pb-0">
          {/* 왼쪽: 견적 계산 방식 + 기본 정보 + 추가 옵션 */}
          <div className="space-y-6">
            {/* 견적 계산 방식 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <IconStar />
                <h3 className="font-semibold text-gray-900">견적 계산 방식</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('area')}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    activeTab === 'area'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <p className={`font-semibold ${activeTab === 'area' ? 'text-blue-600' : 'text-gray-700'}`}>
                    면적 기준 계산
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">정확한 면적으로 견적 산정</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('labor')}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    activeTab === 'labor'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <p className={`font-semibold ${activeTab === 'labor' ? 'text-blue-600' : 'text-gray-700'}`}>
                    인건비 기준 계산
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">표준 인건비로 견적 산정</p>
                </button>
              </div>
              <p className="text-sm text-gray-500">
                {activeTab === 'area'
                  ? '면적 기준은 청소할 공간의 실제 평수를 기준으로 견적을 계산합니다. 가장 정확한 방식입니다.'
                  : '인건비 기준은 시급·인원·작업시간과 마진율을 반영한 최소 견적을 산출합니다.'}
              </p>
            </div>

            {/* 기본 정보 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">기본 정보</h3>
              <div className="space-y-4">
                {activeTab === 'area' ? (
                  <>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <IconStar /> 청소 유형
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {CLEAN_TYPES.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => {
                              setCleanType(t.value)
                              if (t.value === 'stairs' && visitsPerWeek > 3) setVisitsPerWeek(3)
                            }}
                            className={`rounded-xl border-2 p-4 text-left transition-all ${
                              cleanType === t.value
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            }`}
                          >
                            <p className={`font-semibold ${cleanType === t.value ? 'text-blue-600' : 'text-gray-700'}`}>
                              {t.label}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                    {cleanType === 'office' && (
                      <>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <IconPin /> 면적(평)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={areaPyeong}
                            onChange={(e) => setAreaPyeong(e.target.value)}
                            placeholder="예: 100"
                            className={inputBase}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            평당 금액
                          </label>
                          <div className="flex items-center gap-1 flex-wrap">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={officeUnitPrice === '' ? '' : formatNumber(Number(officeUnitPrice) || 0)}
                              onChange={(e) => setOfficeUnitPrice(e.target.value.replace(/\D/g, ''))}
                              placeholder="예: 2,000"
                              className={inputBase}
                            />
                            <span className="text-gray-600 text-sm">원</span>
                          </div>
                        </div>
                      </>
                    )}
                    {cleanType === 'stairs' && (
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                          <IconPin /> 층수 (계단)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={stairsFloors}
                          onChange={(e) => setStairsFloors(Number(e.target.value) || 0)}
                          className={inputBase}
                        />
                      </div>
                    )}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                        <IconCalendar /> 방문 빈도
                      </label>
                      <select
                        value={visitsPerWeek}
                        onChange={(e) => setVisitsPerWeek(Number(e.target.value))}
                        className={inputBase}
                      >
                        {(cleanType === 'stairs' ? [1, 2, 3] : [1, 2, 3, 4, 5, 6, 7]).map((n) => (
                          <option key={n} value={n}>주 {n}회</option>
                        ))}
                      </select>
                    </div>
                    {cleanType === 'office' ? (
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                          <IconClock /> 할인률
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={50}
                            value={officeDiscountRate}
                            onChange={(e) => setOfficeDiscountRate(Number(e.target.value))}
                            className="flex-1 h-2 rounded-lg bg-gray-200 accent-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700 w-12">{officeDiscountRate}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">0~50% 적용 가능</p>
                        <div className="flex gap-2 mt-2">
                          {([10, 20, 30] as const).map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setOfficeDiscountRate(pct)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                officeDiscountRate === pct ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                          <IconClock /> 할인률
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={50}
                            value={stairsDiscountRate}
                            onChange={(e) => setStairsDiscountRate(Number(e.target.value))}
                            className="flex-1 h-2 rounded-lg bg-gray-200 accent-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700 w-12">{stairsDiscountRate}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">0~50% 적용 가능</p>
                        <div className="flex gap-2 mt-2">
                          {([10, 20, 30] as const).map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setStairsDiscountRate(pct)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                stairsDiscountRate === pct
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4 space-y-4">
                      <p className="text-sm font-semibold text-slate-700">정직원</p>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">정직원 시급</label>
                        <div className="flex items-center gap-1 flex-wrap">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={regularHourlyWage === '' ? '' : formatNumber(Number(regularHourlyWage) || 0)}
                            onChange={(e) => setRegularHourlyWage(e.target.value.replace(/\D/g, ''))}
                            placeholder="예: 12,000"
                            className={inputBase}
                          />
                          <span className="text-gray-600 text-sm">원</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">정직원 인원</label>
                        <div className="flex flex-wrap gap-2">
                          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setRegularCount(n)}
                              className={`min-w-[2.5rem] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                regularCount === n ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {n}명
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4 space-y-4">
                      <p className="text-sm font-semibold text-slate-700">알바</p>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">알바 시급</label>
                        <div className="flex items-center gap-1 flex-wrap">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={partTimeHourlyWage === '' ? '' : formatNumber(Number(partTimeHourlyWage) || 0)}
                            onChange={(e) => setPartTimeHourlyWage(e.target.value.replace(/\D/g, ''))}
                            placeholder="예: 9,860"
                            className={inputBase}
                          />
                          <span className="text-gray-600 text-sm">원</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">알바 인원</label>
                        <div className="flex flex-wrap gap-2">
                          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setPartTimeCount(n)}
                              className={`min-w-[2.5rem] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                partTimeCount === n ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {n}명
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4 space-y-4">
                      <p className="text-sm font-semibold text-slate-700">작업 시간</p>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">작업 시간 (1회)</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="number"
                            min={0}
                            max={12}
                            value={workHoursNum}
                            onChange={(e) => setWorkHoursNum(Math.min(12, Math.max(0, Number(e.target.value) || 0)))}
                            placeholder="0"
                            className="w-16 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-gray-600">시간</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={workMinutesNum}
                            onChange={(e) => setWorkMinutesNum(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                            placeholder="0"
                            className="w-16 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-gray-600">분</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[
                            { label: '10분', addMinutes: 10 },
                            { label: '30분', addMinutes: 30 },
                            { label: '1시간', addMinutes: 60 },
                          ].map(({ label, addMinutes }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                const total = workHoursNum * 60 + workMinutesNum + addMinutes
                                const capped = Math.min(12 * 60 + 59, Math.max(0, total))
                                setWorkHoursNum(Math.floor(capped / 60))
                                setWorkMinutesNum(capped % 60)
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              + {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">버튼을 누르면 시간이 추가됩니다</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4">
                      <p className="text-sm font-semibold text-slate-700 mb-3">주 방문 횟수</p>
                      <select value={laborVisitsPerWeek} onChange={(e) => setLaborVisitsPerWeek(Number(e.target.value))} className={inputBase}>
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                          <option key={n} value={n}>주 {n}회</option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4 space-y-4">
                      <p className="text-sm font-semibold text-slate-700">마진율</p>
                      <div className="flex items-center gap-3">
                        <input type="range" min={0} max={50} value={marginRate} onChange={(e) => setMarginRate(Number(e.target.value))} className="flex-1 h-2 rounded-lg bg-gray-200 accent-blue-600" />
                        <span className="text-sm font-medium text-gray-700 w-12">{marginRate}%</span>
                      </div>
                      <div className="flex gap-2">
                        {([10, 20, 30] as const).map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setMarginRate(pct)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              marginRate === pct ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 추가 옵션 (면적 기준일 때만) */}
            {activeTab === 'area' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">추가 옵션</h3>
                <div className="space-y-3">
                  {/* 품목·금액 열 정렬: 1열 품목(최소 너비), 2열 금액 */}
                  <div className="grid grid-cols-[minmax(160px,1fr)_auto] gap-x-4 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <IconBath className="shrink-0 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">화장실</span>
                      <input type="number" min={0} value={toiletStalls} onChange={(e) => setToiletStalls(Math.max(0, Number(e.target.value) || 0))} className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      <span className="text-gray-600 text-sm shrink-0">개</span>
                    </div>
                    <div className="flex items-center gap-1 w-[120px] justify-end">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customOptionToiletAmount === '' ? '' : formatNumber(Number(customOptionToiletAmount?.replace(/\D/g, '')) || (cleanType === 'stairs' ? 20000 : 10000))}
                        onChange={(e) => setCustomOptionToiletAmount(e.target.value.replace(/\D/g, ''))}
                        placeholder={cleanType === 'stairs' ? '20,000' : '10,000'}
                        className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums"
                      />
                      <span className="text-gray-600 text-sm">원</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(160px,1fr)_auto] gap-x-4 items-center">
                    <label className="flex items-center gap-2 cursor-pointer min-w-0">
                      <input type="checkbox" checked={hasElevator} onChange={(e) => setHasElevator(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-700">엘리베이터</span>
                    </label>
                    <div className="flex items-center gap-1 w-[120px] justify-end">
                      <input type="text" inputMode="numeric" value={customOptionElevator === '' ? '' : formatNumber(Number(customOptionElevator?.replace(/\D/g, '')) || 15000)} onChange={(e) => setCustomOptionElevator(e.target.value.replace(/\D/g, ''))} placeholder="15,000" className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums" />
                      <span className="text-gray-600 text-sm">원</span>
                    </div>
                  </div>
                  {cleanType === 'stairs' && (
                    <>
                      <div className="grid grid-cols-[minmax(160px,1fr)_auto] gap-x-4 items-center">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input type="checkbox" checked={hasParking} onChange={(e) => setHasParking(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-700">외부 주차장</span>
                        </label>
                        <div className="flex items-center gap-1 w-[120px] justify-end">
                          <input type="text" inputMode="numeric" value={customOptionParking === '' ? '' : formatNumber(Number(customOptionParking?.replace(/\D/g, '')) || 10000)} onChange={(e) => setCustomOptionParking(e.target.value.replace(/\D/g, ''))} placeholder="10,000" className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums" />
                          <span className="text-gray-600 text-sm">원</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-[minmax(160px,1fr)_auto] gap-x-4 items-center">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input type="checkbox" checked={hasWindowDust} onChange={(e) => setHasWindowDust(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-700">창틀 먼지 제거</span>
                        </label>
                        <div className="flex items-center gap-1 w-[120px] justify-end">
                          <input type="text" inputMode="numeric" value={customOptionWindowDust === '' ? '' : formatNumber(Number(customOptionWindowDust?.replace(/\D/g, '')) || 5000)} onChange={(e) => setCustomOptionWindowDust(e.target.value.replace(/\D/g, ''))} placeholder="5,000" className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums" />
                          <span className="text-gray-600 text-sm">원</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-[minmax(160px,1fr)_auto] gap-x-4 items-center">
                    <label className="flex items-center gap-2 cursor-pointer min-w-0">
                      <input type="checkbox" checked={hasRecycling} onChange={(e) => setHasRecycling(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-700">분리수거</span>
                    </label>
                    <div className="flex items-center gap-1 w-[120px] justify-end">
                      <input type="text" inputMode="numeric" value={customOptionRecycling === '' ? '' : formatNumber(Number(customOptionRecycling?.replace(/\D/g, '')) || 15000)} onChange={(e) => setCustomOptionRecycling(e.target.value.replace(/\D/g, ''))} placeholder="15,000" className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums" />
                      <span className="text-gray-600 text-sm">원</span>
                    </div>
                  </div>
                  {customExtraItems.map((it) => (
                    <div key={it.id} className="grid grid-cols-[minmax(160px,1fr)_auto] gap-x-4 items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="text"
                          value={it.label}
                          onChange={(e) => setCustomExtraItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, label: e.target.value } : x)))}
                          placeholder="품목명"
                          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomExtraItems((prev) => prev.filter((x) => x.id !== it.id))}
                          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-1 w-[120px] justify-end">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={it.amount === '' ? '' : formatNumber(Number(it.amount?.replace(/\D/g, '')) || 0)}
                          onChange={(e) => setCustomExtraItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, amount: e.target.value.replace(/\D/g, '') } : x)))}
                          placeholder="0"
                          className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums"
                        />
                        <span className="text-gray-600 text-sm">원</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomExtraItems((prev) => [...prev, { id: customExtraNextId, label: '', amount: '' }])
                        setCustomExtraNextId((n) => n + 1)
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-600 text-sm font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      추가하기
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAnalysisModal(true)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              내 견적 분석하기
            </button>
          </div>

          {/* 오른쪽: 실시간 견적 + 견적 비교 */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <IconStar />
                  <h3 className="font-semibold text-gray-900">실시간 견적</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-1">예상 금액</p>
                <p className="text-5xl sm:text-6xl font-bold text-slate-800">
                  {displayAmount > 0 ? (
                    <>{formatNumber(displayAmount)} <span className="text-3xl sm:text-4xl font-semibold text-slate-600">원</span></>
                  ) : (
                    <><span className="text-slate-800">0</span> <span className="text-3xl sm:text-4xl font-semibold text-slate-600">원</span></>
                  )}
                </p>
                {displayAmount > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    부가세 10% 포함 <span className="font-medium text-slate-600 tabular-nums">{formatNumber(Math.round(displayAmount * 1.1))} 원</span>
                  </p>
                )}
                {activeTab === 'area' && areaResult && 'breakdown' in areaResult && (areaResult as { breakdown?: { label: string; amount: number }[] }).breakdown?.length ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">상세 견적</p>
                    <ul className="space-y-1.5 text-sm">
                      {(areaResult as { breakdown: { label: string; amount: number }[] }).breakdown.map((row, i) => (
                        <li key={i} className="flex justify-between items-center gap-2">
                          <span className="text-gray-700">{row.label}</span>
                          <span className={row.amount < 0 ? 'text-blue-600 font-medium' : 'text-slate-800 font-medium tabular-nums'}>
                            {row.amount < 0 ? '-' : ''}{formatNumber(Math.abs(row.amount))} 원
                          </span>
                        </li>
                      ))}
                      <li className="flex justify-between items-center gap-2 pt-1.5 border-t border-gray-100 font-semibold text-slate-800">
                        <span>합계</span>
                        <span className="tabular-nums">{formatNumber(areaResult.monthlyTotal)} 원</span>
                      </li>
                    </ul>
                  </div>
                ) : null}
                {activeTab === 'labor' && laborResult && laborResult.breakdown?.length ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">상세 내역</p>
                    <ul className="space-y-1.5 text-sm">
                      {laborResult.breakdown.map((row, i) => (
                        <li key={i} className="flex justify-between items-center gap-2">
                          <span className="text-gray-700">{row.label}</span>
                          <span className="text-slate-800 font-medium tabular-nums">
                            {formatNumber(row.amount)} 원
                          </span>
                        </li>
                      ))}
                      <li className="flex justify-between items-center gap-2 pt-1.5 border-t border-gray-100 font-semibold text-slate-800">
                        <span>합계</span>
                        <span className="tabular-nums">{formatNumber(laborResult.suggestedQuote)} 원</span>
                      </li>
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <IconChart />
                  <h3 className="font-semibold text-gray-900">견적 비교</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600">면적 기준</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {hasAreaResult ? formatWon(areaResult!.monthlyTotal) : formatWon(0)}
                    </span>
                    {hasAreaResult && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">추천</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">인건비 기준</span>
                  <span className="font-semibold text-slate-800">
                    {hasLaborResult ? formatWon(laborResult!.suggestedQuote) : formatWon(0)}
                  </span>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">💡</span>
                  <p className="text-sm text-amber-800">
                    인건비 기준보다 낮은 견적은 마진이 줄어들 수 있습니다.
                  </p>
                </div>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• 부가세 별도</li>
                  <li>• 최종 금액은 현장 확인 후 조정될 수 있습니다</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
            >
              견적서 다운로드 (PDF)
            </button>
          </div>
        </div>

        {/* 모바일 전용: 하단 고정 실시간 견적 + 견적 비교 */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-6xl mx-auto space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <IconStar />
                <span className="text-lg font-semibold text-gray-700">실시간 견적</span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-5xl font-bold text-slate-800 tabular-nums">
                  {displayAmount > 0 ? (
                    <>{formatNumber(displayAmount)} <span className="text-3xl font-semibold text-slate-600">원</span></>
                  ) : (
                    <><span className="text-slate-800">0</span> <span className="text-3xl font-semibold text-slate-600">원</span></>
                  )}
                </p>
                {displayAmount > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">부가세 10% 포함 {formatNumber(Math.round(displayAmount * 1.1))} 원</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm sm:text-base border-t border-gray-100 pt-2.5">
              <span className="font-semibold text-gray-600">견적 비교</span>
              <div className="flex items-center gap-2 text-right">
                <span><span className="text-gray-500">면적</span> <span className="font-semibold text-slate-800 tabular-nums">{hasAreaResult ? formatWon(areaResult!.monthlyTotal) : formatWon(0)}</span></span>
                <span className="text-gray-300">|</span>
                <span><span className="text-gray-500">인건비</span> <span className="font-semibold text-slate-800 tabular-nums">{hasLaborResult ? formatWon(laborResult!.suggestedQuote) : formatWon(0)}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* 내 견적 분석 모달 (방법 A: 버튼 클릭 시에만 표시) */}
        {showAnalysisModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowAnalysisModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-modal-title"
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 id="analysis-modal-title" className="text-lg font-semibold text-gray-900">견적 분석 결과</h2>
                <button
                  type="button"
                  onClick={() => setShowAnalysisModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="닫기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-4">
                {activeTab === 'area' && areaResult ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">입력 요약</p>
                      <p className="text-sm text-gray-700">
                        {cleanType === 'office' ? '정기 청소' : '건물 계단 청소'}
                        {cleanType === 'office' ? ` · ${areaPyeong || 0}평` : ` · ${stairsFloors}층`}
                        {` · 주 ${visitsPerWeek}회 방문`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">예상 금액</p>
                      <p className="text-lg font-bold text-slate-800">{formatWon(areaResult.monthlyTotal)}</p>
                      <p className="text-sm text-gray-500">부가세 10% 포함 {formatWon(Math.round(areaResult.monthlyTotal * 1.1))}</p>
                    </div>
                    {industryCompare && (
                      <div className="rounded-lg border border-gray-200 bg-slate-50/80 p-3">
                        <p className="text-xs font-medium text-gray-600 mb-1">업계 평균 대비</p>
                        <p className="text-sm text-gray-700 leading-snug">{industryCompare.message}</p>
                      </div>
                    )}
                    {areaResult && 'breakdown' in areaResult && (areaResult as { breakdown?: { label: string; amount: number }[] }).breakdown?.length ? (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">상세 내역</p>
                        <ul className="space-y-1.5 text-sm">
                          {(areaResult as { breakdown: { label: string; amount: number }[] }).breakdown.map((row, i) => (
                            <li key={i} className="flex justify-between items-center gap-2">
                              <span className="text-gray-700">{row.label}</span>
                              <span className={row.amount < 0 ? 'text-blue-600 font-medium' : 'text-slate-800 font-medium tabular-nums'}>
                                {row.amount < 0 ? '-' : ''}{formatNumber(Math.abs(row.amount))} 원
                              </span>
                            </li>
                          ))}
                          <li className="flex justify-between items-center gap-2 pt-1.5 border-t border-gray-100 font-semibold text-slate-800">
                            <span>합계</span>
                            <span className="tabular-nums">{formatNumber(areaResult.monthlyTotal)} 원</span>
                          </li>
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : activeTab === 'labor' && laborResult ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">입력 요약</p>
                      <p className="text-sm text-gray-700">
                        정직원 {regularCount}명 · 알바 {partTimeCount}명 · 작업 {workHoursNum}시간 {workMinutesNum}분 · 주 {laborVisitsPerWeek}회 · 마진 {marginRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">예상 금액</p>
                      <p className="text-lg font-bold text-slate-800">{formatWon(laborResult.suggestedQuote)}</p>
                      <p className="text-sm text-gray-500">부가세 10% 포함 {formatWon(Math.round(laborResult.suggestedQuote * 1.1))}</p>
                    </div>
                    <div className="rounded-lg border border-amber-100 bg-amber-50/80 p-3">
                      <p className="text-sm text-amber-800">
                        업계 평균 대비 분석은 면적 기준 견적에서만 제공됩니다. 면적 기준 탭에서 견적을 입력하시면 업계 대비 분석을 확인하실 수 있습니다.
                      </p>
                    </div>
                    {laborResult.breakdown?.length ? (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">상세 내역</p>
                        <ul className="space-y-1.5 text-sm">
                          {laborResult.breakdown.map((row, i) => (
                            <li key={i} className="flex justify-between items-center gap-2">
                              <span className="text-gray-700">{row.label}</span>
                              <span className="text-slate-800 font-medium tabular-nums">{formatNumber(row.amount)} 원</span>
                            </li>
                          ))}
                          <li className="flex justify-between items-center gap-2 pt-1.5 border-t border-gray-100 font-semibold text-slate-800">
                            <span>합계</span>
                            <span className="tabular-nums">{formatNumber(laborResult.suggestedQuote)} 원</span>
                          </li>
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-gray-600">
                      {activeTab === 'area'
                        ? '면적(평수), 방문 빈도 등 견적 정보를 입력한 후 분석해 주세요.'
                        : '시급, 인원, 작업 시간 등 견적 정보를 입력한 후 분석해 주세요.'}
                    </p>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowAnalysisModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
