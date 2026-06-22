'use client'

import { useMemo, useState } from 'react'
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
  area_pyeong: 24,
  cleaning_type: 'move_in',
  options: [],
  elevator: 'yes',
  pollution: 'normal',
}

export default function EstimateCalculator({ site, calculator }: Props) {
  const [input, setInput] = useState<HomepageEstimateInput>(initialInput)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [trap, setTrap] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const result = useMemo(() => calculateHomepageEstimate(input, calculator), [input, calculator])

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

  const submit = async (e: React.FormEvent) => {
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
          customer_name: name,
          customer_phone: phone,
          message,
          honeypot: trap,
          input,
          estimated_amount: result.estimatedAmount,
          source_page: typeof window !== 'undefined' ? window.location.href : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '견적 신청에 실패했습니다.')
      setSaved(true)
      setName('')
      setPhone('')
      setMessage('')
    } catch (err: any) {
      setError(err.message || '견적 신청에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="calculator" className="hp-surface hp-border border p-4 sm:p-6">
      <div className="mb-5">
        <p className="homepage-label text-xs font-black uppercase hp-muted-text">Estimate calculator</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-950">우리집 청소비를 바로 확인하세요</h2>
        <p className="mt-2 text-sm text-gray-600">{calculator.result_notice}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">지역</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-3"
              placeholder="예: 서울 강남구"
              value={input.region}
              onChange={(e) => setInput((prev) => ({ ...prev, region: e.target.value }))}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">평수</span>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-3"
              type="number"
              min={1}
              value={input.area_pyeong}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, area_pyeong: Number(e.target.value || 0) }))
              }
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            {[
              ['move_in', '입주청소'],
              ['move_out', '이사청소'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setInput((prev) => ({ ...prev, cleaning_type: value as HomepageEstimateInput['cleaning_type'] }))
                }
                className={`rounded-xl border py-3 text-sm font-medium ${
                  input.cleaning_type === value ? 'hp-primary border-transparent' : 'bg-white text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">옵션</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {HOMEPAGE_CLEANING_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleOption(option.key)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
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

          <div className="grid gap-2 sm:grid-cols-2">
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

        <div className="hp-soft p-4">
          <p className="text-sm font-black hp-muted-text">예상 견적</p>
          <p className="mt-2 text-4xl font-black text-gray-950">{formatWon(result.estimatedAmount)}~</p>
          <p className="mt-3 text-sm text-gray-600">{calculator.caution_note}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {site.phone && (
              <a href={`tel:${site.phone}`} className="rounded-xl hp-primary px-3 py-3 text-center text-sm font-bold">
                전화 문의
              </a>
            )}
            {kakaoUrl && (
              <a href={kakaoUrl} className="rounded-xl bg-yellow-300 px-3 py-3 text-center text-sm font-bold text-gray-950">
                카카오톡 문의
              </a>
            )}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-2">
            <input
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              value={trap}
              onChange={(e) => setTrap(e.target.value)}
            />
            <input
              className="w-full rounded-xl border px-3 py-3"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="w-full rounded-xl border px-3 py-3"
              placeholder="연락처"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <textarea
              className="w-full rounded-xl border px-3 py-3"
              rows={3}
              placeholder="문의 내용"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm font-bold text-green-700">견적 문의가 접수되었습니다.</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-gray-950 px-3 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? '신청 중...' : '견적 신청하기'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
