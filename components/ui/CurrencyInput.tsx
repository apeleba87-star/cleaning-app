'use client'

import { useRef, useLayoutEffect } from 'react'
import {
  formatCurrencyInputValue,
  parseCurrencyInput,
  positionAfterNDigits,
} from '@/lib/utils/currency'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string
  onChange: (rawValue: string) => void
}

/** 포맷된 문자열에서 커서 앞에 있는 숫자 개수 */
function countDigitsBefore(formatted: string, cursorPos: number): number {
  let count = 0
  for (let i = 0; i < cursorPos && i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) count++
  }
  return count
}

/**
 * 금액 입력 필드 - "1,600,000 원" 형식으로 표시(원은 입력란 밖 접미사), 내부는 숫자만 저장.
 * 백스페이스/삭제 시 커서 위치를 복원해 숫자만 편집되도록 함.
 */
export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorRestoreRef = useRef<number | null>(null)

  const displayValue = formatCurrencyInputValue(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const newInputValue = input.value
    const cursorPos = input.selectionStart ?? 0
    const digitsBefore = countDigitsBefore(newInputValue, cursorPos)
    const raw = parseCurrencyInput(newInputValue)
    onChange(raw)
    cursorRestoreRef.current = digitsBefore
  }

  useLayoutEffect(() => {
    if (cursorRestoreRef.current === null || !inputRef.current) return
    const digitsBefore = cursorRestoreRef.current
    cursorRestoreRef.current = null
    const nextDisplay = inputRef.current.value
    const pos = positionAfterNDigits(nextDisplay, digitsBefore)
    inputRef.current.setSelectionRange(pos, pos)
  })

  return (
    <span className="inline-flex items-center gap-0.5">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={displayValue}
        onChange={handleChange}
        className={className}
        {...props}
      />
      {displayValue !== '' && <span className="text-muted-foreground">원</span>}
    </span>
  )
}
