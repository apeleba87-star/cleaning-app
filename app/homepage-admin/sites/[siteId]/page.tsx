'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { homepageFetch, homepageGetCached, homepageInvalidateCache } from '@/lib/homepage/client'
import { HOMEPAGE_CLEANING_OPTIONS } from '@/lib/homepage/calculator'
import { getHomepagePalettes, HOMEPAGE_TEMPLATES } from '@/lib/homepage/templates'

type Props = {
  params: { siteId: string }
}

export default function HomepageSiteAdminPage({ params }: Props) {
  const [site, setSite] = useState<any>(null)
  const [domains, setDomains] = useState<any[]>([])
  const [calculator, setCalculator] = useState<any>(null)
  const [blogSource, setBlogSource] = useState<any>(null)
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [mediaItems, setMediaItems] = useState<any[]>([])
  const [pushSubscriptions, setPushSubscriptions] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [domainText, setDomainText] = useState('')
  const [mediaDraft, setMediaDraft] = useState({
    item_type: 'after_photo',
    title: '',
    image_url: '',
    description: '',
    sort_order: 0,
    is_visible: true,
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const publicUrl = useMemo(() => (site?.slug ? `/t/${site.slug}` : '#'), [site?.slug])

  const load = () => {
    homepageGetCached<any>(`/api/homepage/sites/${params.siteId}`, 30_000)
      .then((data) => {
        setSite(data.site)
        setDomains(data.domains || [])
        setCalculator(data.calculator)
        setBlogSource(data.blogSource)
        setBlogPosts(data.blogPosts || [])
        setSubmissions(data.submissions || [])
        setMediaItems(data.mediaItems || [])
        setPushSubscriptions(data.pushSubscriptions || [])
        setNotifications(data.notifications || [])
        setDomainText((data.domains || []).map((d: any) => d.domain).join('\n'))
      })
      .catch((err) => setError(err.message || '홈페이지 정보를 불러오지 못했습니다.'))
  }

  useEffect(() => {
    load()
  }, [params.siteId])

  const updateSiteField = (key: string, value: any) => {
    setSite((prev: any) => ({ ...prev, [key]: value }))
  }

  const updateCalculatorField = (key: string, value: any) => {
    setCalculator((prev: any) => ({ ...prev, [key]: value }))
  }

  const updateChecklist = (key: string, value: boolean) => {
    setSite((prev: any) => ({
      ...prev,
      onboarding_checklist: { ...(prev.onboarding_checklist || {}), [key]: value },
    }))
  }

  const updateTrustBadge = (index: number, key: 'title' | 'description', value: string) => {
    setSite((prev: any) => {
      const trustBadges = [...(prev.trust_badges || [])]
      trustBadges[index] = { ...(trustBadges[index] || {}), [key]: value }
      return { ...prev, trust_badges: trustBadges }
    })
  }

  const updateDomainField = (domainName: string, key: string, value: any) => {
    setDomains((prev) => prev.map((domain) => (domain.domain === domainName ? { ...domain, [key]: value } : domain)))
  }

  const domainPayload = () => {
    const existing = new Map(domains.map((domain) => [domain.domain, domain]))
    return domainText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((domain, index) => ({
        ...(existing.get(domain) || {}),
        domain,
        is_primary: index === 0,
      }))
  }

  const saveSite = async () => {
    setSaving('site')
    setError('')
    setMessage('')
    try {
      await homepageFetch(`/api/homepage/sites/${params.siteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...site,
          domains: domainPayload(),
        }),
      })
      homepageInvalidateCache('/api/homepage')
      setMessage('홈페이지 설정을 저장했습니다.')
      load()
    } catch (err: any) {
      setError(err.message || '저장하지 못했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const saveCalculator = async () => {
    setSaving('calculator')
    setError('')
    setMessage('')
    try {
      await homepageFetch(`/api/homepage/sites/${params.siteId}/calculator`, {
        method: 'PATCH',
        body: JSON.stringify(calculator),
      })
      homepageInvalidateCache('/api/homepage')
      setMessage('견적계산기 설정을 저장했습니다.')
      load()
    } catch (err: any) {
      setError(err.message || '계산기 설정을 저장하지 못했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const syncBlog = async () => {
    setSaving('blog')
    setError('')
    setMessage('')
    try {
      await homepageFetch(`/api/homepage/sites/${params.siteId}/blog`, {
        method: 'POST',
        body: JSON.stringify({ blog_url: site.blog_url, display_limit: blogSource?.display_limit || 6 }),
      })
      homepageInvalidateCache('/api/homepage')
      setMessage('블로그 글을 불러왔습니다.')
      load()
    } catch (err: any) {
      setError(err.message || '블로그를 불러오지 못했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const enablePush = async () => {
    setSaving('push')
    setError('')
    setMessage('')
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('이 브라우저는 알림을 지원하지 않습니다.')
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('알림 권한이 필요합니다.')
      const keyData = await homepageFetch<{ publicKey: string }>('/api/homepage/push/public-key')
      if (!keyData.publicKey) throw new Error('푸시 알림 키가 아직 설정되지 않았습니다.')
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      })
      await homepageFetch(`/api/homepage/sites/${params.siteId}/push-subscriptions`, {
        method: 'POST',
        body: JSON.stringify(subscription.toJSON()),
      })
      setMessage('이 기기에서 견적 알림을 받을 수 있습니다.')
    } catch (err: any) {
      setError(err.message || '알림 설정에 실패했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const testPush = async () => {
    setSaving('push-test')
    setError('')
    setMessage('')
    try {
      const result = await homepageFetch<{ sent: number; skipped?: boolean }>(`/api/homepage/sites/${params.siteId}/push-test`, {
        method: 'POST',
      })
      setMessage(result.skipped ? '푸시 키가 설정되지 않았습니다.' : `테스트 알림 ${result.sent}건을 보냈습니다.`)
      load()
    } catch (err: any) {
      setError(err.message || '테스트 알림을 보내지 못했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const saveMedia = async (item?: any) => {
    setSaving('media')
    setError('')
    setMessage('')
    try {
      await homepageFetch(`/api/homepage/sites/${params.siteId}/media`, {
        method: item?.id ? 'PATCH' : 'POST',
        body: JSON.stringify(item?.id ? item : mediaDraft),
      })
      setMediaDraft({
        item_type: 'after_photo',
        title: '',
        image_url: '',
        description: '',
        sort_order: 0,
        is_visible: true,
      })
      homepageInvalidateCache('/api/homepage')
      setMessage('사진/사례를 저장했습니다.')
      load()
    } catch (err: any) {
      setError(err.message || '사진/사례를 저장하지 못했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const deleteMedia = async (id: string) => {
    setSaving('media')
    setError('')
    setMessage('')
    try {
      await homepageFetch(`/api/homepage/sites/${params.siteId}/media?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      homepageInvalidateCache('/api/homepage')
      setMessage('사진/사례를 삭제했습니다.')
      load()
    } catch (err: any) {
      setError(err.message || '사진/사례를 삭제하지 못했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const updateSubmission = async (id: string, patch: any) => {
    await homepageFetch(`/api/homepage/sites/${params.siteId}/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    homepageInvalidateCache('/api/homepage')
    load()
  }

  if (!site || !calculator) {
    return <div className="rounded-2xl border bg-white p-5 text-sm text-gray-500">불러오는 중...</div>
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/homepage-admin" className="text-sm text-blue-600">
            ← 목록
          </Link>
          <h1 className="mt-1 text-2xl font-black">{site.name}</h1>
          <p className="text-sm text-gray-600">사장님이 바로 이해할 수 있는 항목만 수정합니다.</p>
        </div>
        <div className="flex gap-2">
          <Link href={publicUrl} target="_blank" className="rounded-xl border bg-white px-4 py-3 text-sm font-bold">
            미리보기
          </Link>
          <button onClick={enablePush} className="rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white">
            알림 켜기
          </button>
        </div>
      </div>

      {message && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">내 홈페이지</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="홈페이지 이름" value={site.name} onChange={(v) => updateSiteField('name', v)} />
          <Input label="업체명" value={site.business_name} onChange={(v) => updateSiteField('business_name', v)} />
          <Select
            label="공개 상태"
            value={site.status}
            onChange={(v) => updateSiteField('status', v)}
            options={[
              ['draft', '작성중'],
              ['published', '공개중'],
              ['paused', '중지'],
            ]}
          />
          <Select
            label="템플릿"
            value={site.template_key}
            onChange={(v) => updateSiteField('template_key', v)}
            options={HOMEPAGE_TEMPLATES.map((t) => [t.key, t.name])}
          />
          <Select
            label="전체 색감"
            value={site.color_palette || 'primary'}
            onChange={(v) => updateSiteField('color_palette', v)}
            options={Object.values(getHomepagePalettes(site.template_key)).map((p) => [p.key, p.name])}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">기본 정보</h2>
        <div className="mt-4 grid gap-3">
          <Input label="첫 화면 큰 문구" value={site.headline} onChange={(v) => updateSiteField('headline', v)} />
          <Input label="첫 화면 설명 문구" value={site.subheadline} onChange={(v) => updateSiteField('subheadline', v)} />
          <Textarea label="회사 소개 / 안내 문구" value={site.description || ''} onChange={(v) => updateSiteField('description', v)} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="대표 전화번호" value={site.phone || ''} onChange={(v) => updateSiteField('phone', v)} />
            <Input label="영업시간" value={site.business_hours || ''} onChange={(v) => updateSiteField('business_hours', v)} />
            <Input label="주소" value={site.address || ''} onChange={(v) => updateSiteField('address', v)} />
            <Input label="서비스 지역" value={site.service_area || ''} onChange={(v) => updateSiteField('service_area', v)} />
            <Input label="로고 이미지 주소" value={site.logo_image_url || ''} onChange={(v) => updateSiteField('logo_image_url', v)} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">하단 사업자 정보</h2>
        <p className="mt-1 text-sm text-gray-600">홈페이지 맨 아래에 표시될 사업자/법적 안내 정보입니다. 비워두면 기본 정보가 사용됩니다.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="상호명" value={site.footer_company_name || ''} onChange={(v) => updateSiteField('footer_company_name', v)} />
          <Input label="대표자명" value={site.footer_representative || ''} onChange={(v) => updateSiteField('footer_representative', v)} />
          <Input label="사업자등록번호" value={site.footer_business_number || ''} onChange={(v) => updateSiteField('footer_business_number', v)} />
          <Input label="이메일" value={site.footer_email || ''} onChange={(v) => updateSiteField('footer_email', v)} />
          <Input label="하단 전화번호" value={site.footer_phone || ''} onChange={(v) => updateSiteField('footer_phone', v)} />
          <Input label="하단 영업시간" value={site.footer_business_hours || ''} onChange={(v) => updateSiteField('footer_business_hours', v)} />
          <Input label="개인정보처리방침 URL" value={site.footer_privacy_url || ''} onChange={(v) => updateSiteField('footer_privacy_url', v)} />
          <Input label="이용약관 URL" value={site.footer_terms_url || ''} onChange={(v) => updateSiteField('footer_terms_url', v)} />
        </div>
        <Textarea label="하단 주소" value={site.footer_address || ''} onChange={(v) => updateSiteField('footer_address', v)} />
        <Textarea label="하단 안내 문구" value={site.footer_note || ''} onChange={(v) => updateSiteField('footer_note', v)} />
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">검색 노출 설정</h2>
        <p className="mt-1 text-sm text-gray-600">네이버나 구글에 보일 홈페이지 제목과 설명입니다.</p>
        <div className="mt-4 grid gap-3">
          <Input label="홈페이지 제목" value={site.seo_title || ''} onChange={(v) => updateSiteField('seo_title', v)} />
          <Textarea label="검색 설명" value={site.seo_description || ''} onChange={(v) => updateSiteField('seo_description', v)} />
          <Input
            label="검색 키워드"
            value={(site.seo_keywords || []).join(', ')}
            onChange={(v) => updateSiteField('seo_keywords', v.split(',').map((x) => x.trim()).filter(Boolean))}
          />
          <Input label="대표 이미지 주소" value={site.hero_image_url || ''} onChange={(v) => updateSiteField('hero_image_url', v)} />
          <Input label="공유 이미지 주소(OG)" value={site.seo_og_image_url || ''} onChange={(v) => updateSiteField('seo_og_image_url', v)} />
          <Input label="대표 주소(canonical)" value={site.seo_canonical_url || ''} onChange={(v) => updateSiteField('seo_canonical_url', v)} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="네이버 사이트 인증값" value={site.seo_naver_verification || ''} onChange={(v) => updateSiteField('seo_naver_verification', v)} />
            <Input label="구글 사이트 인증값" value={site.seo_google_verification || ''} onChange={(v) => updateSiteField('seo_google_verification', v)} />
          </div>
          <label className="flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={!!site.seo_noindex}
              onChange={(e) => updateSiteField('seo_noindex', e.target.checked)}
            />
            검색엔진에 노출하지 않기
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">문의 연결</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="카카오톡 상담 링크" value={site.kakao_url || ''} onChange={(v) => updateSiteField('kakao_url', v)} />
          <Input label="블로그 주소" value={site.blog_url || ''} onChange={(v) => updateSiteField('blog_url', v)} />
          <Input label="네이버 플레이스 주소" value={site.naver_place_url || ''} onChange={(v) => updateSiteField('naver_place_url', v)} />
          <Input label="인스타그램 주소" value={site.instagram_url || ''} onChange={(v) => updateSiteField('instagram_url', v)} />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">상품 / 온보딩 / 신뢰 정보</h2>
        <p className="mt-1 text-sm text-gray-600">판매 후 고객 세팅에 필요한 운영 정보를 관리합니다.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="판매 상품명" value={site.product_name || ''} onChange={(v) => updateSiteField('product_name', v)} />
          <Input label="제작비/월관리비 안내" value={site.product_price_note || ''} onChange={(v) => updateSiteField('product_price_note', v)} />
        </div>
        <Textarea
          label="포함 기능(한 줄에 하나)"
          value={(site.product_included_features || []).join('\n')}
          onChange={(v) => updateSiteField('product_included_features', v.split('\n').map((x) => x.trim()).filter(Boolean))}
          rows={5}
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['logo', '로고 수집'],
            ['photos', '대표 사진'],
            ['contact', '전화/카톡'],
            ['businessInfo', '사업자 정보'],
            ['pricing', '가격 기준'],
            ['reviews', '후기'],
            ['domain', '도메인'],
            ['push', '알림 설정'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={!!site.onboarding_checklist?.[key]}
                onChange={(e) => updateChecklist(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-xl border p-3">
              <Input
                label={`신뢰 배지 ${index + 1}`}
                value={site.trust_badges?.[index]?.title || ''}
                onChange={(v) => updateTrustBadge(index, 'title', v)}
              />
              <Textarea
                label="설명"
                value={site.trust_badges?.[index]?.description || ''}
                onChange={(v) => updateTrustBadge(index, 'description', v)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">도메인 연결</h2>
        <p className="mt-1 text-sm text-gray-600">고객 도메인을 한 줄에 하나씩 입력합니다. Vercel 연결 후 검증 상태를 공개에 사용합니다.</p>
        <Textarea label="도메인" value={domainText} onChange={setDomainText} rows={4} />
        {domains.length > 0 && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {domains.map((domain) => (
              <div key={domain.id} className="rounded-xl border bg-gray-50 p-3 text-xs">
                <p className="font-black">{domain.domain}</p>
                <div className="mt-2 grid gap-2">
                  <select
                    className="rounded-lg border px-2 py-2"
                    value={domain.verification_status || (domain.verified ? 'verified' : 'pending')}
                    onChange={(e) => updateDomainField(domain.domain, 'verification_status', e.target.value)}
                  >
                    <option value="pending">검증 대기</option>
                    <option value="verified">검증됨</option>
                    <option value="error">오류</option>
                  </select>
                  <input
                    className="rounded-lg border px-2 py-2"
                    placeholder="DNS 안내값"
                    value={domain.dns_target || ''}
                    onChange={(e) => updateDomainField(domain.domain, 'dns_target', e.target.value)}
                  />
                  <input
                    className="rounded-lg border px-2 py-2"
                    placeholder="검증 토큰"
                    value={domain.verification_token || ''}
                    onChange={(e) => updateDomainField(domain.domain, 'verification_token', e.target.value)}
                  />
                  <input
                    className="rounded-lg border px-2 py-2"
                    placeholder="오류 메모"
                    value={domain.verification_error || ''}
                    onChange={(e) => updateDomainField(domain.domain, 'verification_error', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={saveSite}
        disabled={saving === 'site'}
        className="sticky bottom-3 z-20 w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg disabled:opacity-60"
      >
        {saving === 'site' ? '저장 중...' : '홈페이지 설정 저장'}
      </button>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">입주청소 / 이사청소 견적계산기</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <MoneyInput label="평당 가격" value={calculator.base_unit_price} onChange={(v) => updateCalculatorField('base_unit_price', v)} />
          <MoneyInput label="최소 시공 금액" value={calculator.minimum_price} onChange={(v) => updateCalculatorField('minimum_price', v)} />
          <MoneyInput label="오염 심함 추가금" value={calculator.pollution_extra_heavy} onChange={(v) => updateCalculatorField('pollution_extra_heavy', v)} />
          <MoneyInput label="엘리베이터 없음 추가금" value={calculator.no_elevator_extra} onChange={(v) => updateCalculatorField('no_elevator_extra', v)} />
          {HOMEPAGE_CLEANING_OPTIONS.map((option) => (
            <MoneyInput
              key={option.key}
              label={`${option.label} 추가금`}
              value={calculator.option_extras?.[option.key] || 0}
              onChange={(v) =>
                updateCalculatorField('option_extras', { ...(calculator.option_extras || {}), [option.key]: v })
              }
            />
          ))}
          <MoneyInput label="할인율(%)" value={calculator.discount_rate} onChange={(v) => updateCalculatorField('discount_rate', v)} />
        </div>
        <Textarea label="계산 결과 안내문구" value={calculator.result_notice || ''} onChange={(v) => updateCalculatorField('result_notice', v)} />
        <Textarea label="견적 하단 주의사항" value={calculator.caution_note || ''} onChange={(v) => updateCalculatorField('caution_note', v)} />
        <button
          onClick={saveCalculator}
          disabled={saving === 'calculator'}
          className="mt-3 w-full rounded-xl bg-gray-950 py-3 font-bold text-white disabled:opacity-60"
        >
          {saving === 'calculator' ? '저장 중...' : '계산기 설정 저장'}
        </button>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">라이브 포트폴리오</h2>
            <p className="text-sm text-gray-600">블로그에 글만 써도 홈페이지 최근 현장 사례에 표시됩니다.</p>
          </div>
          <button
            onClick={syncBlog}
            disabled={saving === 'blog' || !site.blog_url}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving === 'blog' ? '불러오는 중...' : '최근 글 불러오기'}
          </button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {blogPosts.slice(0, 6).map((post) => (
            <a key={post.id} href={post.url} className="rounded-xl border p-3 text-sm hover:border-blue-300">
              <p className="font-bold line-clamp-2">{post.title}</p>
              <p className="mt-1 text-xs text-gray-500">{post.published_at?.slice(0, 10) || '날짜 없음'}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">사진 / 사례 직접 등록</h2>
        <p className="mt-1 text-sm text-gray-600">블로그 없이도 공개 홈페이지 전후사진, 청소 후 사진, 포트폴리오에 사용할 이미지를 등록합니다.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Select
            label="표시 위치"
            value={mediaDraft.item_type}
            onChange={(v) => setMediaDraft((prev) => ({ ...prev, item_type: v }))}
            options={[
              ['after_photo', '청소 후 자동 슬라이더'],
              ['before_after', '전후사진'],
              ['portfolio', '현장 사례'],
              ['gallery', '갤러리'],
            ]}
          />
          <Input label="제목" value={mediaDraft.title} onChange={(v) => setMediaDraft((prev) => ({ ...prev, title: v }))} />
          <Input label="이미지 주소" value={mediaDraft.image_url} onChange={(v) => setMediaDraft((prev) => ({ ...prev, image_url: v }))} />
          <MoneyInput label="정렬 순서" value={mediaDraft.sort_order} onChange={(v) => setMediaDraft((prev) => ({ ...prev, sort_order: v }))} />
        </div>
        <Textarea label="설명" value={mediaDraft.description} onChange={(v) => setMediaDraft((prev) => ({ ...prev, description: v }))} />
        <button
          onClick={() => saveMedia()}
          disabled={saving === 'media' || !mediaDraft.image_url}
          className="mt-3 w-full rounded-xl bg-gray-950 py-3 font-bold text-white disabled:opacity-60"
        >
          사진/사례 추가
        </button>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {mediaItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border">
              <div className="h-32 bg-gray-100">
                <img src={item.image_url} alt={item.alt_text || item.title || ''} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-2 p-3 text-sm">
                <p className="font-black">{item.title || '제목 없음'}</p>
                <p className="text-xs text-gray-500">{item.item_type} · 순서 {item.sort_order}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => saveMedia({ ...item, is_visible: !item.is_visible })}
                    className="rounded-lg border px-3 py-2 text-xs font-bold"
                  >
                    {item.is_visible ? '숨기기' : '보이기'}
                  </button>
                  <button
                    onClick={() => deleteMedia(item.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">견적 문의</h2>
            <p className="text-sm text-gray-600">실제 연락처 제출은 높은 우선순위로, 전화/카톡 클릭 로그는 낮은 우선순위로 구분됩니다.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={enablePush} className="rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white">
              알림 켜기
            </button>
            <button onClick={testPush} className="rounded-xl border bg-white px-4 py-3 text-sm font-bold">
              테스트 알림
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3">활성 구독 {pushSubscriptions.filter((item) => item.active).length}개</div>
          <div className="rounded-xl bg-gray-50 p-3">최근 알림 {notifications.length}건</div>
          <div className="rounded-xl bg-gray-50 p-3">마지막 상태 {notifications[0]?.status || '없음'}</div>
        </div>
        <div className="mt-4 space-y-3">
          {submissions.length ? (
            submissions.map((submission) => (
              <div key={submission.id} className="rounded-xl border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold">
                      {submission.customer_name} · {submission.customer_phone}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {submission.region || '-'} / {submission.area_pyeong || '-'}평 /{' '}
                      {Number(submission.estimated_amount || 0).toLocaleString('ko-KR')}원~
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {submission.contact_method || 'form'} · 우선순위 {submission.priority || 'normal'} ·{' '}
                      {submission.created_at?.slice(0, 16).replace('T', ' ') || ''}
                    </p>
                    {submission.message && <p className="mt-2 text-sm text-gray-700">{submission.message}</p>}
                  </div>
                  <div className="grid gap-2 sm:w-44">
                    <select
                      className="rounded-lg border px-3 py-2 text-sm"
                      value={submission.status}
                      onChange={(e) => updateSubmission(submission.id, { status: e.target.value })}
                    >
                      <option value="new">신규</option>
                      <option value="checked">확인</option>
                      <option value="consulting">상담중</option>
                      <option value="completed">완료</option>
                      <option value="hold">보류</option>
                    </select>
                    <select
                      className="rounded-lg border px-3 py-2 text-sm"
                      value={submission.priority || 'normal'}
                      onChange={(e) => updateSubmission(submission.id, { priority: e.target.value })}
                    >
                      <option value="low">낮음</option>
                      <option value="normal">보통</option>
                      <option value="high">높음</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    type="datetime-local"
                    defaultValue={submission.contacted_at?.slice(0, 16) || ''}
                    onBlur={(e) => updateSubmission(submission.id, { contacted_at: e.target.value })}
                  />
                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    type="datetime-local"
                    defaultValue={submission.scheduled_at?.slice(0, 16) || ''}
                    onBlur={(e) => updateSubmission(submission.id, { scheduled_at: e.target.value })}
                  />
                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="보류/실패 사유"
                    defaultValue={submission.lost_reason || ''}
                    onBlur={(e) => updateSubmission(submission.id, { lost_reason: e.target.value })}
                  />
                </div>
                <input
                  className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="관리자 메모"
                  defaultValue={submission.admin_memo || ''}
                  onBlur={(e) => updateSubmission(submission.id, { admin_memo: e.target.value })}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">아직 견적 문의가 없습니다.</p>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="mt-5 rounded-xl bg-gray-50 p-3">
            <p className="text-sm font-black">최근 알림 이력</p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {notifications.slice(0, 5).map((notification) => (
                <p key={notification.id}>
                  {notification.created_at?.slice(0, 16).replace('T', ' ')} · {notification.channel} · {notification.status}
                  {notification.error ? ` · ${notification.error}` : ''}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input className="w-full rounded-xl border px-3 py-3" value={value || ''} onChange={(e) => onChange(e.target.value)} />
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
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <textarea className="w-full rounded-xl border px-3 py-3" rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[][]
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <select className="w-full rounded-xl border px-3 py-3" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        className="w-full rounded-xl border px-3 py-3"
        type="number"
        value={value || 0}
        onChange={(e) => onChange(Number(e.target.value || 0))}
      />
    </label>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
