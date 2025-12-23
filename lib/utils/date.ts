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












