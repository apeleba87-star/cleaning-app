import EstimateCalculator from '@/components/homepage/EstimateCalculator'
import HomepageMenu from '@/components/homepage/HomepageMenu'
import { HOMEPAGE_PREVIEW_IMAGES } from '@/lib/homepage/mock'
import type { CSSProperties } from 'react'
import {
  getHomepageTemplate,
  getHomepagePalette,
  normalizeHomepagePageSlug,
} from '@/lib/homepage/templates'
import type { HomepagePageSlug, HomepagePublicPackage } from '@/types/homepage'
import type { HomepagePalette } from '@/lib/homepage/templates'

type Props = {
  data: HomepagePublicPackage
  page?: HomepagePageSlug
}

const serviceCards = [
  ['입주청소', '공사 분진, 창틀 먼지, 욕실 물때까지 입주 전 확인해야 할 부분을 정리합니다.'],
  ['이사청소', '짐이 빠진 뒤 보이는 생활 오염과 주방 기름때를 중심으로 관리합니다.'],
  ['상가/사무실', '영업 동선, 바닥 상태, 화장실 사용량에 맞춰 정기 또는 단기 청소를 진행합니다.'],
]

const reviews = [
  '창틀이랑 욕실 사진을 전후로 보내줘서 확인이 쉬웠어요.',
  '입주 전날 급하게 문의했는데 가능한 시간부터 바로 안내해줬습니다.',
  '견적이 애매하지 않고 평수와 옵션 기준으로 설명돼서 좋았습니다.',
]

const faqRows = [
  ['견적 금액은 확정 금액인가요?', '홈페이지 계산 금액은 예상 견적이며 현장 구조와 오염도에 따라 달라질 수 있습니다.'],
  ['당일 예약도 가능한가요?', '일정이 비어 있으면 가능합니다. 전화나 카카오톡으로 빠르게 확인해주세요.'],
  ['청소 전후 사진을 받을 수 있나요?', '요청 시 작업 전후 사진을 공유해드립니다.'],
]

const cleaningScenes = [
  ['Before', '창틀 분진', '입주 전 가장 많이 남는 공사 먼지'],
  ['After', '욕실 물때', '수전, 유리, 배수구 주변 디테일'],
  ['Check', '주방 기름때', '후드와 상판 오염 확인'],
  ['Finish', '바닥 마감', '청소 후 동선별 최종 점검'],
]

const confidenceRows = [
  ['A/S 안내', '청소 후 미흡한 부분은 사진과 함께 확인하고 빠르게 안내합니다.'],
  ['직접 관리', '하청 느낌이 나지 않도록 작업 기준과 확인 절차를 업체가 직접 관리합니다.'],
  ['보험/안전', '파손이나 사고 걱정을 줄이기 위해 보상 안내와 작업 기준을 명확히 둡니다.'],
]

const compareRows = [
  ['사후관리', '작업 후 확인과 추가 안내까지 이어집니다.', '사진 확인', '불명확'],
  ['견적 기준', '평수, 오염도, 옵션 기준으로 설명합니다.', '명확', '상담마다 다름'],
  ['작업 확인', '전후 사진으로 청소 상태를 확인합니다.', '가능', '제한적'],
]

export default function PublicHomepage({ data, page = 'home' }: Props) {
  const { site, calculator, blogPosts } = data
  const template = getHomepageTemplate(site.template_key)
  const palette = getHomepagePalette(site.template_key, site.color_palette)
  const currentPage = normalizeHomepagePageSlug(page, site.template_key)
  const showCalculator = site.calculator_enabled && calculator && template.calculatorPosition !== 'none'
  const heroCalculator = showCalculator && template.calculatorPosition === 'hero'
  const secondaryCalculator = showCalculator && template.calculatorPosition === 'secondary'
  const isFastContact = site.template_key === 'sales-fast-contact'
  const isCampaign = site.template_key === 'interactive-campaign'
  const previewPrefix = site.slug?.startsWith('preview-') ? `/homepage-preview/${site.template_key}` : null
  const basePath = previewPrefix || (typeof site.slug === 'string' ? `/t/${site.slug}` : '')
  const pageHref = (slug: HomepagePageSlug) => (slug === 'home' ? basePath : `${basePath}/${slug}`)
  const menuItems = template.pages.map((slug) => ({ slug, href: pageHref(slug) }))

  return (
    <main
      className={`homepage-site min-h-screen ${palette.text}`}
      style={palette.cssVars as CSSProperties}
    >
      <header className="homepage-flat sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur-xl">
        <div className="hp-container flex items-center justify-between gap-3 py-3">
          <a href={pageHref('home')} className="group grid min-w-0 grid-cols-[2.6rem_1fr] items-center gap-3">
            <span className="hp-dark flex h-10 w-10 items-center justify-center rounded-full text-sm font-black">
              {(site.business_name || site.name || 'C').slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black">{site.business_name || site.name}</span>
              <span className="block truncate text-xs font-bold text-gray-500">{site.service_area || site.address || '청소 전문 서비스'}</span>
            </span>
          </a>
          <div className="flex shrink-0 items-center gap-2">
            {site.phone && (
              <a href={`tel:${site.phone}`} className={`hidden rounded-full px-4 py-2 text-sm font-black sm:inline-flex ${palette.primary} ${palette.primaryText}`}>
                전화
              </a>
            )}
            {site.kakao_url && (
              <a href={site.kakao_url} className="hidden rounded-full bg-yellow-300 px-4 py-2 text-sm font-black text-gray-950 sm:inline-flex">
                카톡
              </a>
            )}
            <HomepageMenu
              site={site}
              items={menuItems}
              currentPage={currentPage}
              palette={palette}
              showCalculator={!!showCalculator}
            />
          </div>
        </div>
      </header>

      {currentPage === 'home' && (
        <HomePage
          data={data}
          pageHref={pageHref}
          palette={palette}
          heroCalculator={!!heroCalculator}
          secondaryCalculator={!!secondaryCalculator}
          isCampaign={isCampaign}
        />
      )}
      {currentPage === 'about' && <AboutPage data={data} palette={palette} />}
      {currentPage === 'services' && <ServicesPage showEstimateCta={!!showCalculator} pageHref={pageHref} palette={palette} />}
      {currentPage === 'portfolio' && <PortfolioSection palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts} />}
      {currentPage === 'estimate' && showCalculator && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <EstimateCalculator site={site} calculator={calculator} />
        </section>
      )}
      {currentPage === 'estimate' && !showCalculator && <ContactPage data={data} palette={palette} />}
      {currentPage === 'reviews' && <ReviewsPage palette={palette} />}
      {currentPage === 'faq' && <FaqPage palette={palette} />}
      {currentPage === 'contact' && <ContactPage data={data} palette={palette} />}

      {(isFastContact || showCalculator) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/92 p-3 shadow-lg backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl gap-2">
            {showCalculator && (
              <a href={pageHref('estimate')} className={`flex-1 rounded-full ${palette.primary} py-3 text-center font-black ${palette.primaryText}`}>
                견적 계산
              </a>
            )}
            {site.phone && (
              <a href={`tel:${site.phone}`} className="hp-dark flex-1 rounded-full py-3 text-center font-black">
                전화 문의
              </a>
            )}
          </div>
        </div>
      )}
      <HomepageRevealScript />
    </main>
  )
}

function HomepageRevealScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function () {
  function initHomepageReveal() {
    var roots = document.querySelectorAll('.homepage-site');
    roots.forEach(function (root) {
      var selector = [
        '.hp-container > div',
        '.hp-container > article',
        '.hp-container > a',
        '.hp-photo-frame',
        'article',
        '.homepage-reveal-target'
      ].join(',');
      var targets = Array.from(new Set(Array.from(root.querySelectorAll(selector))));
      targets.forEach(function (target, index) {
        target.classList.add('homepage-reveal');
        target.style.setProperty('--reveal-delay', String(Math.min(index % 4, 3) * 140) + 'ms');
      });
      function checkReveal() {
        var triggerLine = window.innerHeight * 0.76;
        targets.forEach(function (target) {
          if (target.classList.contains('homepage-revealed')) return;
          var rect = target.getBoundingClientRect();
          if (rect.top < triggerLine && rect.bottom > 0) {
            target.classList.add('homepage-revealed');
          }
        });
      }
      var ticking = false;
      function requestCheck() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          checkReveal();
        });
      }
      window.addEventListener('scroll', requestCheck, { passive: true });
      window.addEventListener('resize', requestCheck);
      setTimeout(checkReveal, 80);
      setTimeout(checkReveal, 500);
      if (!('IntersectionObserver' in window)) {
        return;
      }
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('homepage-revealed');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -42% 0px', threshold: 0.08 });
      targets.forEach(function (target) {
        if (target.classList.contains('homepage-revealed')) return;
        observer.observe(target);
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomepageReveal, { once: true });
  } else {
    window.requestAnimationFrame(initHomepageReveal);
  }
})();
        `,
      }}
    />
  )
}

function HomePage({
  data,
  pageHref,
  heroCalculator,
  secondaryCalculator,
  isCampaign,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  heroCalculator: boolean
  secondaryCalculator: boolean
  isCampaign: boolean
  palette: HomepagePalette
}) {
  const { site, calculator, blogPosts } = data
  const isShowcase = site.template_category === 'showcase'
  const isConversion = site.template_category === 'sales' || site.template_category === 'interactive'
  const usePreviewImages = site.slug?.startsWith('preview-')

  return (
    <>
      <TemplateHero
        data={data}
        pageHref={pageHref}
        palette={palette}
        heroCalculator={heroCalculator}
        secondaryCalculator={secondaryCalculator}
        isCampaign={isCampaign}
      />
      <TrustStrip palette={palette} />
      {isShowcase && blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} />
      )}
      <ServicesPage compact showEstimateCta={secondaryCalculator} pageHref={pageHref} palette={palette} />
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} />
      <ProcessSection palette={palette} compact />
      {isConversion && <ComparisonSection palette={palette} />}
      <ConfidenceSection palette={palette} />
      {isConversion && (
        <BenefitOfferSection data={data} palette={palette} pageHref={pageHref} />
      )}
      {!isShowcase && blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} />
      )}
      <ReviewsPage compact palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={heroCalculator || secondaryCalculator} />
    </>
  )
}

function TemplateHero({
  data,
  pageHref,
  palette,
  heroCalculator,
  secondaryCalculator,
  isCampaign,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
  heroCalculator: boolean
  secondaryCalculator: boolean
  isCampaign: boolean
}) {
  const { site, calculator } = data
  const template = getHomepageTemplate(site.template_key)
  const ctaHref = heroCalculator || secondaryCalculator ? pageHref('estimate') : pageHref('contact')
  const ctaLabel = heroCalculator || secondaryCalculator ? '예상 견적 확인' : '상담 문의'
  const isInteractive = template.category === 'interactive'
  const isSales = template.category === 'sales'

  if (isInteractive) {
    return (
      <section className="hp-section">
        <div className="hp-container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className={`homepage-label mb-5 inline-flex rounded-full ${palette.accent} px-4 py-2 text-xs font-black uppercase ${palette.accentText}`}>
              30초 예상 견적
            </p>
            <h1 className="hp-display font-black">가격을 먼저 보여주는 청소 홈페이지</h1>
            <p className="hp-copy mt-6 max-w-2xl">
              고객은 전화하기 전에 금액을 먼저 확인합니다. 첫 화면에서 평수와 옵션을 입력하고 바로 전화/카카오톡 상담으로 이어지게 만듭니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={pageHref('estimate')} className={`hp-cta ${palette.primary} ${palette.primaryText}`}>견적 계산 시작</a>
              {site.phone && <a href={`tel:${site.phone}`} className={`hp-cta border ${palette.border} bg-white ${palette.text}`}>전화 문의</a>}
            </div>
          </div>
          <div className={isCampaign ? 'lg:-mr-6' : ''}>
            {heroCalculator && calculator ? <EstimateCalculator site={site} calculator={calculator} /> : <CampaignBoard palette={palette} />}
          </div>
        </div>
      </section>
    )
  }

  if (isSales) {
    return (
      <section className="hp-dark">
        <div className="hp-container grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <p className="homepage-label mb-5 text-xs font-black uppercase opacity-70">{template.name}</p>
            <h1 className="hp-display font-black">{site.headline}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 opacity-75">{site.subheadline}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <LocalBadge label="상담" value="전화/카톡" palette={palette} />
              <LocalBadge label="확인" value="전후 사진" palette={palette} />
              <LocalBadge label="견적" value="기준 공개" palette={palette} />
            </div>
          </div>
          <ContactTicket site={site} palette={palette} large />
        </div>
      </section>
    )
  }

  return (
    <section className="hp-section hp-surface border-b border-black/5">
      <div className="hp-container grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <HeroCopy site={site} templateName={template.name} palette={palette} ctaHref={ctaHref} ctaLabel={ctaLabel} />
        <SceneMosaic palette={palette} usePreviewImages={site.slug?.startsWith('preview-')} />
      </div>
    </section>
  )
}

function HeroCopy({
  site,
  templateName,
  palette,
  ctaHref,
  ctaLabel,
  wide = false,
}: {
  site: HomepagePublicPackage['site']
  templateName: string
  palette: HomepagePalette
  ctaHref: string
  ctaLabel: string
  wide?: boolean
}) {
  return (
    <div className={wide ? 'max-w-3xl' : ''}>
      <p className={`homepage-label mb-5 inline-flex rounded-full ${palette.accent} px-4 py-2 text-xs font-black uppercase ${palette.accentText}`}>
        {templateName}
      </p>
      <h1 className="hp-display font-black">{site.headline}</h1>
      <p className="hp-copy mt-6 max-w-2xl">{site.subheadline}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={ctaHref} className={`hp-cta ${palette.primary} ${palette.primaryText}`}>
          {ctaLabel}
        </a>
        {site.blog_url && (
          <a href={site.blog_url} className={`hp-cta border ${palette.border} bg-white ${palette.text}`}>
            현장 사례 보기
          </a>
        )}
      </div>
    </div>
  )
}

function SceneMosaic({ palette, usePreviewImages = false }: { palette: HomepagePalette; usePreviewImages?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5">
      {cleaningScenes.map(([tag, title, text], index) => (
        <div
          key={title}
          data-cursor="active"
          className={`homepage-reveal-target hp-photo-frame flex min-h-64 flex-col justify-between overflow-hidden border p-5 sm:min-h-80 sm:p-7 lg:min-h-96 ${
            usePreviewImages || index % 3 === 0 ? 'text-white' : palette.text
          }`}
          style={
            usePreviewImages
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.34) 42%, rgba(0,0,0,0.78)), url(${HOMEPAGE_PREVIEW_IMAGES[index]})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }
              : index % 3 === 0
                ? { background: 'var(--hp-dark)' }
                : undefined
          }
        >
          <p className="homepage-label text-xs font-black uppercase opacity-80 drop-shadow">{tag}</p>
          <div>
            <p className="text-2xl font-black drop-shadow sm:text-3xl">{title}</p>
            <p className="mt-2 max-w-56 text-sm font-bold leading-6 opacity-90 drop-shadow">{text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TrustStrip({ palette }: { palette: HomepagePalette }) {
  return (
    <section className="border-y border-black/10 bg-white">
      <div className="hp-container grid gap-4 py-5 text-sm font-black text-gray-700 sm:grid-cols-4">
        {['전후 사진 확인', '지역 기반 상담', '추가 비용 기준 안내', '입주/이사 일정 대응'].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${palette.primary}`} />
            {item}
          </div>
        ))}
      </div>
    </section>
  )
}

function BeforeAfterSection({
  palette,
  usePreviewImages = false,
}: {
  palette: HomepagePalette
  usePreviewImages?: boolean
}) {
  return (
    <section className="hp-section">
      <div className="hp-container">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Before / After</p>
          <h2 className="hp-title mt-3 font-black">
            청소는 말보다 전후 차이가 먼저 보여야 합니다
          </h2>
          <p className="hp-copy mt-5">
            창틀, 욕실, 주방, 바닥처럼 고객이 가장 많이 확인하는 구역을 전후 사진 중심으로 보여줍니다.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cleaningScenes.map(([tag, title, text], index) => (
            <div key={`${tag}-${title}`} className="homepage-reveal-target overflow-hidden border border-black/10 bg-white">
              <div className={`relative h-64 overflow-hidden sm:h-80 lg:h-96 ${index % 2 === 0 ? 'bg-white/70' : palette.accent}`}>
                {usePreviewImages && (
                  <img
                    src={HOMEPAGE_PREVIEW_IMAGES[index + 4] || HOMEPAGE_PREVIEW_IMAGES[index]}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent p-4 text-white">
                  <p className="homepage-label text-xs font-black drop-shadow">{tag.toUpperCase()}</p>
                  <span className="h-2 w-2 rounded-full bg-white/80" />
                </div>
              </div>
              <div className="p-5">
                <p className="text-xl font-black">{title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </section>
  )
}

function ConfidenceSection({ palette }: { palette: HomepagePalette }) {
  return (
    <section className="hp-dark">
      <div className="hp-container py-16 sm:py-24">
        <p className="homepage-label text-sm font-bold uppercase opacity-70">Proof of confidence</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="hp-title font-black">자신감은 문구가 아니라 근거로 보여줍니다</h2>
            <p className="mt-4 leading-7 opacity-75">
              고객은 청소 전부터 업체 비교, 추가 비용, 사후처리를 걱정합니다. 그 걱정을 첫 화면에서 바로 줄여야 합니다.
            </p>
          </div>
          <div className="grid gap-3">
            {confidenceRows.map(([title, text], index) => (
              <div key={title} className="grid gap-3 border-t border-white/15 py-4 sm:grid-cols-[4rem_0.35fr_1fr]">
                <p className="font-black opacity-60">0{index + 1}</p>
                <p className="font-black">{title}</p>
                <p className="text-sm leading-6 opacity-75">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ComparisonSection({ palette }: { palette: HomepagePalette }) {
  return (
    <section className="hp-section hp-soft">
      <div className="hp-container">
      <div className="mb-6">
        <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Compare</p>
        <h2 className="hp-title mt-3 font-black">고객이 비교하는 기준을 먼저 보여주세요</h2>
      </div>
      <div className="overflow-hidden border border-gray-200 bg-white">
        {compareRows.map(([title, text, ours, others]) => (
          <div key={title} className="grid gap-3 border-b border-gray-200 p-4 last:border-b-0 md:grid-cols-[0.25fr_1fr_0.25fr_0.25fr]">
            <p className="font-black">{title}</p>
            <p className={`text-sm leading-6 ${palette.subtext}`}>{text}</p>
            <p className={`font-black ${palette.accentText}`}>{ours}</p>
            <p className="text-sm font-bold text-gray-600">{others}</p>
          </div>
        ))}
      </div>
      </div>
    </section>
  )
}

function BenefitOfferSection({
  data,
  palette,
  pageHref,
}: {
  data: HomepagePublicPackage
  palette: HomepagePalette
  pageHref: (slug: HomepagePageSlug) => string
}) {
  const { site } = data
  return (
    <section className="hp-section">
      <div className="hp-container">
      <div className={`${palette.accent} p-6 sm:p-10`}>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Limited benefit</p>
            <h2 className="hp-title mt-3 font-black">
              상담 전, 받을 수 있는 추가 관리 항목을 먼저 확인하세요
            </h2>
            <p className="hp-copy mt-5">
              피톤치드, 유리막 코팅, 스팀 살균처럼 고객이 관심 가질 혜택은 업체별로 문구만 바꿔 노출할 수 있습니다.
            </p>
          </div>
          <div className="grid gap-2">
            {['피톤치드 탈취', '욕실 유리 코팅', '악취 제거 스팀'].map((item, index) => (
              <div key={item} className="bg-white px-4 py-3 font-black">
                {index + 1}. {item}
              </div>
            ))}
            <a href={pageHref('estimate')} className="hp-dark mt-2 px-4 py-4 text-center font-black">
              혜택 포함 견적 확인
            </a>
            {site.phone && (
              <a href={`tel:${site.phone}`} className="bg-white px-4 py-4 text-center font-black">
                전화로 바로 문의
              </a>
            )}
          </div>
        </div>
      </div>
      </div>
    </section>
  )
}

function FinalCta({
  data,
  palette,
  pageHref,
  showCalculator,
}: {
  data: HomepagePublicPackage
  palette: HomepagePalette
  pageHref: (slug: HomepagePageSlug) => string
  showCalculator: boolean
}) {
  const { site } = data
  return (
    <section className="hp-section pt-0">
      <div className="hp-container">
        <div className="grid gap-6 border-t border-black/10 pt-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className={`homepage-label text-xs font-black uppercase ${palette.accentText}`}>Ready to clean</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">청소 일정, 지금 바로 확인하세요</h2>
            <p className="hp-copy mt-4 max-w-2xl">평수와 현장 상태를 알려주시면 가능한 일정과 예상 비용을 빠르게 안내합니다.</p>
          </div>
          <div className="grid gap-2 sm:min-w-72">
            {showCalculator && <a href={pageHref('estimate')} className={`hp-cta ${palette.primary} ${palette.primaryText}`}>예상 견적 확인</a>}
            {site.phone && <a href={`tel:${site.phone}`} className="hp-cta hp-dark">전화 문의</a>}
            {site.kakao_url && <a href={site.kakao_url} className="hp-cta bg-yellow-300 text-gray-950">카카오톡 문의</a>}
          </div>
        </div>
      </div>
    </section>
  )
}

function LocalBadge({ label, value, palette }: { label: string; value: string; palette: HomepagePalette }) {
  return (
    <div className={`${palette.surface} border ${palette.border} p-4`}>
      <p className={`text-xs font-bold ${palette.subtext}`}>{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  )
}

function ContactTicket({
  site,
  palette,
  large = false,
}: {
  site: HomepagePublicPackage['site']
  palette: HomepagePalette
  large?: boolean
}) {
  return (
    <div className={`hp-dark border border-white/10 p-6 ${large ? 'lg:p-10' : ''}`}>
      <p className="homepage-label text-sm font-black uppercase opacity-70">Quick contact</p>
      <p className="mt-8 text-4xl font-black">{site.phone || '010-1234-5678'}</p>
      <p className="mt-3 text-sm opacity-75">전화가 어려우면 카카오톡으로 사진과 평수를 보내주세요.</p>
      <div className="mt-6 grid gap-2">
        {site.phone && <a href={`tel:${site.phone}`} className={`hp-cta ${palette.surface} ${palette.text}`}>전화 바로 연결</a>}
        {site.kakao_url && <a href={site.kakao_url} className="hp-cta bg-yellow-300 text-gray-950">카카오톡 상담</a>}
      </div>
    </div>
  )
}

function ReviewStack({ palette }: { palette: HomepagePalette }) {
  return (
    <div className="mt-6 space-y-2">
      {reviews.map((review, index) => (
        <div key={review} className={`${palette.surface} rounded-2xl border ${palette.border} p-4 shadow-sm`}>
          <p className={`text-xs font-black ${palette.accentText}`}>REVIEW {index + 1}</p>
          <p className="mt-2 text-sm leading-6">“{review}”</p>
        </div>
      ))}
    </div>
  )
}

function ServiceComparison({ palette }: { palette: HomepagePalette }) {
  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border bg-white shadow-sm">
      {serviceCards.map(([title, text], index) => (
        <div key={title} className={`grid gap-3 border-b p-5 last:border-b-0 md:grid-cols-[0.25fr_0.35fr_1fr] ${palette.border}`}>
          <p className={`font-black ${palette.accentText}`}>0{index + 1}</p>
          <p className="font-black">{title}</p>
          <p className={`text-sm leading-6 ${palette.subtext}`}>{text}</p>
        </div>
      ))}
    </div>
  )
}

function StepPreview({ palette }: { palette: HomepagePalette }) {
  const steps = ['지역 선택', '평수 입력', '옵션 선택', '예상 금액']
  return (
    <div className={`${palette.surface} rounded-[2rem] border ${palette.border} p-5 shadow-xl`}>
      <p className={`text-sm font-black ${palette.accentText}`}>30초 견적 플로우</p>
      <div className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <div key={step} className={`${index === 0 ? 'hp-dark' : palette.muted + ' ' + palette.text} rounded-2xl p-4`}>
            <p className="text-xs font-black opacity-70">STEP {index + 1}</p>
            <p className="mt-1 font-black">{step}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CampaignBoard({ palette }: { palette: HomepagePalette }) {
  return (
    <div className={`${palette.surface} rounded-[2rem] border ${palette.border} p-5 shadow-xl`}>
      <p className={`text-sm font-black ${palette.accentText}`}>예상 견적</p>
      <p className="mt-2 text-5xl font-black">312,000원~</p>
      <div className="mt-6 grid gap-2">
        {['서울 강남구', '24평', '입주청소', '오염도 보통'].map((item) => (
          <div key={item} className={`${palette.muted} rounded-xl px-4 py-3 font-bold`}>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroVisual({ site }: { site: HomepagePublicPackage['site'] }) {
  return (
    <div data-cursor="active" className="hp-photo-frame overflow-hidden border">
      {site.hero_image_url ? (
        <img src={site.hero_image_url} alt="" className="aspect-[4/5] w-full object-cover lg:aspect-[5/4]" />
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center p-8 text-center lg:aspect-[5/4]">
          <div>
            <p className="text-6xl font-black text-gray-950">Clean</p>
            <p className="mt-3 font-bold text-gray-600">전후 사진으로 확인하는 청소</p>
          </div>
        </div>
      )}
    </div>
  )
}

function AboutPage({ data, palette }: { data: HomepagePublicPackage; palette: HomepagePalette }) {
  const { site } = data
  return (
    <section className="hp-section">
      <div className="hp-container">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <HeroVisual site={site} />
        <div className="hp-surface border border-black/10 p-6 sm:p-10">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>About us</p>
          <h1 className="hp-title mt-3 font-black">{site.business_name || site.name}</h1>
          <p className="hp-copy mt-5">
            {site.description || '현장 상황에 맞춰 꼼꼼하고 투명한 청소 서비스를 제공합니다.'}
          </p>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="서비스 지역" value={site.service_area || '상담 시 안내'} />
            <Info label="영업시간" value={site.business_hours || '상담 시 안내'} />
            <Info label="주소" value={site.address || '상담 시 안내'} />
            <Info label="대표번호" value={site.phone || '상담 시 안내'} />
          </dl>
        </div>
      </div>
      </div>
    </section>
  )
}

function ServicesPage({
  compact = false,
  showEstimateCta,
  pageHref,
  palette,
}: {
  compact?: boolean
  showEstimateCta: boolean
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Our service</p>
          <h1 className="hp-title mt-3 font-black">필요한 청소를 쉽게 선택하세요</h1>
        </div>
        {showEstimateCta && (
          <a href={pageHref('estimate')} className="hp-cta hp-dark hidden text-sm sm:inline-flex">
            견적 계산하기
          </a>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {serviceCards.map(([title, text], index) => (
          <article
            key={title}
            data-cursor="active"
            className="homepage-reveal-target group border-y border-black/10 bg-white p-6 transition duration-300 hover:bg-gray-50"
          >
            <p className={`mb-6 text-sm font-black ${palette.accentText}`}>NO{String(index + 1).padStart(2, '0')}</p>
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
            {!compact && <p className={`mt-4 text-sm font-bold ${palette.accentText}`}>VIEW MORE</p>}
          </article>
        ))}
      </div>
      </div>
    </section>
  )
}

function ReviewsPage({ compact = false, palette }: { compact?: boolean; palette: HomepagePalette }) {
  return (
    <section className="hp-section">
      <div className="hp-container">
      <div className="hp-surface border border-black/10 p-6 sm:p-10">
        <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Reviews</p>
        <h1 className="hp-title mt-3 font-black">믿고 맡길 수 있는 청소</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {reviews.slice(0, compact ? 3 : reviews.length).map((review) => (
              <div key={review} className={`hp-soft border border-black/5 p-5 text-sm leading-7 ${palette.subtext}`}>
              “{review}”
            </div>
          ))}
        </div>
      </div>
      </div>
    </section>
  )
}

function ProcessSection({ palette, compact = false }: { palette: HomepagePalette; compact?: boolean }) {
  const processRows = [
    ['01', '상담 및 현장 확인', '지역, 평수, 입주 일정, 오염도를 먼저 확인합니다.'],
    ['02', '예상 견적 안내', '평수와 옵션 기준으로 예상 금액을 투명하게 안내합니다.'],
    ['03', '청소 진행', '창틀, 욕실, 주방, 바닥 등 구역별로 작업합니다.'],
    ['04', '전후 사진 확인', '청소 전후 사진으로 완료 상태를 확인합니다.'],
  ]

  return (
    <section className="hp-section">
      <div className="hp-container">
      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div>
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Process</p>
          <h2 className="hp-title mt-3 font-black">청소는 순서가 명확해야 결과가 깔끔합니다</h2>
          {!compact && (
            <p className="hp-copy mt-5">
              상담부터 완료 확인까지 고객이 헷갈리지 않도록 단계별로 안내합니다.
            </p>
          )}
        </div>
        <div className={`border-y ${palette.border}`}>
          {processRows.map(([number, title, text]) => (
            <div key={number} className={`grid gap-3 border-b ${palette.border} py-5 last:border-b-0 sm:grid-cols-[0.18fr_0.32fr_1fr]`}>
              <p className={`text-xl font-black ${palette.accentText}`}>{number}</p>
              <p className="font-black">{title}</p>
              <p className={`text-sm leading-6 ${palette.subtext}`}>{text}</p>
            </div>
          ))}
        </div>
      </div>
      </div>
    </section>
  )
}

function FaqPage({ palette }: { palette: HomepagePalette }) {
  return (
    <section className="hp-section">
      <div className="mx-auto max-w-4xl px-4">
      <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>FAQ</p>
      <h1 className="hp-title mt-3 font-black">자주 묻는 질문</h1>
      <div className="mt-6 space-y-3">
        {faqRows.map(([question, answer]) => (
          <article key={question} className="hp-surface hp-border border p-5">
            <h2 className="font-black">{question}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{answer}</p>
          </article>
        ))}
      </div>
      </div>
    </section>
  )
}

function ContactPage({ data, palette }: { data: HomepagePublicPackage; palette: HomepagePalette }) {
  const { site } = data
  return (
    <section id="contact" className="hp-section pb-28">
      <div className="hp-container">
      <div className="hp-dark p-6 sm:p-10">
        <p className="homepage-label text-sm font-bold uppercase text-blue-200">Contact us</p>
        <h1 className="hp-title mt-3 font-black">지금 바로 상담받으세요</h1>
        <p className="mt-3 text-gray-300">{site.description || '현장 상황에 맞춰 빠르게 안내드리겠습니다.'}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {site.phone && (
            <a href={`tel:${site.phone}`} className={`hp-cta ${palette.surface} ${palette.text}`}>
              전화 문의
            </a>
          )}
          {site.kakao_url && (
            <a href={site.kakao_url} className="hp-cta bg-yellow-300 text-gray-950">
              카카오톡 문의
            </a>
          )}
          {site.blog_url && (
            <a href={site.blog_url} className="hp-cta border border-white/20">
              블로그 보기
            </a>
          )}
        </div>
      </div>
      </div>
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <dt className="font-bold text-gray-500">{label}</dt>
      <dd className="mt-1 font-bold text-gray-950">{value}</dd>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-white/70 p-3">
      <p className="text-lg font-black text-gray-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-gray-500">{label}</p>
    </div>
  )
}

function PortfolioSection({
  siteTitle,
  posts,
  compact = false,
  palette,
}: {
  siteTitle: string
  posts: HomepagePublicPackage['blogPosts']
  compact?: boolean
  palette: HomepagePalette
}) {
  if (!posts.length) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6">
        <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Live portfolio</p>
        <h1 className="mt-1 text-3xl font-black">{siteTitle}</h1>
        <p className="mt-2 text-sm text-gray-600">블로그에 작성한 현장 글이 홈페이지에 자동으로 표시됩니다.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {posts.slice(0, compact ? 3 : posts.length).map((post) => (
          <a
            key={post.id}
            href={post.url}
            data-cursor="active"
            className="homepage-reveal-target hp-surface hp-border group overflow-hidden rounded-2xl border shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {post.thumbnail_url ? (
              <img src={post.thumbnail_url} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
            ) : (
              <div className="aspect-[4/5] bg-gradient-to-br from-blue-50 to-gray-100" />
            )}
            <div className="p-4">
              <h3 className="line-clamp-2 font-bold">{post.title}</h3>
              {post.summary && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{post.summary}</p>}
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
