'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  calculateHomepageEstimate,
  formatWon,
  HOMEPAGE_CLEANING_OPTIONS,
} from '@/lib/homepage/calculator'
import type { HomepageCalculatorSettings, HomepageEstimateInput, HomepageSite } from '@/types/homepage'

type Props = {
  site: HomepageSite
  calculator: HomepageCalculatorSettings
}

const initialInput: HomepageEstimateInput = {
  region: '',
  area_pyeong: 0,
  cleaning_type: 'move_in',
  housing_type: 'apartment',
  options: [],
  elevator: 'yes',
  pollution: 'normal',
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export default function EstimateCalculator({ site, calculator }: Props) {
  const [input, setInput] = useState<HomepageEstimateInput>(initialInput)
  const [serviceSelected, setServiceSelected] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [phone, setPhone] = useState('')
  const [trap, setTrap] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const result = useMemo(() => calculateHomepageEstimate(input, calculator), [input, calculator])
  const hasArea = input.area_pyeong > 0
  const estimatedHours = input.area_pyeong >= 30 ? '6~7시간' : input.area_pyeong >= 20 ? '5~6시간' : '3~4시간'
  const recommendedPeople = input.area_pyeong >= 30 ? '3명' : '2명'

  const toggleOption = (key: string) => {
    setInput((prev) => ({
      ...prev,
      options: prev.options.includes(key)
        ? prev.options.filter((option) => option !== key)
        : [...prev.options, key],
    }))
  }

  const kakaoMessage = encodeURIComponent(
    [
      `${input.cleaning_type === 'move_in' ? '입주청소' : '이사청소'} 예상 견적 문의드립니다.`,
      input.region ? `지역: ${input.region}` : '',
      `평수: ${input.area_pyeong}평`,
      `예상 금액: ${formatWon(result.estimatedAmount)}~`,
    ]
      .filter(Boolean)
      .join('\n')
  )
  const kakaoUrl = site.kakao_url
    ? `${site.kakao_url}${site.kakao_url.includes('?') ? '&' : '?'}text=${kakaoMessage}`
    : null

  const trackContactClick = (method: 'phone' | 'kakao') => {
    const payload = {
      site_id: site.id,
      customer_name: '계산기 클릭',
      customer_phone: method === 'phone' ? '전화 클릭' : '카카오톡 클릭',
      contact_method: method === 'phone' ? 'phone_click' : 'kakao_click',
      message: [
        method === 'phone' ? '전화 문의 버튼 클릭' : '카카오톡 문의 버튼 클릭',
        `${input.cleaning_type === 'move_in' ? '입주청소' : '이사청소'}`,
        `${input.area_pyeong}평`,
        `예상 금액: ${formatWon(result.estimatedAmount)}~`,
      ].join('\n'),
      honeypot: '',
      input,
      estimated_amount: result.estimatedAmount,
      source_page: typeof window !== 'undefined' ? window.location.href : null,
    }

    fetch('/api/homepage/public/estimate-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // 클릭 로그 저장 실패가 전화/카톡 이동을 막으면 안 됩니다.
    })
  }

  const submitContact = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const res = await fetch('/api/homepage/public/estimate-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: site.id,
          customer_name: '계산기 상담',
          customer_phone: phone,
          contact_method: 'form',
          consent_marketing: false,
          message: [
            '연락처 상담 신청',
            `${input.cleaning_type === 'move_in' ? '입주청소' : '이사청소'}`,
            `${input.area_pyeong}평`,
            `예상 금액: ${formatWon(result.estimatedAmount)}~`,
          ].filter(Boolean).join('\n'),
          honeypot: trap,
          input,
          estimated_amount: result.estimatedAmount,
          source_page: typeof window !== 'undefined' ? window.location.href : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '상담 신청에 실패했습니다.')
      setSaved(true)
      setPhone('')
    } catch (err: any) {
      setError(err.message || '상담 신청에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="calculator" className="hp-surface hp-border border p-4 sm:p-6">
      <div className="mb-5">
        <p className="homepage-label text-xs font-black uppercase hp-muted-text">Estimate calculator</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-950">우리집 청소비를 바로 확인하세요</h2>
        <p className="mt-2 text-sm text-gray-600">평수와 서비스만 선택하면 예상 결과를 먼저 보여드립니다.</p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
          <label className="block rounded-2xl border border-gray-200 bg-white p-4">
            <span className="mb-2 block text-xs font-black text-gray-500">STEP 1</span>
            <span className="mb-2 block text-sm font-black text-gray-800">평수</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-4 text-2xl font-black"
              type="number"
              min={1}
              placeholder="예: 24"
              value={input.area_pyeong || ''}
              onChange={(e) => {
                const area = Number(e.target.value || 0)
                setInput((prev) => ({ ...prev, area_pyeong: area }))
                if (area <= 0) setServiceSelected(false)
              }}
            />
          </label>

          {hasArea && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <span className="mb-2 block text-xs font-black text-gray-500">STEP 2</span>
              <span className="mb-2 block text-sm font-black text-gray-800">서비스</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['move_in', '입주청소'],
                  ['move_out', '이사청소'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setInput((prev) => ({ ...prev, cleaning_type: value as HomepageEstimateInput['cleaning_type'] }))
                      setServiceSelected(true)
                    }}
                    className={`rounded-xl border py-4 text-sm font-black ${
                      serviceSelected && input.cleaning_type === value ? 'hp-primary border-transparent' : 'bg-white text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {serviceSelected && <div className="hp-soft p-5">
          <p className="text-sm font-black hp-muted-text">STEP 3 · 예상 결과</p>
          <p className="mt-2 text-5xl font-black text-gray-950">{formatWon(result.estimatedAmount)}~</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              ['예상 작업시간', estimatedHours],
              ['권장 인원', recommendedPeople],
              ['추천 일정', '평일 오전'],
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-4">
                <p className="text-xs font-bold text-gray-500">{label}</p>
                <p className="mt-1 font-black text-gray-950">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-600">{calculator.caution_note}</p>
        </div>}

        {serviceSelected && <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-black text-gray-800">STEP 4 · 추가 정보</p>
          <p className="mt-1 text-sm text-gray-500">정확한 견적을 위해 선택 사항만 확인합니다.</p>
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold text-gray-700">주거 형태</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['apartment', '아파트'],
                ['villa', '빌라'],
                ['officetel', '오피스텔'],
                ['etc', '기타'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setInput((prev) => ({ ...prev, housing_type: value as HomepageEstimateInput['housing_type'] }))
                  }
                  className={`rounded-xl border py-4 text-sm font-black ${
                    input.housing_type === value ? 'hp-primary border-transparent' : 'bg-white text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-gray-700">추가 관리</p>
            <div className="grid gap-2 sm:grid-cols-3">
            {HOMEPAGE_CLEANING_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => toggleOption(option.key)}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  input.options.includes(option.key)
                    ? 'hp-soft hp-border font-black'
                    : 'bg-white text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-gray-700">현장 조건</p>
            <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="rounded-xl border border-gray-200 px-3 py-3"
              placeholder="지역 예: 서울 강남구"
              value={input.region}
              onChange={(e) => setInput((prev) => ({ ...prev, region: e.target.value }))}
            />
            <select
              className="rounded-xl border border-gray-200 px-3 py-3"
              value={input.pollution}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, pollution: e.target.value as HomepageEstimateInput['pollution'] }))
              }
            >
              <option value="light">오염도 낮음</option>
              <option value="normal">오염도 보통</option>
              <option value="heavy">오염도 높음</option>
            </select>
            <select
              className="rounded-xl border border-gray-200 px-3 py-3"
              value={input.elevator}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, elevator: e.target.value as HomepageEstimateInput['elevator'] }))
              }
            >
              <option value="yes">엘리베이터 있음</option>
              <option value="no">엘리베이터 없음</option>
            </select>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-sm font-bold text-gray-700">
              옵션을 선택하면 예상 금액이 바로 반영됩니다. 정확한 일정과 최종 금액은 상담으로 확인하세요.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowContactForm((prev) => !prev)}
                className="rounded-xl hp-primary px-3 py-3 text-center text-sm font-bold"
              >
                이 조건으로 상담하기
              </button>
              {kakaoUrl && (
                <a
                  href={kakaoUrl}
                  onClick={() => trackContactClick('kakao')}
                  className="rounded-xl bg-yellow-300 px-3 py-3 text-center text-sm font-bold text-gray-950"
                >
                  카카오톡으로 문의
                </a>
              )}
            </div>
            {showContactForm && (
              <form onSubmit={submitContact} className="mt-4 space-y-2">
                <input
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  value={trap}
                  onChange={(e) => setTrap(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-3"
                  placeholder="010-2222-2929"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  required
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                {saved && <p className="text-sm font-bold text-green-700">상담 신청이 접수되었습니다.</p>}
                <div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-gray-950 px-3 py-3 font-bold text-white disabled:opacity-60"
                  >
                    {saving ? '확인 중...' : '확인'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>}
      </div>
    </section>
  )
}
