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

/**
 * 야간매장의 관리일 범위 내에 현재 시간이 있는지 확인
 * 관리일 범위: 전날 work_start_hour ~ 당일 work_end_hour
 * 예: 30일 18시 ~ 31일 10시
 * 
 * @param isNightShift 야간매장 여부
 * @param workStartHour 근무 시작 시간 (0-23)
 * @param workEndHour 근무 종료 시간 (0-23, 다음날 의미)
 * @param currentHour 현재 시간 (0-23, KST)
 * @returns 관리일 범위 내인지 여부
 */
export function isWithinManagementPeriod(
  isNightShift: boolean,
  workStartHour: number,
  workEndHour: number,
  currentHour: number
): boolean {
  if (!isNightShift) return true // 일반 매장은 항상 관리일 범위 내
  
  // work_start_hour >= work_end_hour인 경우 날짜 경계를 넘음
  // 예: 18시 ~ 10시 (다음날)
  if (workStartHour >= workEndHour) {
    // 현재 시간이 work_start_hour 이후이거나 work_end_hour 이전이면 관리일 범위 내
    return currentHour >= workStartHour || currentHour < workEndHour
  } else {
    // work_start_hour < work_end_hour인 경우 같은 날 내 범위
    return currentHour >= workStartHour && currentHour < workEndHour
  }
}

/**
 * 야간매장의 관리일 범위에 해당하는 날짜(work_date) 계산
 * 제안 방식: 09:00 경계만 확인
 * 다음날 09:00 이전 출근 = 전날 관리일에 속함 (예: 2일 08:00 출근 → work_date = 1일)
 * 
 * @param isNightShift 야간매장 여부
 * @param workStartHour 근무 시작 시간 (0-23, 제안 방식에서는 사용하지 않음 - 하위 호환성 유지)
 * @param workEndHour 근무 종료 시간 (0-23, 제안 방식에서는 사용하지 않음 - 하위 호환성 유지)
 * @param currentHour 현재 시간 (0-23, KST)
 * @returns work_date (YYYY-MM-DD 형식) - 관리일에 속하는 날짜
 */
export function calculateWorkDateForNightShift(
  isNightShift: boolean,
  workStartHour: number,
  workEndHour: number,
  currentHour: number
): string {
  if (!isNightShift) {
    return getTodayDateKST()
  }
  
  // 제안 방식: 09:00 경계만 확인
  // 다음날 09:00 이전 출근 = 전날 관리일
  // 예: 2일 08:00 출근 → work_date = 1일
  // 예: 2일 09:00 출근 → work_date = 2일
  if (currentHour < 9) {
    // 다음날 09:00 이전 = 전날 관리일
    return getYesterdayDateKST()
  } else {
    // 당일 관리일
    return getTodayDateKST()
  }
}

/**
 * 야간매장의 관리일 여부 판단 (요일 기준)
 * 제안 방식: 09:00 경계만 확인하여 관리일에 속하는 날짜 결정
 * 
 * @param managementDays 관리 요일 문자열 (예: "월,수,금")
 * @param isNightShift 야간매장 여부
 * @param workStartHour 근무 시작 시간 (제안 방식에서는 사용하지 않음 - 하위 호환성 유지)
 * @param workEndHour 근무 종료 시간 (제안 방식에서는 사용하지 않음 - 하위 호환성 유지)
 * @param checkDate 확인할 날짜 (YYYY-MM-DD, 없으면 현재 시간 기준)
 * @returns 관리일 여부
 */
export function isManagementDay(
  managementDays: string | null,
  isNightShift: boolean,
  workStartHour: number,
  workEndHour: number,
  checkDate?: string | null
): boolean {
  if (!managementDays) return false
  
  const now = new Date()
  const kstOffset = 9 * 60
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const kst = new Date(utc + (kstOffset * 60 * 1000))
  
  // 확인할 날짜 결정
  let dateToCheck: Date
  if (checkDate) {
    dateToCheck = new Date(checkDate + 'T00:00:00+09:00')
  } else {
    // 제안 방식: 09:00 경계만 확인
    if (isNightShift) {
      const currentHour = kst.getHours()
      if (currentHour < 9) {
        // 다음날 09:00 이전 = 전날 관리일 확인
        dateToCheck = new Date(kst)
        dateToCheck.setDate(dateToCheck.getDate() - 1)
      } else {
        // 당일 관리일 확인
        dateToCheck = kst
      }
    } else {
      // 일반 매장: 항상 오늘 날짜
      dateToCheck = kst
    }
  }
  
  // 요일 확인
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayNameToCheck = dayNames[dateToCheck.getDay()]
  
  // management_days에서 확인
  const days = managementDays.split(',').map(d => d.trim())
  return days.includes(dayNameToCheck)
}

/**
 * 야간 매장의 경우 출근 시간에 따라 work_date를 결정합니다.
 * 야간 매장: 09:00 이전 출근 시 전날 관리일로 속함 (예: 2일 08:00 출근 → work_date = 1일)
 * 야간 매장이 아닌 경우 항상 오늘 날짜를 반환합니다.
 * 
 * @param isNightShift 야간 매장 여부
 * @param workStartHour 근무 시작 시간 (0-23, 제안 방식에서는 사용하지 않음 - 하위 호환성 유지)
 * @param currentHour 현재 시간 (0-23, KST)
 * @param workEndHour 근무 종료 시간 (0-23, 제안 방식에서는 사용하지 않음 - 하위 호환성 유지)
 * @returns work_date (YYYY-MM-DD 형식)
 */
export function calculateWorkDate(
  isNightShift: boolean,
  workStartHour: number,
  currentHour: number,
  workEndHour?: number
): string {
  // 일반 매장인 경우 항상 오늘 날짜
  if (!isNightShift) {
    return getTodayDateKST()
  }

  // 제안 방식: 09:00 경계만 확인
  // 다음날 09:00 이전 출근 = 전날 관리일에 속함
  // 예: 2일 08:00 출근 → work_date = 1일
  // 예: 2일 09:00 출근 → work_date = 2일
  if (currentHour < 9) {
    // 다음날 09:00 이전 = 전날 관리일
    return getYesterdayDateKST()
  } else {
    // 당일 관리일
    return getTodayDateKST()
  }
}

/**
 * 한국 시간대(KST) 기준으로 현재 시간(0-23)을 반환합니다.
 */
export function getCurrentHourKST(): number {
  const now = new Date()
  const kstOffset = 9 * 60 // 분 단위
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const kst = new Date(utc + (kstOffset * 60 * 1000))
  
  return kst.getHours()
}








