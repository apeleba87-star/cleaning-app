/**
 * 업체관리자 금액 표기: 천 단위 콤마 + " 원"
 * 예: 1600000 → "1,600,000 원"
 */

/** 숫자 또는 숫자 문자열을 "1,600,000 원" 형식으로 포맷 */
export function formatCurrencyDisplay(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? value.replace(/[^0-9]/g, '') : String(Math.floor(Number(value)))
  if (num === '') return ''
  const n = parseInt(num, 10)
  if (isNaN(n)) return ''
  return n.toLocaleString('ko-KR') + ' 원'
}

/** 입력 문자열에서 숫자만 추출 (저장/제출용) */
export function parseCurrencyInput(value: string): string {
  if (!value || typeof value !== 'string') return ''
  return value.replace(/[^0-9]/g, '')
}

/** 입력 문자열을 숫자로 변환 (API 제출용) */
export function parseCurrencyNumber(value: string): number {
  const raw = parseCurrencyInput(value)
  if (raw === '') return 0
  return parseInt(raw, 10) || 0
}

/** 콤마만 적용한 문자열 (입력 필드용, " 원" 제외). 커서 복원 시 사용 */
export function formatCurrencyInputValue(value: string | number | null | undefined): string {
  return formatCurrencyDisplay(value).replace(/\s*원\s*$/, '').trim()
}

/** 포맷된 문자열에서 N번째 숫자 뒤의 인덱스 반환 (커서 위치 복원용) */
export function positionAfterNDigits(formatted: string, n: number): number {
  let count = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) count++
    if (count === n) return i + 1
  }
  return formatted.length
}
