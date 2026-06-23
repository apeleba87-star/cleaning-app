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

const reviewCards = [
  {
    id: 'apel**',
    rating: 5,
    review: '창틀이랑 욕실 사진을 전후로 보내줘서 확인이 쉬웠어요.',
  },
  {
    id: 'mira**',
    rating: 5,
    review: '입주 전날 급하게 문의했는데 가능한 시간부터 바로 안내해줬습니다.',
  },
  {
    id: 'clean**',
    rating: 5,
    review: '견적이 애매하지 않고 평수와 옵션 기준으로 설명돼서 좋았습니다.',
  },
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
  const { site, calculator, blogPosts, mediaItems } = data
  const template = getHomepageTemplate(site.template_key)
  const palette = getHomepagePalette(site.template_key, site.color_palette)
  const currentPage = normalizeHomepagePageSlug(page, site.template_key)
  const isDirectSales = site.template_key === 'sales-reviews' || site.template_key === 'sales-services' || site.template_key === 'sales-fast-contact'
  const showCalculator = !isDirectSales && site.calculator_enabled && calculator && template.calculatorPosition !== 'none'
  const heroCalculator = showCalculator && template.calculatorPosition === 'hero'
  const secondaryCalculator = showCalculator && template.calculatorPosition === 'secondary'
  const isFastContact = site.template_key === 'sales-fast-contact' || site.template_key === 'showcase-local' || isDirectSales
  const isCampaign = site.template_key === 'interactive-campaign'
  const previewPrefix = site.slug?.startsWith('preview-') ? `/homepage-preview/${site.template_key}` : null
  const basePath = previewPrefix || (typeof site.slug === 'string' ? `/t/${site.slug}` : '')
  const pageHref = (slug: HomepagePageSlug) => (slug === 'home' ? basePath : `${basePath}/${slug}`)
  const menuItems = template.pages.map((slug) => ({ slug, href: pageHref(slug) }))
  const fixedHeaderOffset = previewPrefix ? 'top-[40px]' : 'top-0'
  const pageTopPadding = previewPrefix ? 'pt-[112px]' : 'pt-[72px]'
  const isPremiumShowcase = site.template_key === 'showcase-portfolio'
  const headerClassName = isPremiumShowcase
    ? `homepage-flat fixed inset-x-0 ${fixedHeaderOffset} z-[60] border-b border-white/10 bg-black/72 text-white backdrop-blur-xl`
    : `homepage-flat fixed inset-x-0 ${fixedHeaderOffset} z-[60] border-b border-black/10 bg-white/90 backdrop-blur-xl`
  const headerPhoneClassName = isPremiumShowcase
    ? 'hidden rounded-full bg-[#d5b56d] px-4 py-2 text-sm font-black text-[#15100a] sm:inline-flex'
    : 'hp-primary hidden rounded-full px-4 py-2 text-sm font-black sm:inline-flex'

  return (
    <main
      className={`homepage-site min-h-screen ${pageTopPadding} ${palette.text}`}
      style={palette.cssVars as CSSProperties}
    >
      <header className={headerClassName}>
        <div className="hp-container flex items-center justify-between gap-3 py-3.5">
          <a href={pageHref('home')} className="group flex min-w-0 items-center">
            <HeaderBrand site={site} />
          </a>
          <div className="flex shrink-0 items-center gap-2">
            {site.phone && (
              <a href={`tel:${site.phone}`} className={headerPhoneClassName}>
                전화
              </a>
            )}
            <HomepageMenu
              site={site}
              items={menuItems}
              currentPage={currentPage}
              palette={palette}
              showCalculator={!!showCalculator}
              inverseButton={isPremiumShowcase}
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
      {currentPage === 'portfolio' && (
        <PortfolioSection
          palette={palette}
          siteTitle={site.portfolio_title || '최근 현장 사례'}
          posts={blogPosts}
          mediaItems={mediaItems}
        />
      )}
      {currentPage === 'estimate' && showCalculator && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <EstimateCalculator site={site} calculator={calculator} />
        </section>
      )}
      {currentPage === 'estimate' && !showCalculator && <ContactPage data={data} palette={palette} />}
      {currentPage === 'reviews' && <ReviewsPage palette={palette} />}
      {currentPage === 'faq' && <FaqPage palette={palette} />}
      {currentPage === 'contact' && <ContactPage data={data} palette={palette} />}

      <HomepageFooter site={site} palette={palette} />

      {(isFastContact || showCalculator) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/92 p-3 shadow-lg backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl gap-2">
            {showCalculator && (
              <a href={pageHref('estimate')} className="hp-primary flex-1 rounded-full py-3 text-center font-black">
                견적 계산
              </a>
            )}
            {site.phone && (
              <a href={`tel:${site.phone}`} className="hp-dark flex-1 rounded-full py-3 text-center font-black">
                전화 문의
              </a>
            )}
            {site.kakao_url && (
              <a href={site.kakao_url} className="flex-1 rounded-full bg-yellow-300 py-3 text-center font-black text-gray-950">
                카톡 문의
              </a>
            )}
          </div>
        </div>
      )}
      <HomepageRevealScript />
    </main>
  )
}

function HeaderBrand({ site }: { site: HomepagePublicPackage['site'] }) {
  const siteWithLogo = site as HomepagePublicPackage['site'] & {
    logo_image_url?: string | null
    logo_url?: string | null
  }
  const logoUrl = siteWithLogo.logo_image_url || siteWithLogo.logo_url
  const brandName = site.business_name || site.name

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={brandName}
        className="block h-11 max-w-[9.5rem] object-contain"
      />
    )
  }

  return (
    <span className="block truncate text-xl font-black leading-none tracking-[-0.045em]">
      {brandName}
    </span>
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
      var targets = Array.from(new Set(Array.from(root.querySelectorAll(selector)))).filter(function (target) {
        return !target.closest('.homepage-hero-section');
      });
      targets.forEach(function (target, index) {
        target.classList.add('homepage-reveal');
        target.style.setProperty('--reveal-delay', String(Math.min(index % 3, 2) * 70) + 'ms');
      });
      function checkReveal() {
        var triggerLine = window.innerHeight * 0.92;
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
      }, { rootMargin: '0px 0px 18% 0px', threshold: 0.02 });
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
  const { site, blogPosts } = data
  const usePreviewImages = site.slug?.startsWith('preview-')

  if (site.template_key === 'showcase-portfolio') {
    return (
      <PremiumHomePage
        data={data}
        pageHref={pageHref}
        palette={palette}
      />
    )
  }

  if (site.template_key === 'showcase-local') {
    return (
      <LocalShowcaseHomePage
        data={data}
        pageHref={pageHref}
        palette={palette}
      />
    )
  }

  if (site.template_key === 'sales-reviews') {
    return (
      <SalesReviewsHomePage
        data={data}
        pageHref={pageHref}
        palette={palette}
      />
    )
  }

  if (site.template_key === 'sales-services') {
    return (
      <SalesPriceHomePage
        data={data}
        pageHref={pageHref}
        palette={palette}
      />
    )
  }

  if (site.template_key === 'sales-fast-contact') {
    return (
      <SalesUrgentHomePage
        data={data}
        pageHref={pageHref}
        palette={palette}
      />
    )
  }

  if (
    site.template_key === 'interactive-calculator' ||
    site.template_key === 'interactive-steps' ||
    site.template_key === 'interactive-campaign'
  ) {
    return (
      <InteractiveCalculatorHomePage
        data={data}
        pageHref={pageHref}
        palette={palette}
        heroCalculator={heroCalculator}
        secondaryCalculator={secondaryCalculator}
        isCampaign={isCampaign}
      />
    )
  }

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
      <ServicesPage compact showEstimateCta={secondaryCalculator} pageHref={pageHref} palette={palette} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} />
      <ProcessSection palette={palette} compact />
      <ReviewsPage compact palette={palette} />
      <HomepageFaqSection palette={palette} />
      <AreaSection site={site} palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={heroCalculator || secondaryCalculator} />
    </>
  )
}

function InteractiveCalculatorHomePage({
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
  const { site, blogPosts } = data

  if (site.template_key === 'interactive-steps') {
    return <InteractiveSurveyHomePage data={data} pageHref={pageHref} palette={palette} />
  }

  if (site.template_key === 'interactive-campaign') {
    return <InteractiveDiagnosisHomePage data={data} pageHref={pageHref} palette={palette} />
  }

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
      <ReviewsPage compact palette={palette} title="후기" />
      <AfterPhotoSliderSection palette={palette} mediaItems={data.mediaItems} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} />
      <HomepageFaqSection palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={false} />
    </>
  )
}

function InteractiveSurveyHomePage({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site, calculator, blogPosts } = data

  return (
    <>
      <section className="homepage-hero-section overflow-hidden bg-[#eef0ff]">
        <div className="hp-container py-10 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="relative rounded-[2rem] border border-[#cfd5ff] bg-white/72 p-6 shadow-[0_32px_90px_rgba(79,70,229,0.14)] backdrop-blur sm:p-8">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c7d2fe]/70 blur-2xl" />
              <p className="homepage-label relative inline-flex rounded-full bg-[#4f46e5] px-4 py-2 text-xs font-black uppercase text-white">
                Step survey
              </p>
              <h1 className="relative mt-6 text-5xl font-black leading-[0.95] tracking-[-0.065em] text-[#15113d] sm:text-7xl">
                질문에 답하면 견적이 완성됩니다
              </h1>
              <p className="relative mt-6 max-w-xl text-base font-medium leading-8 text-[#52506d]">
                한 번에 하나씩 고르는 설문형 화면입니다. 내부 계산과 상담 저장은 계산기 첫화면형과 같은 로직을 사용합니다.
              </p>
              <div className="relative mt-8 grid gap-3">
                {['STEP 1 평수 입력', 'STEP 2 서비스 선택', 'STEP 3 예상 결과 확인'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#d9ddff] bg-white p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef0ff] text-sm font-black text-[#4f46e5]">
                      {index + 1}
                    </span>
                    <p className="font-black text-[#15113d]">{item}</p>
                  </div>
                ))}
              </div>
              <a href={pageHref('estimate')} className="relative mt-6 inline-flex rounded-full bg-[#15113d] px-6 py-4 text-sm font-black text-white">
                설문 시작하기
              </a>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-10 hidden rounded-3xl bg-[#4f46e5] px-5 py-4 text-sm font-black text-white shadow-2xl lg:block">
                진행률 62%
              </div>
              <div className="absolute -right-4 bottom-10 hidden rounded-3xl border border-[#cfd5ff] bg-white px-5 py-4 text-sm font-black text-[#4f46e5] shadow-2xl lg:block">
                결과 즉시 표시
              </div>
              <div className="rounded-[2rem] border border-[#cfd5ff] bg-[#f8f8ff] p-3 shadow-[0_40px_100px_rgba(79,70,229,0.18)] sm:p-5">
                {calculator && <EstimateCalculator site={site} calculator={calculator} />}
              </div>
            </div>
          </div>
        </div>
      </section>
      <AfterPhotoSliderSection palette={palette} mediaItems={data.mediaItems} />
      <ReviewsPage compact palette={palette} title="후기" />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <HomepageFaqSection palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={false} />
    </>
  )
}

function InteractiveDiagnosisHomePage({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site, calculator, blogPosts } = data
  const diagnosisCards = [
    ['주방 기름때', '후드와 상판 중심'],
    ['창틀 먼지', '분진과 틈새 관리'],
    ['욕실 물때', '수전과 유리 디테일'],
    ['입주 전 점검', '전체 공간 추천'],
  ]

  return (
    <>
      <section className="homepage-hero-section overflow-hidden bg-[#fff4ed]">
        <div className="hp-container py-10 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="homepage-label inline-flex rounded-full border border-[#fb923c]/30 bg-white px-4 py-2 text-xs font-black uppercase text-[#c2410c]">
                Recommendation diagnosis
              </p>
              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.065em] text-[#2b160d] sm:text-7xl">
                우리집 상태에 맞는 청소를 추천합니다
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-[#73513e]">
                고객은 먼저 문제를 고르고, 같은 계산기 로직으로 예상 비용과 상담 접수를 진행합니다. 겉보기는 진단형 랜딩처럼 설계합니다.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {diagnosisCards.map(([title, text]) => (
                  <div key={title} className="rounded-[1.5rem] border border-[#fed7aa] bg-white p-5 shadow-[0_20px_60px_rgba(194,65,12,0.08)]">
                    <span className="mb-5 block h-2 w-12 rounded-full bg-[#fb923c]" />
                    <p className="text-lg font-black text-[#2b160d]">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#73513e]">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={pageHref('estimate')} className="rounded-full bg-[#ea580c] px-6 py-4 text-sm font-black text-white">
                  진단 시작하기
                </a>
                {site.phone && (
                  <a href={`tel:${site.phone}`} className="rounded-full border border-[#fed7aa] bg-white px-6 py-4 text-sm font-black text-[#2b160d]">
                    전화 상담
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-[2.4rem] border border-[#fed7aa] bg-white p-4 shadow-[0_40px_120px_rgba(194,65,12,0.16)]">
              <div className="mb-4 rounded-[1.6rem] bg-[#fff7ed] p-5">
                <p className="text-sm font-black text-[#c2410c]">추천 결과 미리보기</p>
                <p className="mt-2 text-3xl font-black text-[#2b160d]">입주청소 + 창틀 집중관리</p>
                <p className="mt-2 text-sm leading-6 text-[#73513e]">선택한 상태에 따라 상담 문구와 견적 조건을 함께 저장합니다.</p>
              </div>
              {calculator && <EstimateCalculator site={site} calculator={calculator} />}
            </div>
          </div>
        </div>
      </section>
      <ReviewsPage compact palette={palette} title="후기" />
      <AfterPhotoSliderSection palette={palette} mediaItems={data.mediaItems} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '추천 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={false} />
    </>
  )
}

function PremiumHomePage({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site, blogPosts } = data

  return (
    <>
      <PremiumHero data={data} pageHref={pageHref} />
      <PremiumBrandMessage />
      {blogPosts.length > 0 && (
        <PremiumPortfolioSection siteTitle={site.portfolio_title || 'Selected projects'} posts={blogPosts.slice(0, 3)} />
      )}
      <PremiumSectionBridge label="Services" text="필요한 범위만 선명하게 정리합니다" />
      <PremiumServiceSection />
      <PremiumSectionBridge label="Process" text="상담부터 검수까지 균형 있게 이어집니다" />
      <PremiumProcessSection />
      <ReviewsPage compact palette={palette} />
      <PremiumContactSection data={data} pageHref={pageHref} />
    </>
  )
}

function LocalShowcaseHomePage({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site, blogPosts } = data
  const usePreviewImages = site.slug?.startsWith('preview-')

  return (
    <>
      <LocalHero data={data} pageHref={pageHref} palette={palette} />
      <LocalAreaTrust site={site} palette={palette} />
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '우리 동네 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} />
      <ReviewsPage compact palette={palette} />
      <HomepageFaqSection palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={false} />
    </>
  )
}

function SalesReviewsHomePage({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site, blogPosts } = data
  const usePreviewImages = site.slug?.startsWith('preview-')

  return (
    <>
      <SalesReviewsHero data={data} pageHref={pageHref} palette={palette} />
      <AfterPhotoSliderSection palette={palette} mediaItems={data.mediaItems} />
      <ReviewsPage compact palette={palette} title="후기" />
      <SalesPricingSection palette={palette} />
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} />
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <HomepageFaqSection palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={false} />
    </>
  )
}

function SalesPriceHomePage({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site } = data
  const usePreviewImages = site.slug?.startsWith('preview-')

  return (
    <>
      <SalesPriceHero data={data} palette={palette} />
      <SalesLargePriceTable palette={palette} />
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} />
      <ReviewsPage compact palette={palette} title="후기" />
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} />
      <HomepageFaqSection palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={false} />
    </>
  )
}

function SalesUrgentHomePage({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site, blogPosts } = data
  const usePreviewImages = site.slug?.startsWith('preview-')

  return (
    <>
      <SalesUrgentHero data={data} palette={palette} />
      <ReservationStatusSection palette={palette} />
      <ReviewsPage compact palette={palette} title="후기" />
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <HomepageFaqSection palette={palette} />
      <FinalCta data={data} palette={palette} pageHref={pageHref} showCalculator={false} />
    </>
  )
}

function SalesReviewsHero({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site } = data

  return (
    <section className="homepage-hero-section hp-section hp-surface border-b border-black/10">
      <div className="hp-container grid gap-8 lg:grid-cols-[1fr_0.78fr] lg:items-center">
        <div>
          <p className={`homepage-label mb-4 inline-flex rounded-full ${palette.accent} px-4 py-2 text-xs font-black uppercase ${palette.accentText}`}>
            후기 전환형
          </p>
          <h1 className="hp-display font-black">입주청소 평당 15,000원~</h1>
          <p className="hp-copy mt-6 max-w-2xl">{site.subheadline}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {site.phone && <a href={`tel:${site.phone}`} className="hp-cta hp-primary min-h-16 text-lg">전화하기</a>}
            {site.kakao_url && <a href={site.kakao_url} className="hp-cta min-h-16 bg-yellow-300 text-lg text-gray-950">카톡상담</a>}
          </div>
        </div>
        <div className="grid gap-3">
          {[
            ['상담', '1분'],
            ['견적', '3분'],
            ['기준', '평당 15,000원~'],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[0.35fr_1fr] items-center bg-white p-5 shadow-sm">
              <p className={`text-sm font-black ${palette.accentText}`}>{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SalesPriceHero({
  data,
  palette,
}: {
  data: HomepagePublicPackage
  palette: HomepagePalette
}) {
  const { site } = data
  const priceRows = [
    ['원룸', '15만원~'],
    ['20평', '30만원~'],
    ['30평', '42만원~'],
  ]

  return (
    <section className="homepage-hero-section hp-section border-b border-[#c7d9ee] bg-[radial-gradient(circle_at_12%_8%,rgba(191,219,254,0.55),transparent_30%),linear-gradient(135deg,#f8fbff,#eef6ff)]">
      <div className="hp-container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="homepage-label mb-4 inline-flex rounded-full border border-[#c7d9ee] bg-white/72 px-4 py-2 text-xs font-black uppercase text-[#1e3a5f] shadow-sm backdrop-blur">
            가격전환형
          </p>
          <h1 className="hp-display font-black text-[#0b1f33]">가격이 먼저 보이는 청소</h1>
          <p className="hp-copy mt-6 max-w-2xl text-[#506578]">{site.subheadline}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {site.phone && <a href={`tel:${site.phone}`} className="hp-cta min-h-16 bg-[#1e3a5f] text-lg text-white shadow-sm">전화하기</a>}
            {site.kakao_url && <a href={site.kakao_url} className="hp-cta min-h-16 border border-[#c7d9ee] bg-white/80 text-lg text-[#0b1f33] shadow-sm backdrop-blur">카톡상담</a>}
          </div>
        </div>
        <div className="border border-[#c7d9ee] bg-white/82 p-4 shadow-[0_30px_90px_rgba(30,58,95,0.12)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between border-b border-[#dbe8f7] pb-3">
            <p className="homepage-label text-xs font-black uppercase text-[#1e3a5f]">Open price</p>
            <p className="text-xs font-bold text-[#506578]">VAT 별도 · 현장별 변동</p>
          </div>
          {priceRows.map(([label, price]) => (
            <div key={label} className="grid grid-cols-[0.45fr_1fr] items-end border-b border-[#e4edf8] p-5 last:border-b-0">
              <p className="text-lg font-black text-[#1e3a5f]">{label}</p>
              <p className="text-right text-4xl font-black leading-none text-[#0b1f33] sm:text-5xl">{price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SalesLargePriceTable({ palette }: { palette: HomepagePalette }) {
  const priceRows = [
    ['원룸', '15만원~', '소형 주거공간 기준'],
    ['20평', '30만원~', '가장 많이 문의하는 기준'],
    ['30평', '42만원~', '방/욕실 구조에 따라 변동'],
  ]

  return (
    <section className="hp-section bg-[linear-gradient(180deg,#ffffff,#f4f9ff)]">
      <div className="hp-container">
        <div className="mb-6">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Price table</p>
          <h2 className="hp-title mt-3 font-black">가격표를 숨기지 않습니다</h2>
        </div>
        <div className="grid gap-4">
          {priceRows.map(([label, price, text]) => (
            <div key={label} className="grid gap-5 border border-[#d6e6f7] bg-white p-6 shadow-[0_24px_70px_rgba(30,58,95,0.08)] sm:grid-cols-[0.3fr_0.5fr_1fr] sm:items-center">
              <p className="text-2xl font-black text-[#1e3a5f]">{label}</p>
              <p className="text-5xl font-black leading-none text-[#0b1f33] sm:text-6xl">{price}</p>
              <div>
                <p className="text-sm leading-7 text-gray-600">{text}</p>
                <p className="mt-2 text-xs font-bold text-[#506578]">정확한 비용은 평수, 구조, 오염도 확인 후 안내합니다.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SalesUrgentHero({
  data,
  palette,
}: {
  data: HomepagePublicPackage
  palette: HomepagePalette
}) {
  const { site } = data
  const managedImages = data.mediaItems
    .filter((item) => item.item_type === 'after_photo' || item.item_type === 'portfolio' || item.item_type === 'gallery')
    .map((item) => item.image_url)
  const urgentImages = [site.hero_image_url, ...managedImages, ...HOMEPAGE_PREVIEW_IMAGES.slice(8, 13)].filter(Boolean).slice(0, 5) as string[]

  return (
    <section className="homepage-hero-section overflow-hidden bg-[#07111f] text-white">
      <div className="hp-container grid gap-10 py-12 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="homepage-label mb-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase text-white/70">
            긴급상담형
          </p>
          <h1 className="max-w-lg text-6xl font-black leading-[0.92] tracking-[-0.07em] sm:text-7xl">당일 상담 가능</h1>
          <p className="mt-6 max-w-lg text-lg font-medium leading-9 text-white/68">
            급한 일정은 빠른 확인이 중요합니다. 사진과 평수만 보내주시면 가능한 시간부터 안내합니다.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {site.phone && <a href={`tel:${site.phone}`} className="hp-cta min-h-16 rounded-full bg-white text-lg text-gray-950">전화하기</a>}
            {site.kakao_url && <a href={site.kakao_url} className="hp-cta min-h-16 rounded-full bg-yellow-300 text-lg text-gray-950">카톡상담</a>}
          </div>
          <div className="mt-8 grid gap-2 sm:grid-cols-3">
            {[
              ['오늘', '가능'],
              ['내일', '가능'],
              ['주말', '확인'],
            ].map(([day, status]) => (
              <div key={day} className="rounded-2xl border border-white/10 bg-white/7 px-4 py-4 backdrop-blur">
                <p className="text-xs font-bold text-white/45">{day}</p>
                <p className="mt-1 text-lg font-black text-white">{status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 p-3 shadow-[0_34px_100px_rgba(0,0,0,0.32)]">
          <div className="relative h-[360px] overflow-hidden rounded-[1.5rem] bg-slate-900 sm:h-[500px]">
            {urgentImages.map((src, index) => (
              <img
                key={`${src}-${index}`}
                src={src}
                alt=""
                className="homepage-urgent-fade-image absolute inset-0 h-full w-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
                style={{
                  animationDelay: `${index * 5}s`,
                  animationDuration: `${Math.max(urgentImages.length, 1) * 5}s`,
                }}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07111f]/24 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  )
}

function ReservationStatusSection({ palette }: { palette: HomepagePalette }) {
  const rows = [
    ['오늘', '가능', '빠른 상담 우선 안내'],
    ['내일', '가능', '오전/오후 일정 확인'],
    ['주말', '가능', '예약 상황에 따라 조율'],
  ]

  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
        <div className="mb-6">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Reservation</p>
          <h2 className="hp-title mt-3 font-black">현재 예약현황</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {rows.map(([day, status, text]) => (
            <article key={day} className="border border-black/10 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-black">{day}</p>
                <span className={`rounded-full ${palette.accent} px-3 py-1 text-sm font-black ${palette.accentText}`}>{status}</span>
              </div>
              <p className="mt-8 text-sm leading-7 text-gray-600">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function AfterPhotoSliderSection({
  palette,
  mediaItems = [],
}: {
  palette: HomepagePalette
  mediaItems?: HomepagePublicPackage['mediaItems']
}) {
  const managedPhotos = mediaItems.filter((item) => item.item_type === 'after_photo' || item.item_type === 'gallery')
  const afterPhotos = managedPhotos.length
    ? managedPhotos.slice(0, 8).map((item) => ({ src: item.image_url, title: item.title || '청소 완료 사진', alt: item.alt_text || item.title || '' }))
    : HOMEPAGE_PREVIEW_IMAGES.slice(4, 9).map((src) => ({ src, title: '청소 완료 사진', alt: '' }))

  return (
    <section className="bg-white">
      <div className="hp-container py-5">
        <div className={`overflow-hidden border-y ${palette.border} py-5`}>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className={`homepage-label text-xs font-black uppercase ${palette.accentText}`}>After clean</p>
              <h2 className="mt-2 text-2xl font-black">청소 후 사진으로 먼저 확인하세요</h2>
            </div>
            <p className="hidden text-sm font-bold text-gray-500 sm:block">완료 사진 5장</p>
          </div>
          <div className="homepage-auto-photo-track flex w-max gap-3">
            {[...afterPhotos, ...afterPhotos].map((photo, index) => (
              <div key={`${photo.src}-${index}`} className="relative h-60 w-80 shrink-0 overflow-hidden bg-gray-100 sm:h-72 sm:w-[26rem]">
                <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                  <p className="homepage-label text-xs font-black uppercase">After</p>
                  <p className="mt-1 text-lg font-black">{photo.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function SalesPricingSection({ palette }: { palette: HomepagePalette }) {
  const prices = [
    ['원룸', '평당 15,000원~'],
    ['20평대', '평당 15,000원~'],
    ['30평대', '평당 14,000원~'],
  ]

  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
        <div className="mb-6">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Expected cost</p>
          <h2 className="hp-title mt-3 font-black">예상비용을 먼저 확인하세요</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {prices.map(([label, price]) => (
            <article key={label} className="border border-black/10 bg-white p-6">
              <p className={`text-sm font-black ${palette.accentText}`}>{label}</p>
              <p className="mt-4 text-3xl font-black">{price}</p>
              <p className="mt-3 text-sm leading-6 text-gray-600">현장 구조와 오염도에 따라 최종 견적은 달라질 수 있습니다.</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PremiumHero({
  data,
  pageHref,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
}) {
  const { site } = data
  const backgroundImage = site.hero_image_url || HOMEPAGE_PREVIEW_IMAGES[6]

  return (
    <section
      className="homepage-hero-section relative min-h-[78vh] overflow-hidden bg-[#0f0b08] text-[#f7f0df]"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 20%, rgba(213,181,109,0.20), transparent 30%), linear-gradient(180deg, rgba(13,9,5,0.34), rgba(13,9,5,0.88)), url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-x-8 top-8 hidden h-px bg-gradient-to-r from-transparent via-[#d5b56d]/60 to-transparent sm:block" />
      <div className="absolute inset-y-12 left-8 hidden w-px bg-gradient-to-b from-transparent via-[#d5b56d]/35 to-transparent sm:block" />
      <div className="absolute inset-y-12 right-8 hidden w-px bg-gradient-to-b from-transparent via-[#d5b56d]/35 to-transparent sm:block" />
      <div className="hp-container relative flex min-h-[78vh] flex-col items-center justify-center py-24 text-center">
        <p className="homepage-label inline-flex border border-[#d5b56d]/35 bg-black/25 px-4 py-2 text-xs font-black uppercase text-[#d5b56d] backdrop-blur">
          Premium showcase
        </p>
        <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none tracking-[-0.06em] sm:text-7xl lg:text-8xl">
          {site.headline}
        </h1>
        <p className="mt-6 max-w-xl text-base font-medium leading-8 text-[#e8dcc4]/78 sm:text-lg">{site.subheadline}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a href={pageHref('portfolio')} className="hp-cta bg-[#d5b56d] text-[#15100a]">사례 보기</a>
          <a href={pageHref('contact')} className="hp-cta border border-[#d5b56d]/35 bg-black/20 text-[#f7f0df] backdrop-blur">상담 문의</a>
        </div>
        <div className="mt-12 grid w-full max-w-3xl grid-cols-3 border-y border-[#d5b56d]/20 text-left">
          {['Design', 'Material', 'Finish'].map((item) => (
            <div key={item} className="border-r border-[#d5b56d]/15 p-4 last:border-r-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d5b56d]">{item}</p>
              <p className="mt-2 text-sm text-[#e8dcc4]/62">curated</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PremiumBrandMessage() {
  return (
    <section className="bg-[linear-gradient(180deg,#0f0b08,#17120d)] text-[#f7f0df]">
      <div className="hp-container py-16 sm:py-24">
        <p className="homepage-label text-xs font-black uppercase text-[#d5b56d]">Brand message</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <h2 className="text-4xl font-black leading-tight tracking-[-0.055em] sm:text-6xl">
            오래 머무는 공간에는 이유가 있습니다
          </h2>
          <p className="text-base leading-8 text-[#e8dcc4]/62">
            소재, 조명, 동선, 마감의 밀도를 높여 공간의 가치를 완성합니다.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {['공간 기획', '디테일 시공', '마감 검수'].map((item) => (
            <div key={item} className="border border-[#d5b56d]/18 bg-[#21190f]/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
              <span className="mb-10 block h-px w-12 bg-[#d5b56d]" />
              <p className="font-black text-[#f7f0df]">{item}</p>
              <p className="mt-2 text-sm leading-6 text-[#e8dcc4]/55">필요한 요소만 남겨 고급스럽게 보여줍니다.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PremiumPortfolioSection({
  siteTitle,
  posts,
}: {
  siteTitle: string
  posts: HomepagePublicPackage['blogPosts']
}) {
  return (
    <section className="bg-[#17120d] text-[#f7f0df]">
      <div className="hp-container py-16 sm:py-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="homepage-label text-xs font-black uppercase text-[#d5b56d]">Selected projects</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">{siteTitle}</h2>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          {posts.map((post, index) => (
            <a
              key={post.id}
              href={post.url}
              className={`group relative min-h-[360px] overflow-hidden border border-[#d5b56d]/14 bg-[#21190f] shadow-[0_28px_90px_rgba(0,0,0,0.28)] ${index === 0 ? 'lg:row-span-2 lg:min-h-[620px]' : ''}`}
            >
              {post.thumbnail_url ? (
                <img src={post.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-88 transition duration-700 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0b08]/88 via-[#0f0b08]/18 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="homepage-label text-xs font-black uppercase text-[#d5b56d]">Project 0{index + 1}</p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-[#f7f0df] sm:text-3xl">{post.title}</h3>
                {post.summary && <p className="mt-3 max-w-xl text-sm leading-6 text-[#e8dcc4]/65">{post.summary}</p>}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function PremiumSectionBridge({
  label,
  text,
}: {
  label: string
  text: string
}) {
  return (
    <section className="bg-[#120d09] text-[#f7f0df]">
      <div className="hp-container">
        <div className="relative border-y border-[#d5b56d]/18 py-8">
          <div className="absolute left-0 top-0 h-px w-28 bg-gradient-to-r from-[#d5b56d] to-transparent" />
          <div className="absolute bottom-0 right-0 h-px w-28 bg-gradient-to-l from-[#d5b56d] to-transparent" />
          <div className="flex items-center justify-between gap-6">
            <p className="homepage-label text-xs font-black uppercase text-[#d5b56d]">{label}</p>
            <p className="max-w-64 text-right text-sm leading-6 text-[#e8dcc4]/58">{text}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PremiumServiceSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(213,181,109,0.12),transparent_28%),linear-gradient(180deg,#17120d,#0f0b08)] text-[#f7f0df]">
      <div className="absolute right-[-8rem] top-10 h-72 w-72 rounded-full border border-[#d5b56d]/10" />
      <div className="hp-container py-16 sm:py-24">
        <p className="homepage-label text-xs font-black uppercase text-[#d5b56d]">Detail service</p>
        <div className="mt-8 grid gap-3">
          {['인테리어', '리모델링', '상업공간 디자인'].map((item, index) => (
            <div key={item} className="grid gap-4 border border-[#d5b56d]/14 bg-[#21190f]/54 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.22)] sm:grid-cols-[0.2fr_0.8fr_1fr]">
              <p className="text-sm font-black text-[#d5b56d]">0{index + 1}</p>
              <p className="text-2xl font-black">{item}</p>
              <p className="text-sm leading-7 text-[#e8dcc4]/55">공간의 목적에 맞춰 계획부터 마감까지 필요한 범위를 정교하게 설계합니다.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PremiumProcessSection() {
  const steps = [
    ['01', '상담', '공간의 목적과 예산, 원하는 분위기를 먼저 정리합니다.'],
    ['02', '기획', '동선, 소재, 조명, 마감 기준을 하나의 방향으로 설계합니다.'],
    ['03', '시공', '현장 일정과 품질 기준에 맞춰 디테일을 관리합니다.'],
    ['04', '검수', '완성 전 마지막 마감과 사용 동선을 확인합니다.'],
  ]

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0f0b08,#17120d)] text-[#f7f0df]">
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#d5b56d]/24 to-transparent" />
      <div className="hp-container py-16 sm:py-24">
        <p className="homepage-label text-xs font-black uppercase text-[#d5b56d]">Process</p>
        <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">과정은 단순하게, 결과는 섬세하게</h2>
        <div className="mt-10 grid gap-3">
          {steps.map(([number, title, text]) => (
            <div key={number} className="grid gap-4 border border-[#d5b56d]/14 bg-black/18 p-6 sm:grid-cols-[0.18fr_0.32fr_1fr]">
              <p className="text-xl font-black text-[#d5b56d]">{number}</p>
              <p className="font-black text-[#f7f0df]">{title}</p>
              <p className="text-sm leading-7 text-[#e8dcc4]/55">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PremiumContactSection({
  data,
  pageHref,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
}) {
  const { site } = data

  return (
    <section className="bg-[radial-gradient(circle_at_50%_0%,rgba(213,181,109,0.16),transparent_34%),#0a0705] text-[#f7f0df]">
      <div className="hp-container py-16 sm:py-24">
        <div className="grid gap-8 border-t border-[#d5b56d]/24 pt-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="homepage-label text-xs font-black uppercase text-[#d5b56d]">Contact</p>
            <h2 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">프로젝트 상담을 시작하세요</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {site.phone && <a href={`tel:${site.phone}`} className="hp-cta bg-[#f7f0df] text-[#15100a]">전화 문의</a>}
            {site.kakao_url && <a href={site.kakao_url} className="hp-cta border border-[#d5b56d]/30 text-[#f7f0df]">카카오톡 문의</a>}
            <a href={pageHref('contact')} className="hp-cta bg-[#d5b56d] text-[#15100a]">상담 문의</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function LocalHero({
  data,
  pageHref,
  palette,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
}) {
  const { site } = data
  const area = (site.service_area || site.address || '우리 동네').split(/[\/,·]/)[0]?.trim() || '우리 동네'
  const heroImages = [site.hero_image_url, ...HOMEPAGE_PREVIEW_IMAGES.slice(7, 11)].filter(Boolean) as string[]

  return (
    <section className="homepage-hero-section hp-section border-b border-[#cce7e3] bg-[radial-gradient(circle_at_12%_8%,rgba(125,211,252,0.34),transparent_34%),linear-gradient(135deg,#effaf8,#f7fbff)]">
      <div className="hp-container grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <p className="homepage-label mb-4 inline-flex rounded-full border border-[#b8ded8] bg-white/70 px-4 py-2 text-xs font-black uppercase text-[#0f766e] shadow-sm backdrop-blur">
            {area} 빠른 상담
          </p>
          <h1 className="hp-display font-black">{site.headline}</h1>
          <p className="hp-copy mt-6 max-w-2xl">{site.subheadline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {site.phone && <a href={`tel:${site.phone}`} className="hp-cta bg-[#0f766e] px-6 text-white shadow-sm">전화 상담</a>}
            {site.kakao_url && <a href={site.kakao_url} className="hp-cta border border-[#b8ded8] bg-white/80 px-6 text-[#123a36] shadow-sm backdrop-blur">카톡 상담</a>}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['당일 상담', '지역 우선', '빠른 안내'].map((item) => (
              <div key={item} className="rounded-2xl border border-[#cce7e3] bg-white/72 px-4 py-4 text-sm font-black text-[#123a36] shadow-sm backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2.2rem] border border-[#cce7e3] bg-white p-3 shadow-[0_28px_90px_rgba(15,118,110,0.16)]">
          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-[#99f6e4]/50 blur-3xl" />
          <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-[#bae6fd]/60 blur-3xl" />
          <div className="relative overflow-hidden rounded-[1.6rem]">
            <div className="homepage-auto-photo-track flex w-max gap-3">
              {[...heroImages, ...heroImages].map((src, index) => (
                <div key={`${src}-${index}`} className="h-[360px] w-[30rem] shrink-0 overflow-hidden bg-[#ecfeff]">
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
          <div className="relative mt-3 grid grid-cols-3 gap-2">
            {['강서구', '양천구', '마포구'].map((item) => (
              <div key={item} className="rounded-2xl bg-[#f0fdfa] px-3 py-3 text-center text-xs font-black text-[#0f766e]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function LocalAreaTrust({
  site,
  palette,
}: {
  site: HomepagePublicPackage['site']
  palette: HomepagePalette
}) {
  const areas = (site.service_area || '강서구 / 양천구 / 마포구 / 은평구')
    .split(/[\/,·]/)
    .map((area) => area.trim())
    .filter(Boolean)

  return (
    <section className="hp-section bg-white">
      <div className="hp-container">
        <div className="mb-6">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Local area</p>
          <h2 className="hp-title mt-3 font-black">가까운 지역부터 빠르게 안내합니다</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => (
            <div key={area} className="border border-[#cce7e3] bg-[linear-gradient(135deg,#f0fdfa,#eff6ff)] p-5 text-xl font-black text-[#123a36] shadow-sm">
              {area}
            </div>
          ))}
        </div>
      </div>
    </section>
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
      <section className="homepage-hero-section hp-section">
        <div className="hp-container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className={`homepage-label mb-5 inline-flex rounded-full ${palette.accent} px-4 py-2 text-xs font-black uppercase ${palette.accentText}`}>
              {template.name}
            </p>
            <h1 className="hp-display font-black">{site.headline}</h1>
            <p className="hp-copy mt-6 max-w-2xl">{site.subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={pageHref('estimate')} className="hp-cta hp-primary">견적 계산 시작</a>
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
      <section className="homepage-hero-section hp-dark">
        <div className="hp-container grid gap-10 py-10 sm:py-20 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <p className="homepage-label mb-5 text-xs font-black uppercase opacity-70">{template.name}</p>
            <h1 className="hp-display font-black">{site.headline}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 opacity-75">{site.subheadline}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <LocalBadge label="상담" value="전화/카톡" palette={palette} variant="dark" />
              <LocalBadge label="확인" value="전후 사진" palette={palette} variant="dark" />
              <LocalBadge label="견적" value="기준 공개" palette={palette} variant="dark" />
            </div>
          </div>
          <ContactTicket site={site} palette={palette} large />
        </div>
      </section>
    )
  }

  return (
    <section className="homepage-hero-section hp-section hp-surface border-b border-black/5">
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
        <a href={ctaHref} className="hp-cta hp-primary">
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
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.62), rgba(0,0,0,0.48) 42%, rgba(0,0,0,0.84)), url(${HOMEPAGE_PREVIEW_IMAGES[index]})`,
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
            <p className="text-2xl font-extrabold leading-tight tracking-[-0.015em] drop-shadow sm:text-3xl">{title}</p>
            <p className="mt-2 max-w-56 text-sm font-semibold leading-6 tracking-[-0.005em] opacity-90 drop-shadow">{text}</p>
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
  mediaItems = [],
}: {
  palette: HomepagePalette
  usePreviewImages?: boolean
  mediaItems?: HomepagePublicPackage['mediaItems']
}) {
  const managedScenes = mediaItems.filter((item) => item.item_type === 'before_after' || item.item_type === 'gallery')
  const rows = managedScenes.length
    ? managedScenes.slice(0, 4).map((item, index) => [
        index % 2 === 0 ? 'Before' : 'After',
        item.title || '현장 사진',
        item.description || '관리자가 등록한 현장 사진입니다.',
        item.image_url,
        item.alt_text || item.title || '',
      ])
    : cleaningScenes.map(([tag, title, text], index) => [
        tag,
        title,
        text,
        usePreviewImages ? HOMEPAGE_PREVIEW_IMAGES[index + 4] || HOMEPAGE_PREVIEW_IMAGES[index] : '',
        '',
      ])

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
          {rows.map(([tag, title, text, imageUrl, altText], index) => (
            <div key={`${tag}-${title}`} className="homepage-reveal-target overflow-hidden border border-black/10 bg-white">
              <div className={`relative h-64 overflow-hidden sm:h-80 lg:h-96 ${index % 2 === 0 ? 'bg-white/70' : palette.accent}`}>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={altText}
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
                <p className="text-xl font-extrabold tracking-[-0.015em]">{title}</p>
                <p className="mt-2 text-sm font-medium leading-6 tracking-[-0.005em] text-gray-600">{text}</p>
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
            {showCalculator && <a href={pageHref('estimate')} className="hp-cta hp-primary">예상 견적 확인</a>}
            {site.phone && <a href={`tel:${site.phone}`} className="hp-cta hp-dark">전화 문의</a>}
            {site.kakao_url && <a href={site.kakao_url} className="hp-cta bg-yellow-300 text-gray-950">카카오톡 문의</a>}
          </div>
        </div>
      </div>
    </section>
  )
}

function HomepageFooter({
  site,
  palette,
}: {
  site: HomepagePublicPackage['site']
  palette: HomepagePalette
}) {
  const companyName = site.footer_company_name || site.business_name || site.name
  const footerPhone = site.footer_phone || site.phone
  const footerAddress = site.footer_address || site.address
  const footerHours = site.footer_business_hours || site.business_hours

  return (
    <footer className={`border-t ${palette.border} bg-white pb-24 pt-10 text-gray-700`}>
      <div className="hp-container">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xl font-black text-gray-950">{companyName}</p>
            {site.footer_note && <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">{site.footer_note}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {site.footer_privacy_url && (
                <a href={site.footer_privacy_url} className="rounded-full border px-3 py-1 text-xs font-bold">
                  개인정보처리방침
                </a>
              )}
              {site.footer_terms_url && (
                <a href={site.footer_terms_url} className="rounded-full border px-3 py-1 text-xs font-bold">
                  이용약관
                </a>
              )}
            </div>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {site.footer_representative && <FooterInfo label="대표" value={site.footer_representative} />}
            {site.footer_business_number && <FooterInfo label="사업자등록번호" value={site.footer_business_number} />}
            {footerPhone && <FooterInfo label="전화" value={footerPhone} />}
            {site.footer_email && <FooterInfo label="이메일" value={site.footer_email} />}
            {footerHours && <FooterInfo label="영업시간" value={footerHours} />}
            {footerAddress && <FooterInfo label="주소" value={footerAddress} />}
          </div>
        </div>
        <p className="mt-8 border-t border-gray-200 pt-5 text-xs text-gray-500">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

function FooterInfo({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-bold text-gray-950">{label}</span>
      <span className="mx-2 text-gray-300">/</span>
      <span>{value}</span>
    </p>
  )
}

function LocalBadge({
  label,
  value,
  palette,
  variant = 'light',
}: {
  label: string
  value: string
  palette: HomepagePalette
  variant?: 'light' | 'dark'
}) {
  if (variant === 'dark') {
    return (
      <div className="border border-white/15 bg-white/8 p-4 text-white">
        <p className="text-xs font-bold text-white/60">{label}</p>
        <p className="mt-1 font-black text-white">{value}</p>
      </div>
    )
  }

  return (
    <div className={`${palette.surface} border ${palette.border} p-4 ${palette.text}`}>
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
        {site.phone && <a href={`tel:${site.phone}`} className="hp-cta bg-white text-gray-950">전화 바로 연결</a>}
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

function ReviewsPage({
  compact = false,
  palette,
  title = '믿고 맡길 수 있는 청소',
}: {
  compact?: boolean
  palette: HomepagePalette
  title?: string
}) {
  const visibleReviews = reviewCards.slice(0, compact ? 3 : reviewCards.length)

  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Reviews</p>
            <h1 className="hp-title mt-3 font-black">{title}</h1>
          </div>
          <p className={`hidden text-sm font-black ${palette.accentText} sm:block`}>후기 {visibleReviews.length}개</p>
        </div>
        <div className={`-mx-2 mt-6 flex snap-x gap-3 overflow-x-auto border-y ${palette.border} px-2 py-5`}>
          {visibleReviews.map((review) => (
            <article
              key={review.id}
              className="flex min-h-52 w-[86%] shrink-0 snap-start flex-col justify-between bg-white p-5 text-gray-950 sm:w-[46%] lg:w-[31.5%]"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${palette.primary}`} />
                  <p className="text-lg font-black">{review.id} 님</p>
                </div>
                <p className="mt-4 tracking-[0.14em] text-yellow-400 drop-shadow-sm" aria-label={`${review.rating}점`}>
                  {'★'.repeat(review.rating)}
                </p>
                <p className="mt-5 text-base font-bold leading-8">“{review.review}”</p>
              </div>
              <p className={`mt-6 border-t border-black/10 pt-4 text-xs font-black ${palette.accentText}`}>후기</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function HomepageFaqSection({ palette }: { palette: HomepagePalette }) {
  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
        <div className="mb-6">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>FAQ</p>
          <h2 className="hp-title mt-3 font-black">자주 묻는 질문</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {faqRows.map(([question, answer]) => (
            <article key={question} className="border border-black/10 bg-white p-5">
              <h3 className="font-black">{question}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function AreaSection({
  site,
  palette,
}: {
  site: HomepagePublicPackage['site']
  palette: HomepagePalette
}) {
  const areas = (site.service_area || site.address || '상담 가능 지역')
    .split(/[\/,·]/)
    .map((area) => area.trim())
    .filter(Boolean)

  return (
    <section className="hp-section">
      <div className="hp-container">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Service area</p>
            <h2 className="hp-title mt-3 font-black">서비스 가능 지역 안내</h2>
            <p className="hp-copy mt-5">
              {site.service_area || site.address || '방문 가능 지역은 상담 시 현장 일정에 맞춰 안내드립니다.'}
            </p>
          </div>
          <div className={`grid gap-3 border-y ${palette.border} py-5 sm:grid-cols-2`}>
            {areas.map((area) => (
              <div key={area} className="flex items-center gap-3 bg-white p-4 font-black">
                <span className={`h-2 w-2 rounded-full ${palette.primary}`} />
                {area}
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
            <a href={`tel:${site.phone}`} className="hp-cta bg-white text-gray-950">
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
  mediaItems = [],
}: {
  siteTitle: string
  posts: HomepagePublicPackage['blogPosts']
  compact?: boolean
  palette: HomepagePalette
  mediaItems?: HomepagePublicPackage['mediaItems']
}) {
  const managedItems = mediaItems.filter((item) => item.item_type === 'portfolio' || item.item_type === 'gallery')
  if (!posts.length && !managedItems.length) return null
  const visibleManagedItems = managedItems.slice(0, compact ? 3 : managedItems.length)
  const visiblePosts = posts.slice(0, compact ? Math.max(0, 3 - visibleManagedItems.length) : posts.length)

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6">
        <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Live portfolio</p>
        <h1 className="mt-1 text-3xl font-black">{siteTitle}</h1>
        <p className="mt-2 text-sm text-gray-600">관리자가 등록한 사례와 블로그 현장 글을 함께 표시합니다.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {visibleManagedItems.map((item) => (
          <article
            key={item.id}
            data-cursor="active"
            className="homepage-reveal-target hp-surface hp-border group overflow-hidden rounded-2xl border shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <img src={item.image_url} alt={item.alt_text || item.title || ''} className="aspect-[4/5] w-full object-cover" loading="lazy" />
            <div className="p-4">
              <h3 className="line-clamp-2 font-bold">{item.title || '현장 사례'}</h3>
              {item.description && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{item.description}</p>}
            </div>
          </article>
        ))}
        {visiblePosts.map((post) => (
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
