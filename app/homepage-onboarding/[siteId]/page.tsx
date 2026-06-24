'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type Pair = { question: string; answer: string }
type Review = { author: string; rating: number; content: string }
type BeforeAfter = { title: string; before: string; after: string }

const emptyReview: Review = { author: '', rating: 5, content: '' }
const emptyFaq: Pair = { question: '', answer: '' }
const emptyBeforeAfter: BeforeAfter = { title: '', before: '', after: '' }

export default function HomepageOnboardingPage({ params }: { params: { siteId: string } }) {
  const [site, setSite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    contact_phone: '',
    phone: '',
    kakao_url: '',
    blog_url: '',
    naver_place_url: '',
    instagram_url: '',
    service_area: '',
    address: '',
    business_hours: '',
    hero_headline: '',
    hero_subheadline: '',
    company_intro: '',
    services: '',
    pricing_notes: '',
    logo_image_url: '',
    representative_images: '',
    portfolio_images: '',
    footer_representative: '',
    footer_business_number: '',
    footer_email: '',
    footer_address: '',
    footer_note: '',
    reference_urls: '',
    request_note: '',
  })
  const [reviews, setReviews] = useState<Review[]>([{ ...emptyReview }, { ...emptyReview }, { ...emptyReview }])
  const [faqs, setFaqs] = useState<Pair[]>([
    { ...emptyFaq },
    { ...emptyFaq },
    { ...emptyFaq },
    { ...emptyFaq },
    { ...emptyFaq },
  ])
  const [beforeAfter, setBeforeAfter] = useState<BeforeAfter[]>([{ ...emptyBeforeAfter }, { ...emptyBeforeAfter }])

  const completion = useMemo(() => {
    const required = [
      form.business_name,
      form.contact_phone,
      form.phone,
      form.service_area,
      form.hero_headline,
      form.hero_subheadline,
      form.services,
      form.representative_images,
    ]
    return Math.round((required.filter(Boolean).length / required.length) * 100)
  }, [form])

  useEffect(() => {
    fetch(`/api/homepage/public/onboarding/${params.siteId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.site) {
          setSite(data.site)
          setForm((prev) => ({
            ...prev,
            business_name: data.site.business_name || '',
          }))
        }
      })
      .catch(() => setError('입력 페이지를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [params.siteId])

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`/api/homepage/public/onboarding/${params.siteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reviews,
          faqs,
          before_after_images: beforeAfter,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '제출하지 못했습니다.')
      setMessage('자료가 제출되었습니다. 확인 후 홈페이지에 반영해드리겠습니다.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setError(err.message || '제출하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="min-h-screen bg-[#f4f1eb] p-5">불러오는 중...</main>

  return (
    <main className="min-h-screen bg-[#f4f1eb] p-4 text-gray-950 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-3xl border bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-gray-500">Website onboarding</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">홈페이지 제작 자료 입력</h1>
          <p className="mt-4 text-sm leading-7 text-gray-600">
            선택하신 템플릿에 들어갈 내용과 사진 링크를 입력해주세요. 모르는 항목은 비워두셔도 됩니다.
          </p>
          <div className="mt-5 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>{site?.business_name || site?.name || '홈페이지'}</span>
              <span>{completion}% 입력</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-gray-950" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </header>

        {message && <p className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p>}
        {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

        <Section title="1. 기본 연락 정보">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="업체명 *" value={form.business_name} onChange={(v) => update('business_name', v)} />
            <Input label="담당자명" value={form.contact_name} onChange={(v) => update('contact_name', v)} />
            <Input label="연락 가능한 번호 *" value={form.contact_phone} onChange={(v) => update('contact_phone', formatPhone(v))} />
            <Input label="홈페이지에 노출할 전화번호" value={form.phone} onChange={(v) => update('phone', formatPhone(v))} />
            <Input label="카카오톡 상담 링크" value={form.kakao_url} onChange={(v) => update('kakao_url', v)} />
            <Input label="블로그 주소" value={form.blog_url} onChange={(v) => update('blog_url', v)} />
            <Input label="네이버 플레이스 주소" value={form.naver_place_url} onChange={(v) => update('naver_place_url', v)} />
            <Input label="인스타그램 주소" value={form.instagram_url} onChange={(v) => update('instagram_url', v)} />
          </div>
        </Section>

        <Section title="2. 첫 화면 문구">
          <Input label="첫 화면 큰 문구" value={form.hero_headline} onChange={(v) => update('hero_headline', v)} />
          <Textarea label="첫 화면 설명 문구" value={form.hero_subheadline} onChange={(v) => update('hero_subheadline', v)} />
          <Textarea label="회사 소개 / 안내 문구" value={form.company_intro} onChange={(v) => update('company_intro', v)} rows={5} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="서비스 가능 지역" value={form.service_area} onChange={(v) => update('service_area', v)} />
            <Input label="영업시간" value={form.business_hours} onChange={(v) => update('business_hours', v)} />
          </div>
          <Textarea label="주소" value={form.address} onChange={(v) => update('address', v)} />
        </Section>

        <Section title="3. 서비스와 가격 기준">
          <Textarea label="대표 서비스(한 줄에 하나)" value={form.services} onChange={(v) => update('services', v)} rows={6} />
          <Textarea label="가격/상담 기준(한 줄에 하나)" value={form.pricing_notes} onChange={(v) => update('pricing_notes', v)} rows={5} />
        </Section>

        <Section title="4. 후기와 자주 묻는 질문">
          <div className="grid gap-3">
            {reviews.map((review, index) => (
              <div key={index} className="rounded-2xl border bg-gray-50 p-3">
                <p className="mb-2 text-sm font-black">후기 {index + 1}</p>
                <div className="grid gap-2 md:grid-cols-[1fr_120px]">
                  <Input label="고객명/닉네임" value={review.author} onChange={(v) => setReviews((prev) => updateArray(prev, index, { author: v }))} />
                  <NumberInput label="별점" value={review.rating} onChange={(v) => setReviews((prev) => updateArray(prev, index, { rating: v }))} />
                </div>
                <Textarea label="후기 내용" value={review.content} onChange={(v) => setReviews((prev) => updateArray(prev, index, { content: v }))} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-2xl border bg-gray-50 p-3">
                <p className="mb-2 text-sm font-black">FAQ {index + 1}</p>
                <Input label="질문" value={faq.question} onChange={(v) => setFaqs((prev) => updateArray(prev, index, { question: v }))} />
                <Textarea label="답변" value={faq.answer} onChange={(v) => setFaqs((prev) => updateArray(prev, index, { answer: v }))} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="5. 사진 링크">
          <p className="mb-3 text-sm leading-7 text-gray-600">
            사진은 구글드라이브, 네이버 MYBOX, 블로그 이미지 주소처럼 확인 가능한 링크를 한 줄에 하나씩 입력해주세요.
          </p>
          <Input label="로고 이미지 링크" value={form.logo_image_url} onChange={(v) => update('logo_image_url', v)} />
          <Textarea label="대표 이미지 링크(3~5장 권장)" value={form.representative_images} onChange={(v) => update('representative_images', v)} rows={5} />
          <Textarea label="현장 사례 이미지 링크(6장 이상 권장)" value={form.portfolio_images} onChange={(v) => update('portfolio_images', v)} rows={7} />
          <div className="mt-4 grid gap-3">
            {beforeAfter.map((item, index) => (
              <div key={index} className="rounded-2xl border bg-gray-50 p-3">
                <p className="mb-2 text-sm font-black">전후 사진 {index + 1}</p>
                <Input label="제목" value={item.title} onChange={(v) => setBeforeAfter((prev) => updateArray(prev, index, { title: v }))} />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input label="Before 이미지 링크" value={item.before} onChange={(v) => setBeforeAfter((prev) => updateArray(prev, index, { before: v }))} />
                  <Input label="After 이미지 링크" value={item.after} onChange={(v) => setBeforeAfter((prev) => updateArray(prev, index, { after: v }))} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="6. 사업자 정보와 요청사항">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="대표자명" value={form.footer_representative} onChange={(v) => update('footer_representative', v)} />
            <Input label="사업자등록번호" value={form.footer_business_number} onChange={(v) => update('footer_business_number', v)} />
            <Input label="이메일" value={form.footer_email} onChange={(v) => update('footer_email', v)} />
          </div>
          <Textarea label="하단 주소" value={form.footer_address} onChange={(v) => update('footer_address', v)} />
          <Textarea label="하단 안내 문구" value={form.footer_note} onChange={(v) => update('footer_note', v)} />
          <Textarea label="참고 사이트 URL(한 줄에 하나)" value={form.reference_urls} onChange={(v) => update('reference_urls', v)} />
          <Textarea label="추가 요청사항" value={form.request_note} onChange={(v) => update('request_note', v)} rows={5} />
        </Section>

        <button
          onClick={submit}
          disabled={saving || !form.business_name || !form.contact_phone}
          className="sticky bottom-4 z-10 mt-5 w-full rounded-2xl bg-gray-950 py-4 text-base font-black text-white shadow-xl disabled:opacity-50"
        >
          {saving ? '제출 중...' : '제작 자료 제출하기'}
        </button>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-700">{label}</span>
      <input className="w-full rounded-xl border px-3 py-3" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-700">{label}</span>
      <input
        className="w-full rounded-xl border px-3 py-3"
        type="number"
        min={1}
        max={5}
        value={value || 5}
        onChange={(e) => onChange(Number(e.target.value || 5))}
      />
    </label>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-sm font-bold text-gray-700">{label}</span>
      <textarea className="w-full rounded-xl border px-3 py-3" rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function updateArray<T>(items: T[], index: number, patch: Partial<T>) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
