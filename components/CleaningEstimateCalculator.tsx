'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { KAKAO_CHAT_URL } from '@/lib/constants'

const LOADING_STEP_LABELS = ['① 입력값 확인', '② 업계 기준 매칭', '③ 운영 난이도 반영'] as const

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

/** 판정 5단계별 견적 타입 카드 — 블록: title + items 또는 body */
type JudgeTypeBlock = { title: string; items?: string[]; body?: string }
type JudgeType = { emoji: string; title: string; tagline: string; blocks: JudgeTypeBlock[] }

const JUDGE_TYPES: Record<string, JudgeType> = {
  low: {
    emoji: '💪',
    title: '돌격 수주형',
    tagline: '"일단 계약부터 따내자."\n당신은 현장에서 승부를 보는 대표입니다.',
    blocks: [
      { title: '이런 특징이 있습니다', items: ['가격 경쟁에서 밀리지 않음', '수주 성사율이 높은 편', '빠르게 거래처를 확보하는 스타일'] },
      { title: '하지만 한 가지 질문이 있습니다.', body: '이 구조로 1년을 버틸 수 있습니까?' },
      { title: '장기적으로 생길 수 있는 문제', items: ['인건비가 조금만 올라가도 압박', '직원 이탈 시 바로 흔들림', '대표의 체력에 의존하는 구조'] },
      { title: '지금 필요한 것', body: '감(感)이 아니라\n최소 유지 가능한 단가를 정확히 아는 것입니다.' },
    ],
  },
  slightlyLow: {
    emoji: '⚡',
    title: '공격적 확장형',
    tagline: '지금은 시장을 넓히는 시기입니다.\n당신은 확장을 선택한 대표입니다.',
    blocks: [
      { title: '이런 운영 스타일입니다', items: ['신규 거래처 확보에 적극적', '가격으로 진입 후 관계를 쌓는 전략', '단기간 물량 확보에 강점'] },
      { title: '하지만 확장이 커질수록 관리도 커집니다.' },
      { title: '놓치기 쉬운 부분', items: ['현장 통제 누락', '관리 기록 부재', '얇아지는 마진'] },
      { title: '지금 필요한 것', body: '수주보다 중요한 건\n구조 점검입니다.' },
    ],
  },
  avg: {
    emoji: '🧱',
    title: '표준 운영형',
    tagline: '시장 흐름에 맞춰 안정적으로 운영 중입니다.',
    blocks: [
      { title: '이런 특징이 있습니다', items: ['무리하지 않는 단가', '비교적 안정적인 계약 구조', '지속 운영에 적합'] },
      { title: '현재는 균형 상태입니다.', body: '하지만 여기서 선택이 필요합니다.\n유지할 것인가\n한 단계 올릴 것인가' },
      { title: '기회 요소', items: ['운영 효율 개선', '관리 체계 정비', '클레임 감소'] },
      { title: '같은 구조라도', body: '운영 방식에 따라 결과는 달라집니다.' },
    ],
  },
  slightlyHigh: {
    emoji: '🎯',
    title: '전략적 수익형',
    tagline: '단가를 방어할 줄 아는 대표입니다.',
    blocks: [
      { title: '이런 운영을 하고 있습니다', items: ['거래처와 협상 가능', '품질로 설득', '신뢰 기반 계약 유지'] },
      { title: '좋은 구간입니다.', body: '하지만 유지가 더 어렵습니다.' },
      { title: '유지 조건', items: ['출퇴근 기록 관리', '전후 사진 증빙', '요청 처리 이력 관리'] },
      { title: '단가는 설득으로 만들고,', body: '유지는 시스템으로 합니다.' },
    ],
  },
  high: {
    emoji: '👑',
    title: '프리미엄 운영형',
    tagline: '가격이 아니라 관리 체계로 계약하는 구조입니다.',
    blocks: [
      { title: '이런 특징이 있습니다', items: ['브랜드 중심 운영', '거래처 신뢰 확보', '고급 관리 전략'] },
      { title: '이 단계는', body: '"설명"이 아니라 "증명"이 필요합니다.' },
      { title: '반드시 필요한 것', items: ['기록 출퇴근 관리', '체크리스트 품질 관리', '클레임 대응 이력 관리', '리포트 자동화'] },
      { title: '프리미엄 단가는', body: '감으로 유지되지 않습니다.' },
    ],
  },
}
/** 판정 5단계별 색상: 저가(빨강) → 다소낮음(주황) → 평균(초록) → 다소높음(파랑) → 고가(보라) */
const JUDGE_STYLES: Record<string, { bg: string; border: string; borderL: string; icon: string; text: string }> = {
  low: { bg: 'from-red-50 to-red-100/80', border: 'border-red-200', borderL: 'border-l-red-500', icon: 'bg-red-500', text: 'text-red-900' },
  slightlyLow: { bg: 'from-orange-50 to-amber-50', border: 'border-orange-200', borderL: 'border-l-orange-500', icon: 'bg-orange-500', text: 'text-orange-900' },
  avg: { bg: 'from-green-50 to-emerald-50', border: 'border-green-200', borderL: 'border-l-green-500', icon: 'bg-green-500', text: 'text-green-900' },
  slightlyHigh: { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', borderL: 'border-l-blue-500', icon: 'bg-blue-500', text: 'text-blue-900' },
  high: { bg: 'from-purple-50 to-violet-50', border: 'border-purple-200', borderL: 'border-l-purple-500', icon: 'bg-purple-500', text: 'text-purple-900' },
}

const formatWon = (n: number) =>
  new Intl.NumberFormat('ko-KR', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' 원'
const formatNumber = (n: number) =>
  new Intl.NumberFormat('ko-KR', { style: 'decimal', maximumFractionDigits: 0 }).format(n)

const DAILY_UNLOCK_LIMIT = 5
const DAILY_UNLOCK_KEY = 'cleaning-estimate-daily-unlocks'

function getTodayStr(): string {
  if (typeof window === 'undefined') return ''
  return new Date().toISOString().slice(0, 10)
}

function getDailyUnlockCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(DAILY_UNLOCK_KEY)
    if (!raw) return 0
    const data = JSON.parse(raw) as { date?: string; count?: number }
    if (!data || data.date !== getTodayStr()) return 0
    return Math.max(0, Number(data.count) || 0)
  } catch {
    return 0
  }
}

function incrementDailyUnlock(): void {
  if (typeof window === 'undefined') return
  const today = getTodayStr()
  const current = getDailyUnlockCount()
  try {
    localStorage.setItem(DAILY_UNLOCK_KEY, JSON.stringify({ date: today, count: current + 1 }))
  } catch {
    // ignore
  }
}

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
  const [officeUnitPrice, setOfficeUnitPrice] = useState<string>('0')
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
  const [customOptionElevator, setCustomOptionElevator] = useState<string>('0')
  const [customOptionParking, setCustomOptionParking] = useState<string>('0')
  const [customOptionWindowDust, setCustomOptionWindowDust] = useState<string>('0')
  const [customOptionRecycling, setCustomOptionRecycling] = useState<string>('0')
  /** 화장실 단가 (월), 기본 0원 */
  const [customOptionToiletAmount, setCustomOptionToiletAmount] = useState<string>('0')
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
  /** 분석 전 로딩 연출 (단계 순차 표시) */
  const [showLoadingModal, setShowLoadingModal] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const hasAnalyzedInSessionRef = useRef(false)

  useEffect(() => {
    if (!showLoadingModal) return
    const isFirst = !hasAnalyzedInSessionRef.current
    const totalMs = isFirst ? 3000 : 1000
    const stepInterval = isFirst ? 1000 : 333
    const t1 = setTimeout(() => setLoadingStep(1), stepInterval)
    const t2 = setTimeout(() => setLoadingStep(2), stepInterval * 2)
    const t3 = setTimeout(() => {
      setShowLoadingModal(false)
      setLoadingStep(0)
      setShowAnalysisModal(true)
      setHasSharedForAnalysis(false)
      hasAnalyzedInSessionRef.current = true
    }, totalMs)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [showLoadingModal])

  /** 공유 후 업계 평균 단가·상세 단가 노출 여부 (모달 열 때마다 초기화) */
  const [hasSharedForAnalysis, setHasSharedForAnalysis] = useState(false)
  /** 공유 취소 시 안내 (모바일) */
  const [shareCancelled, setShareCancelled] = useState(false)
  /** 일일 열람 횟수 초과 */
  const [dailyLimitReached, setDailyLimitReached] = useState(false)
  const [copyToast, setCopyToast] = useState(false)

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareMessage = '[내 단가 전략 점검 완료] 업계 평균 기준, 당신은 어디에 있나요?'
  const shareTitle = shareMessage
  const shareText = shareMessage
  /** 모바일 기기에서만 공유 허용 (UA + 뷰포트 + 실제 화면 너비, 카카오톡 인앱 대응) */
  const [isLikelyMobile, setIsLikelyMobile] = useState(false)
  useEffect(() => {
    const check = () => {
      const inner = typeof window !== 'undefined' ? window.innerWidth : 0
      const screenW = typeof screen !== 'undefined' ? screen.width : 0
      const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
      setIsLikelyMobile(
        inner <= 768 ||
        screenW <= 768 ||
        (touch && screenW <= 1024) ||
        (screenW > 0 && screenW <= 480)
      )
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const isMobileDevice =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|KakaoTalk|KAKAOTALK|KAKAO|Samsung|Mobile/i.test(navigator.userAgent)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const referrer = typeof document !== 'undefined' ? document.referrer || '' : ''
  const fromKakao =
    /kakao|daum|kakaotalk/i.test(referrer) || /KakaoTalk|KAKAOTALK|KAKAO|kakao|daum/i.test(ua)
  const isMobileContext = isMobileDevice || isLikelyMobile || fromKakao
  const canUseShare = typeof navigator !== 'undefined' && !!navigator.share && isMobileContext
  /** 카카오톡에서 들어온 경우 링크 복사로 열람 허용하지 않음 → 공유하기만 가능(3·4번 정상 플로우) */
  const canUseCopyFallback =
    isMobileContext &&
    typeof navigator !== 'undefined' &&
    !navigator.share &&
    !fromKakao

  const doUnlockAfterShare = () => {
    if (getDailyUnlockCount() >= DAILY_UNLOCK_LIMIT) {
      setDailyLimitReached(true)
      return
    }
    incrementDailyUnlock()
    setHasSharedForAnalysis(true)
  }

  const handleShareAndUnlock = async () => {
    if (!shareUrl || !canUseShare) return
    setShareCancelled(false)
    setDailyLimitReached(false)
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      })
      doUnlockAfterShare()
    } catch {
      setShareCancelled(true)
    }
  }

  const handleCopyAndUnlock = async () => {
    if (!shareUrl || !canUseCopyFallback) return
    setShareCancelled(false)
    setDailyLimitReached(false)
    try {
      const body = shareText ? `${shareText}\n${shareUrl}` : shareUrl
      await navigator.clipboard.writeText(body)
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 2000)
      doUnlockAfterShare()
    } catch {
      setShareCancelled(true)
    }
  }

  const areaResult = useMemo(() => {
    const pyeong = Number(areaPyeong) || 0
    const monthlyVisits = visitsPerWeek * WEEKS_PER_MONTH
    if (cleanType === 'office') {
      if (pyeong <= 0) return null
      const extraAmount = customExtraItems.reduce((sum, it) => sum + (Number(it.amount?.replace(/\D/g, '')) || 0), 0)
      const unitPrice = Number(officeUnitPrice) || 0
      const baseMonthly = pyeong * unitPrice * monthlyVisits
      const elevatorAmt = Number(customOptionElevator?.replace(/\D/g, '')) || 0
      const recyclingAmt = Number(customOptionRecycling?.replace(/\D/g, '')) || 0
      const toiletUnitOffice = Number(customOptionToiletAmount?.replace(/\D/g, '')) || 0
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
      const elevAmt = Number(customOptionElevator?.replace(/\D/g, '')) || 0
      const parkAmt = Number(customOptionParking?.replace(/\D/g, '')) || 0
      const windowAmt = Number(customOptionWindowDust?.replace(/\D/g, '')) || 0
      const recyAmt = Number(customOptionRecycling?.replace(/\D/g, '')) || 0
      const toiletUnitStairs = Number(customOptionToiletAmount?.replace(/\D/g, '')) || 0
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
      const isExtreme = diffRate <= -0.7 || diffRate >= 2.0
      let judgment: keyof typeof JUDGE_LABELS
      if (diffRate <= -0.15) judgment = 'low'
      else if (diffRate < -0.05) judgment = 'slightlyLow'
      else if (diffRate <= 0.05) judgment = 'avg'
      else if (diffRate <= 0.15) judgment = 'slightlyHigh'
      else judgment = 'high'
      return { diffRate, judgment, message: JUDGE_LABELS[judgment], avgAmount: avgUnit * monthlyVisits * pyeong, isExtreme }
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
      const isExtreme = diffRate <= -0.7 || diffRate >= 2.0
      let judgment: keyof typeof JUDGE_LABELS
      if (diffRate <= -0.15) judgment = 'low'
      else if (diffRate < -0.05) judgment = 'slightlyLow'
      else if (diffRate <= 0.05) judgment = 'avg'
      else if (diffRate <= 0.15) judgment = 'slightlyHigh'
      else judgment = 'high'
      return { diffRate, judgment, message: JUDGE_LABELS[judgment], avgAmount, isExtreme }
    }

    return null
  }, [areaResult, cleanType, areaPyeong, visitsPerWeek, stairsFloors, toiletStalls, hasParking, hasWindowDust, hasRecycling])

  const inputBase =
    'w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm'

  return (
    <section id="cleaning-estimate-calculator" className="py-6 sm:py-16 px-3 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/40 via-white to-slate-50/50 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        {/* 헤더: 아이콘 + 제목 + 부제 + 스텝퍼 */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500 text-white mb-3 sm:mb-4 shadow-lg">
            <IconStar />
          </div>
          <h2 className="text-xl sm:text-3xl font-bold text-slate-800 mb-1 sm:mb-2">
            청소업 표준 견적 진단기
          </h2>
          <p className="text-gray-500 text-xs sm:text-base mb-4 sm:mb-8">
            면적 기준 또는 인건비 기준으로 견적을 산정하고, 내 견적을 분석할 수 있습니다.
          </p>
          {/* 스텝퍼 */}
          <div className="flex items-center justify-center gap-0 max-w-md mx-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 text-white text-xs sm:text-sm font-semibold">1</span>
              <span className="text-xs sm:text-sm font-medium text-blue-600">견적 정보 입력</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-1 sm:mx-2 min-w-[16px] sm:min-w-[24px]" />
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 text-gray-500 text-xs sm:text-sm font-medium">2</span>
              <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">견적 비교</span>
            </div>
          </div>
        </div>

        {/* 2단: 좌(입력) | 우(실시간 견적 + 비교) */}
        <div className="grid lg:grid-cols-[1fr,340px] gap-8 items-start pb-28 sm:pb-32 lg:pb-0">
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
                              placeholder="0"
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
                        value={customOptionToiletAmount === '' ? '' : formatNumber(Number(customOptionToiletAmount?.replace(/\D/g, '')) || 0)}
                        onChange={(e) => setCustomOptionToiletAmount(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
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
                      <input type="text" inputMode="numeric" value={customOptionElevator === '' ? '' : formatNumber(Number(customOptionElevator?.replace(/\D/g, '')) || 0)} onChange={(e) => setCustomOptionElevator(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums" />
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
                          <input type="text" inputMode="numeric" value={customOptionParking === '' ? '' : formatNumber(Number(customOptionParking?.replace(/\D/g, '')) || 0)} onChange={(e) => setCustomOptionParking(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums" />
                          <span className="text-gray-600 text-sm">원</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-[minmax(160px,1fr)_auto] gap-x-4 items-center">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input type="checkbox" checked={hasWindowDust} onChange={(e) => setHasWindowDust(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-700">창틀 먼지 제거</span>
                        </label>
                        <div className="flex items-center gap-1 w-[120px] justify-end">
                          <input type="text" inputMode="numeric" value={customOptionWindowDust === '' ? '' : formatNumber(Number(customOptionWindowDust?.replace(/\D/g, '')) || 0)} onChange={(e) => setCustomOptionWindowDust(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums" />
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
                      <input type="text" inputMode="numeric" value={customOptionRecycling === '' ? '' : formatNumber(Number(customOptionRecycling?.replace(/\D/g, '')) || 0)} onChange={(e) => setCustomOptionRecycling(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right tabular-nums" />
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
              onClick={() => { setShowLoadingModal(true); setLoadingStep(0) }}
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
          </div>
        </div>

        {/* 모바일 전용: 상담하기 + 하단 고정 실시간 견적 + 견적 비교 */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="max-w-6xl mx-auto space-y-2">
            <a
              href={KAKAO_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[#FEE500] px-3 py-2 text-sm font-medium text-black shadow-sm hover:bg-[#FADA0A] transition-colors"
              title="카카오톡으로 문의하기"
            >
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.18-3.53-.5C5.55 21 2 21 2 21c2.33-2.33 2.7-3.9 2.75-4.5C3.05 15.07 3 14.1 3 13c0-4.42 4.5-8 9-8z" />
              </svg>
              무플 상담하기
            </a>
            <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <IconStar />
                <span className="text-sm font-semibold text-gray-700">실시간 견적</span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-slate-800 tabular-nums leading-tight">
                  {displayAmount > 0 ? (
                    <>{formatNumber(displayAmount)} <span className="text-lg font-semibold text-slate-600">원</span></>
                  ) : (
                    <><span className="text-slate-800">0</span> <span className="text-lg font-semibold text-slate-600">원</span></>
                  )}
                </p>
                {displayAmount > 0 && (
                  <p className="text-[10px] text-gray-500 mt-0">부가세 10% 포함 {formatNumber(Math.round(displayAmount * 1.1))} 원</p>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center gap-2 text-xs border-t border-gray-100 pt-1.5">
              <span className="font-medium text-gray-600">견적 비교</span>
              <div className="flex items-center gap-1.5 text-right min-w-0">
                <span className="truncate"><span className="text-gray-500">면적</span> <span className="font-semibold text-slate-800 tabular-nums">{hasAreaResult ? formatWon(areaResult!.monthlyTotal) : formatWon(0)}</span></span>
                <span className="text-gray-300 shrink-0">|</span>
                <span className="truncate"><span className="text-gray-500">인건비</span> <span className="font-semibold text-slate-800 tabular-nums">{hasLaborResult ? formatWon(laborResult!.suggestedQuote) : formatWon(0)}</span></span>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* 분석 전 로딩 연출 모달 */}
        {showLoadingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-busy="true" aria-label="견적 분석 중">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 text-center mb-1">내 견적 분석 중</h3>
                <p className="text-sm text-gray-600 text-center mb-4">방문 빈도·옵션·운영 난이도를 반영하고 있어요.</p>
                <p className="text-xs text-gray-500 text-center mb-5">평균 단가·운영 난이도·방문 빈도를 반영합니다.</p>
                <div className="space-y-2.5">
                  {LOADING_STEP_LABELS.map((label, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${i < loadingStep ? 'bg-green-500 text-white' : i === loadingStep ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {i < loadingStep ? (
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className={`text-sm ${i <= loadingStep ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 내 견적 분석 모달 — 참고 디자인: 예상 견적 · 업계 평균 대비(파란 박스) · 상세 내역 · 결과 · 확인 */}
        {showAnalysisModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => { setShowAnalysisModal(false); setShareCancelled(false); setDailyLimitReached(false) }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-modal-title"
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 id="analysis-modal-title" className="text-lg font-bold text-gray-900">업계 평균 단가 · 내 견적</h2>
                <button
                  type="button"
                  onClick={() => { setShowAnalysisModal(false); setShareCancelled(false); setDailyLimitReached(false) }}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="닫기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-5">
                {activeTab === 'area' && areaResult ? (
                  <>
                    {!hasSharedForAnalysis ? (
                      <>
                        {industryCompare?.isExtreme ? (
                          <div className="rounded-xl bg-amber-50 border-2 border-amber-200 border-l-4 border-l-amber-500 p-5 shadow-md">
                            <p className="text-lg text-amber-900 font-medium leading-relaxed text-center">
                              입력하신 단가가 일반 시장 범위와 많이 다릅니다. 평당 금액·옵션 금액을 다시 확인해 주세요.
                            </p>
                            <p className="text-sm text-amber-800/90 text-center mt-4">조건을 수정한 뒤 다시 분석해 보세요.</p>
                          </div>
                        ) : dailyLimitReached ? (
                          <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-5 text-center">
                            <p className="text-lg font-medium text-amber-900">오늘 횟수를 모두 사용했습니다.</p>
                            <p className="text-sm text-amber-800 mt-2">내일 다시 시도해 주세요. (일일 {DAILY_UNLOCK_LIMIT}회 제한)</p>
                          </div>
                        ) : shareCancelled ? (
                          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-5 text-center">
                            <p className="text-sm text-gray-700">공유를 완료하면 결과를 확인할 수 있어요.</p>
                            <p className="text-xs text-gray-500 mt-2">다시 공유하기 버튼을 눌러 주세요.</p>
                          </div>
                        ) : !canUseShare && !canUseCopyFallback ? (
                          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-5 text-center space-y-2">
                            <p className="text-base font-medium text-gray-800">업계 평균 단가는 모바일에서만 확인할 수 있어요.</p>
                            <p className="text-sm text-gray-600">모바일 기기로 접속한 뒤 공유하기를 눌러 주세요.</p>
                          </div>
                        ) : industryCompare ? (() => {
                          const style = JUDGE_STYLES[industryCompare.judgment] ?? JUDGE_STYLES.avg
                          const typeInfo = JUDGE_TYPES[industryCompare.judgment] ?? JUDGE_TYPES.avg
                          return (
                            <>
                              <div className={`rounded-xl bg-white border-2 ${style.border} border-l-4 ${style.borderL} shadow-md overflow-hidden`}>
                                <div className={`px-4 py-3 ${style.bg} border-b ${style.border}`}>
                                  <div className="flex items-center gap-3">
                                    <span className="text-4xl" aria-hidden>{typeInfo.emoji}</span>
                                    <h3 className={`text-2xl font-bold ${style.text}`}>{typeInfo.title}</h3>
                                  </div>
                                </div>
                                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                                  <div className="rounded-xl bg-white border border-gray-100 py-4 px-4">
                                    <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">{typeInfo.tagline}</p>
                                  </div>
                                  {typeInfo.blocks.map((block, bi) => {
                                    const cardStyles = [
                                      { bg: 'bg-white', border: 'border-gray-100', bullet: 'bg-green-500', title: 'text-green-900' },
                                      { bg: 'bg-blue-50', border: 'border-blue-100', bullet: 'bg-blue-500', title: 'text-blue-900' },
                                      { bg: 'bg-amber-50', border: 'border-amber-100', bullet: 'bg-amber-500', title: 'text-amber-900' },
                                      { bg: 'bg-purple-50', border: 'border-purple-100', bullet: 'bg-purple-500', title: 'text-purple-900' },
                                    ]
                                    const card = cardStyles[bi % cardStyles.length]
                                    return (
                                      <section key={bi} className={`rounded-xl border py-4 px-4 ${card.bg} ${card.border}`}>
                                        <h4 className={`text-base font-bold ${card.title} mb-2`}>{block.title}</h4>
                                        {block.items ? (
                                          <ul className="space-y-2 text-lg text-gray-800">
                                            {block.items.map((item, i) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <span className={`mt-2.5 w-2.5 h-2.5 rounded-full shrink-0 ${card.bullet}`} />
                                                <span>{item}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : block.body ? (
                                          <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-line">{block.body}</p>
                                        ) : null}
                                      </section>
                                    )
                                  })}
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 text-center pt-1">공유하면 업계 평균 단가와 상세 단가를 확인할 수 있어요.</p>
                            </>
                          )
                        })() : (
                          <p className="text-sm text-gray-600 text-center py-4">공유하면 예상 견적과 상세 단가를 확인할 수 있어요.</p>
                        )}
                      </>
                    ) : (
                      <>
                        {/* 1) 내 견적 상세 내역 */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                          <p className="text-sm font-bold text-gray-900 mb-3">내 견적 상세 내역</p>
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-500 mb-0.5">예상 견적</p>
                            <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatWon(areaResult.monthlyTotal)}</p>
                            <p className="text-sm text-gray-500 mt-0.5">부가세 10% 포함 {formatWon(Math.round(areaResult.monthlyTotal * 1.1))}</p>
                          </div>
                          {areaResult && 'breakdown' in areaResult && (areaResult as { breakdown?: { label: string; amount: number }[] }).breakdown?.length ? (
                            <ul className="space-y-2 text-sm">
                              {(areaResult as { breakdown: { label: string; amount: number }[] }).breakdown.map((row, i) => (
                                <li
                                  key={i}
                                  className={`flex justify-between items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg ${row.amount < 0 ? 'bg-blue-50' : ''}`}
                                >
                                  <span className="text-gray-700">{row.label}</span>
                                  <span className={`font-medium tabular-nums ${row.amount < 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                                    {row.amount < 0 ? '-' : ''}{formatNumber(Math.abs(row.amount))} 원
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="flex justify-between items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                            <span className="text-sm font-bold text-gray-900">결과</span>
                            <span className="text-sm font-bold text-gray-900 tabular-nums">{formatNumber(areaResult.monthlyTotal)} 원</span>
                          </div>
                        </div>
                        {/* 2) 업계 평균 단가 */}
                        {industryCompare && (() => {
                          const style = JUDGE_STYLES[industryCompare.judgment] ?? JUDGE_STYLES.avg
                          const avg = industryCompare.avgAmount
                          const low = Math.round(avg * 0.95)
                          const high = Math.round(avg * 1.05)
                          return (
                            <div className={`rounded-xl bg-gradient-to-br ${style.bg} border-2 ${style.border} border-l-4 ${style.borderL} p-6 shadow-lg ring-1 ring-black/5`}>
                              <div className="flex items-center gap-3 mb-4">
                                <span className={`flex items-center justify-center w-12 h-12 rounded-xl ${style.icon} text-white shadow-lg [&_svg]:!text-white [&_svg]:!stroke-white [&_svg]:w-6 [&_svg]:h-6`}>
                                  <IconChart />
                                </span>
                                <p className={`text-lg font-bold ${style.text}`}>업계 평균 단가</p>
                              </div>
                              <div className="bg-white/70 rounded-lg py-4 px-4 mb-4">
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums text-center">
                                  {formatNumber(low)} ~ {formatNumber(high)} <span className="text-xl font-semibold text-gray-600">원</span>
                                </p>
                                <p className="text-sm text-gray-600 text-center mt-2">
                                  부가세 10% 포함 {formatNumber(Math.round(low * 1.1))} ~ {formatNumber(Math.round(high * 1.1))} 원
                                </p>
                              </div>
                              <p className={`text-sm ${style.text} font-medium leading-relaxed`}>{industryCompare.message}</p>
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </>
                ) : activeTab === 'labor' && laborResult ? (
                  <>
                    {!hasSharedForAnalysis ? (
                      <>
                        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 border-l-4 border-l-blue-500 p-5 shadow-md ring-1 ring-black/5">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500 text-white shadow [&_svg]:!text-white [&_svg]:!stroke-white [&_svg]:w-5 [&_svg]:h-5">
                              <IconChart />
                            </span>
                            <p className="text-base font-bold text-blue-900">업계 평균 대비</p>
                          </div>
                          <p className="text-base text-blue-900 font-medium leading-relaxed pl-[3.25rem]">
                            업계 평균 대비 분석은 면적 기준 견적에서만 제공됩니다. 면적 기준 탭에서 견적을 입력하시면 업계 단가와 비교 분석을 확인할 수 있어요.
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 text-center">면적 기준으로 이동해 보세요.</p>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">예상 견적</p>
                          <p className="text-3xl font-bold text-gray-900 tabular-nums">{formatWon(laborResult.suggestedQuote)}</p>
                          <p className="text-sm text-gray-500 mt-0.5">부가세 10% 포함 {formatWon(Math.round(laborResult.suggestedQuote * 1.1))}</p>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 border-l-4 border-l-blue-500 p-5 shadow-md ring-1 ring-black/5">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500 text-white shadow [&_svg]:!text-white [&_svg]:!stroke-white [&_svg]:w-5 [&_svg]:h-5">
                              <IconChart />
                            </span>
                            <p className="text-base font-bold text-blue-900">업계 평균 대비</p>
                          </div>
                          <p className="text-base text-blue-900 font-medium leading-relaxed pl-[3.25rem]">
                            업계 평균 대비 분석은 면적 기준 견적에서만 제공됩니다. 면적 기준 탭에서 견적을 입력하시면 업계 대비 분석을 확인하실 수 있습니다.
                          </p>
                        </div>
                        {laborResult.breakdown?.length ? (
                          <div>
                            <p className="text-sm font-bold text-gray-900 mb-3">상세 내역</p>
                            <ul className="space-y-2 text-sm">
                              {laborResult.breakdown.map((row, i) => (
                                <li key={i} className="flex justify-between items-center gap-2 py-1.5">
                                  <span className="text-gray-700">{row.label}</span>
                                  <span className="font-medium text-gray-900 tabular-nums">{formatNumber(row.amount)} 원</span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex justify-between items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                              <span className="text-sm font-bold text-gray-900">결과</span>
                              <span className="text-sm font-bold text-gray-900 tabular-nums">{formatNumber(laborResult.suggestedQuote)} 원</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center gap-2 pt-2">
                            <span className="text-sm font-bold text-gray-900">결과</span>
                            <span className="text-sm font-bold text-gray-900 tabular-nums">{formatNumber(laborResult.suggestedQuote)} 원</span>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-600">
                      {activeTab === 'area'
                        ? '면적(평수), 방문 빈도 등 견적 정보를 입력한 후 분석해 주세요.'
                        : '시급, 인원, 작업 시간 등 견적 정보를 입력한 후 분석해 주세요.'}
                    </p>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 rounded-b-2xl space-y-2">
                {copyToast && (
                  <p className="text-center text-sm text-green-600 font-medium">링크가 복사되었어요. 업계 평균 단가와 상세 단가를 확인하세요.</p>
                )}
                {activeTab === 'labor' && laborResult ? (
                  !hasSharedForAnalysis ? (
                    <button
                      type="button"
                      onClick={() => { setActiveTab('area'); setShowAnalysisModal(false); }}
                      className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                    >
                      면적 기준으로 이동
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setShowAnalysisModal(false); setShareCancelled(false); setDailyLimitReached(false) }}
                      className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                    >
                      확인
                    </button>
                  )
                ) : (activeTab === 'area' && areaResult) ? (
                  !hasSharedForAnalysis && !industryCompare?.isExtreme ? (
                    dailyLimitReached ? (
                      <button
                        type="button"
                        onClick={() => { setShowAnalysisModal(false); setDailyLimitReached(false) }}
                        className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                      >
                        확인
                      </button>
                    ) : canUseShare ? (
                      <button
                        type="button"
                        onClick={handleShareAndUnlock}
                        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                      >
                        공유하고 업계 평균 단가 보기
                      </button>
                    ) : canUseCopyFallback ? (
                      <button
                        type="button"
                        onClick={handleCopyAndUnlock}
                        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                      >
                        링크 복사 후 결과 보기
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-3.5 rounded-xl bg-gray-300 text-gray-500 font-bold cursor-not-allowed"
                      >
                        모바일에서 사용해 주세요
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setShowAnalysisModal(false); setShareCancelled(false); setDailyLimitReached(false) }}
                      className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                    >
                      {industryCompare?.isExtreme ? '다시 시도하기' : '확인'}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowAnalysisModal(false); setShareCancelled(false); setDailyLimitReached(false) }}
                    className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                  >
                    확인
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
