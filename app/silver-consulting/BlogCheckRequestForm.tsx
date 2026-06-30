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
  const [centerName, setCenterName] = useState('')
  const [role, setRole] = useState('원장님')
  const [phone, setPhone] = useState('')
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setMessage('')

    try {
      if (!centerName.trim()) {
        throw new Error('센터명을 입력해주세요.')
      }
      if (!isValidMobilePhone(phone)) {
        throw new Error('010으로 시작하는 휴대폰 번호 11자리를 모두 입력해주세요.')
      }
      if (!privacyAgreed) {
        throw new Error('개인정보 수집·이용에 동의해주세요.')
      }

      const response = await fetch('/api/silver-consulting/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ center_name: centerName, role, phone, privacy_agreed: privacyAgreed }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || '신청 저장에 실패했습니다.')

      setStatus('success')
      setMessage('신청이 저장되었습니다. 24시간 내 점검 결과를 안내드리겠습니다.')
      setCenterName('')
      setPhone('')
      setRole('원장님')
      setPrivacyAgreed(false)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '신청 저장에 실패했습니다.')
    }
  }

  return (
    <form onSubmit={submitRequest} className="my-7 grid gap-3 text-left">
      <label className="grid gap-2 text-sm font-black text-slate-600">
        센터명
        <input
          value={centerName}
          onChange={(event) => setCenterName(event.target.value)}
          placeholder="예: 맨즈주간보호센터"
          className="rounded-2xl border border-slate-200 bg-[#F5F8FA] px-5 py-4 text-base font-black text-[#1A1A2E] outline-none focus:border-[#2E6DA4]"
        />
      </label>

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

      <label className="rounded-2xl border border-slate-200 bg-white p-4">
        <span className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={privacyAgreed}
            onChange={(event) => setPrivacyAgreed(event.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 accent-[#2E6DA4]"
          />
          <span>
            <span className="block text-sm font-black text-[#1A1A2E]">개인정보 수집·이용에 동의합니다.</span>
            <span className="mt-2 block text-xs font-bold leading-5 text-slate-500">
              수집 항목: 직급, 연락처 / 목적: 무료 점검 결과 안내 및 상담 연락 / 보유 기간: 신청일로부터 1년 또는 삭제 요청 시까지
            </span>
          </span>
        </span>
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
