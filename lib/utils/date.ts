/**
 * 한국 시간대(KST, UTC+9) 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환합니다.
 */
export function getTodayDateKST(): string {
  const now = new Date()
  // 한국 시간대(UTC+9)로 변환
  const kstOffset = 9 * 60 // 분 단위
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const kst = new Date(utc + (kstOffset * 60 * 1000))
  
  const year = kst.getFullYear()
  const month = String(kst.getMonth() + 1).padStart(2, '0')
  const day = String(kst.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 한국 시간대(KST, UTC+9) 기준으로 어제 날짜를 YYYY-MM-DD 형식으로 반환합니다.
 */
export function getYesterdayDateKST(): string {
  const now = new Date()
  // 한국 시간대(UTC+9)로 변환
  const kstOffset = 9 * 60 // 분 단위
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const kst = new Date(utc + (kstOffset * 60 * 1000))
  
  // 어제 날짜 계산
  kst.setDate(kst.getDate() - 1)
  
  const year = kst.getFullYear()
  const month = String(kst.getMonth() + 1).padStart(2, '0')
  const day = String(kst.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 설정된 결제일(수금일/급여일)을 해당 월의 말일로 조정합니다.
 * 예: 31일로 설정되어 있으나 2월(28일까지만 있음)인 경우 → 28일 반환
 * 
 * @param year 연도
 * @param month 월 (1-12)
 * @param paymentDay 설정된 결제일 (1-31)
 * @returns 조정된 결제일 (1-31)
 */
export function adjustPaymentDayToLastDay(year: number, month: number, paymentDay: number | null): number {
  if (!paymentDay || paymentDay < 1 || paymentDay > 31) {
    // 유효하지 않은 값이면 말일 반환
    return new Date(year, month, 0).getDate()
  }

  // 해당 월의 마지막 날짜 계산
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  
  // 설정된 결제일과 마지막 날짜 중 작은 값 반환
  return Math.min(paymentDay, lastDayOfMonth)
}

/**
 * 오늘 날짜 기준으로 설정된 결제일이 오늘인지 확인합니다.
 * 결제일이 해당 월의 말일보다 크면 말일로 조정하여 비교합니다.
 * 
 * @param paymentDay 설정된 결제일 (1-31)
 * @returns 오늘이 결제일인지 여부
 */
export function isTodayPaymentDay(paymentDay: number | null): boolean {
  if (!paymentDay) return false

  const today = new Date()
  const kstOffset = 9 * 60 // 분 단위
  const utc = today.getTime() + (today.getTimezoneOffset() * 60 * 1000)
  const kst = new Date(utc + (kstOffset * 60 * 1000))
  
  const year = kst.getFullYear()
  const month = kst.getMonth() + 1
  const day = kst.getDate()

  // 조정된 결제일 계산
  const adjustedDay = adjustPaymentDayToLastDay(year, month, paymentDay)
  
  return day === adjustedDay
}












