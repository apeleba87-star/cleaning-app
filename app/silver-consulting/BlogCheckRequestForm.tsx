'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

const roleOptions = ['원장님', '직원', '기타']

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function isValidMobilePhone(value: string) {
  return /^010\d{8}$/.test(value.replace(/\D/g, ''))
}

export default function BlogCheckRequestForm() {
  const [role, setRole] = useState('원장님')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setMessage('')

    try {
      if (!isValidMobilePhone(phone)) {
        throw new Error('010으로 시작하는 휴대폰 번호 11자리를 모두 입력해주세요.')
      }

      const response = await fetch('/api/silver-consulting/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, phone }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || '신청 저장에 실패했습니다.')

      setStatus('success')
      setMessage('신청이 저장되었습니다. 24시간 내 점검 결과를 안내드리겠습니다.')
      setPhone('')
      setRole('원장님')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '신청 저장에 실패했습니다.')
    }
  }

  return (
    <form onSubmit={submitRequest} className="my-7 grid gap-3 text-left">
      <label className="grid gap-2 text-sm font-black text-slate-600">
        직급
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-[#F5F8FA] px-5 py-4 text-base font-black text-[#1A1A2E] outline-none focus:border-[#2E6DA4]"
        >
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-black text-slate-600">
        연락처
        <input
          value={phone}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="010-0000-0000"
          className="rounded-2xl border border-slate-200 bg-[#F5F8FA] px-5 py-4 text-base font-black text-[#1A1A2E] outline-none focus:border-[#2E6DA4]"
        />
      </label>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-3 rounded-full bg-[#2E6DA4] px-6 py-4 text-center font-black text-white shadow-lg shadow-blue-900/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? '저장 중...' : '무료 신청하기'}
      </button>

      {message && (
        <p className={`text-center text-sm font-black ${status === 'success' ? 'text-[#2E6DA4]' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
