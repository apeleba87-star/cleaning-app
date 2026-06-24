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

const generalServiceCards = [
  ['줄눈/타일 시공', '욕실, 주방, 베란다처럼 사용 빈도가 높은 공간의 마감 상태를 정리합니다.'],
  ['목공/맞춤 제작', '선반, 수납장, 몰딩, 문틀처럼 공간에 맞는 제작과 설치를 상담합니다.'],
  ['인테리어/부분 공사', '상가, 주거공간, 부분 보수처럼 현장 범위에 맞춰 시공을 안내합니다.'],
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

const generalReviewCards = [
  {
    id: 'site**',
    rating: 5,
    review: '작업 전후 사진을 보고 상담할 수 있어서 믿음이 갔습니다.',
  },
  {
    id: 'home**',
    rating: 5,
    review: '현장 상황과 시공 범위를 이해하기 쉽게 안내해줬습니다.',
  },
  {
    id: 'work**',
    rating: 5,
    review: '일정과 비용 기준을 미리 설명해줘서 결정이 쉬웠습니다.',
  },
]

const faqRows = [
  ['견적 금액은 확정 금액인가요?', '홈페이지 계산 금액은 예상 견적이며 현장 구조와 오염도에 따라 달라질 수 있습니다.'],
  ['당일 예약도 가능한가요?', '일정이 비어 있으면 가능합니다. 전화나 카카오톡으로 빠르게 확인해주세요.'],
  ['청소 전후 사진을 받을 수 있나요?', '요청 시 작업 전후 사진을 공유해드립니다.'],
]

const generalFaqRows = [
  ['상담 후 비용이 바뀔 수 있나요?', '현장 상태, 자재, 시공 범위에 따라 최종 비용은 달라질 수 있습니다.'],
  ['방문 상담도 가능한가요?', '일정이 맞으면 방문 상담 또는 사진 상담으로 먼저 안내드립니다.'],
  ['시공 전후 사진을 볼 수 있나요?', '요청 시 작업 사례와 전후 사진을 확인하실 수 있습니다.'],
]

const cleaningScenes = [
  ['Before', '창틀 분진', '입주 전 가장 많이 남는 공사 먼지'],
  ['After', '욕실 물때', '수전, 유리, 배수구 주변 디테일'],
  ['Check', '주방 기름때', '후드와 상판 오염 확인'],
  ['Finish', '바닥 마감', '청소 후 동선별 최종 점검'],
]

const generalScenes = [
  ['Before', '시공 전 현장', '현장 상태와 필요한 범위를 먼저 확인합니다.'],
  ['Work', '시공 디테일', '자재, 마감, 치수에 맞춰 작업합니다.'],
  ['After', '완료 후 모습', '작업 후 결과물을 사진으로 확인합니다.'],
  ['Check', '마감 점검', '사용 동선과 마감 상태를 최종 점검합니다.'],
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

function isGeneralPreviewSite(site: HomepagePublicPackage['site']) {
  return site.business_name === '온사이트 스튜디오' || site.seo_keywords?.includes('현장업')
}

export default function PublicHomepage({ data, page = 'home' }: Props) {
  const { site, calculator, blogPosts, mediaItems } = data
  const isGeneral = isGeneralPreviewSite(site)
  const template = getHomepageTemplate(site.template_key)
  const palette = getHomepagePalette(site.template_key, site.color_palette)
  const currentPage = normalizeHomepagePageSlug(page, site.template_key)
  const isDirectSales = site.template_key === 'sales-reviews' || site.template_key === 'sales-services' || site.template_key === 'sales-fast-contact'
  const showCalculator = !isDirectSales && site.calculator_enabled && calculator && template.calculatorPosition !== 'none'
  const heroCalculator = showCalculator && template.calculatorPosition === 'hero'
  const secondaryCalculator = showCalculator && template.calculatorPosition === 'secondary'
  const isFastContact = site.template_key === 'sales-fast-contact' || site.template_key === 'showcase-local' || isDirectSales
  const isCampaign = site.template_key === 'interactive-campaign'
  const isTemplateStudio = site.template_key === 'field-template-studio'
  const isTechShowcase = site.template_key === 'showcase-tech'
  const isCarenexShowcase = site.template_key === 'showcase-carenex'
  const isCleanDetailShowcase = site.template_key === 'showcase-clean-detail'
  const isSilverDaycare = site.template_key === 'silver-daycare'
  const hasStickyContactBar = isFastContact || isSilverDaycare
  const previewPrefix = site.slug?.startsWith('preview-') ? `/homepage-preview/${site.template_key}` : null
  const basePath = previewPrefix || (typeof site.slug === 'string' ? `/t/${site.slug}` : '')
  const pageHref = (slug: HomepagePageSlug) => (slug === 'home' ? basePath : `${basePath}/${slug}`)
  const menuItems = template.pages.map((slug) => ({ slug, href: pageHref(slug) }))
  const fixedHeaderOffset = previewPrefix ? 'top-[40px]' : 'top-0'
  const overlayHeader = isTechShowcase || isCarenexShowcase
  const pageTopPadding = overlayHeader ? (previewPrefix ? 'pt-[40px]' : 'pt-0') : previewPrefix ? 'pt-[112px]' : 'pt-[72px]'
  const isPremiumShowcase = site.template_key === 'showcase-portfolio'
  const headerClassName = isCarenexShowcase
    ? `homepage-flat fixed inset-x-0 ${fixedHeaderOffset} z-[60] border-b border-white/15 bg-[#111827]/78 text-white backdrop-blur-xl`
    : isTechShowcase
    ? `homepage-flat fixed inset-x-0 ${fixedHeaderOffset} z-[60] border-b border-white/10 bg-black/88 text-white backdrop-blur-xl`
    : isPremiumShowcase
    ? `homepage-flat fixed inset-x-0 ${fixedHeaderOffset} z-[60] border-b border-white/10 bg-black/72 text-white backdrop-blur-xl`
    : `homepage-flat fixed inset-x-0 ${fixedHeaderOffset} z-[60] border-b border-black/10 bg-white/90 backdrop-blur-xl`
  const headerPhoneClassName = isSilverDaycare
    ? 'hidden rounded-full bg-[#1f6b4f] px-4 py-2 text-sm font-black text-white shadow-[0_8px_20px_rgba(31,107,79,0.22)] sm:inline-flex'
    : isCleanDetailShowcase
    ? 'hidden rounded-md bg-[#1a2a6c] px-4 py-2 text-sm font-black text-white sm:inline-flex'
    : isCarenexShowcase
    ? 'hidden rounded-md bg-[#0047ab] px-4 py-2 text-sm font-black text-white shadow-[0_4px_16px_rgba(0,71,171,0.35)] sm:inline-flex'
    : isTechShowcase
    ? 'hidden rounded-md bg-[#0066ff] px-4 py-2 text-sm font-black text-white shadow-[0_4px_16px_rgba(0,102,255,0.35)] sm:inline-flex'
    : isPremiumShowcase
    ? 'hidden rounded-full bg-[#d5b56d] px-4 py-2 text-sm font-black text-[#15100a] sm:inline-flex'
    : 'hp-primary hidden rounded-full px-4 py-2 text-sm font-black sm:inline-flex'

  return (
    <main
      className={`homepage-site min-h-screen ${pageTopPadding} ${palette.text} ${isTechShowcase ? 'homepage-tech-site' : ''}`}
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
              inverseButton={isPremiumShowcase || isTechShowcase || isCarenexShowcase}
            />
          </div>
        </div>
      </header>

      {currentPage === 'home' && (
        isSilverDaycare ? (
          <SilverDaycareHome data={data} pageHref={pageHref} />
        ) : isCleanDetailShowcase ? (
          <CleanDetailHome data={data} pageHref={pageHref} />
        ) : isCarenexShowcase ? (
          <CarenexShowcaseHome data={data} pageHref={pageHref} />
        ) : isTechShowcase ? (
          <TechShowcaseHome data={data} pageHref={pageHref} />
        ) : isTemplateStudio ? (
          <FieldTemplateStudioHome data={data} pageHref={pageHref} />
        ) : (
          <HomePage
            data={data}
            pageHref={pageHref}
            palette={palette}
            heroCalculator={!!heroCalculator}
            secondaryCalculator={!!secondaryCalculator}
            isCampaign={isCampaign}
          />
        )
      )}
      {currentPage === 'about' && (
        isSilverDaycare ? <SilverDaycareGradeGuide data={data} /> : isCleanDetailShowcase ? <CleanDetailStandards /> : isCarenexShowcase ? <CarenexAbout pageHref={pageHref} /> : isTechShowcase ? <TechShowcaseAbout data={data} pageHref={pageHref} /> : isTemplateStudio ? <FieldTemplateStudioAbout pageHref={pageHref} /> : <AboutPage data={data} palette={palette} />
      )}
      {currentPage === 'services' && (
        isSilverDaycare
          ? <SilverDaycarePrograms />
          : isCleanDetailShowcase
          ? <CleanDetailScope />
          : isCarenexShowcase
          ? <CarenexServices />
          : isTechShowcase
          ? <TechShowcaseServices cleaning={isCleaningTechSite(site)} />
          : isTemplateStudio
          ? <FieldTemplateStudioTemplates pageHref={pageHref} />
          : <ServicesPage showEstimateCta={!!showCalculator} pageHref={pageHref} palette={palette} general={isGeneral} />
      )}
      {currentPage === 'portfolio' && (
        isSilverDaycare ? (
          <SilverDaycareFacilities data={data} />
        ) : isCleanDetailShowcase ? (
          <CleanDetailReviews />
        ) : isCarenexShowcase ? (
          <CarenexPortfolio />
        ) : isTechShowcase ? (
          <TechShowcaseNews cleaning={isCleaningTechSite(site)} />
        ) : isTemplateStudio ? (
          <FieldTemplateStudioPortfolio pageHref={pageHref} />
        ) : (
          <PortfolioSection
            palette={palette}
            siteTitle={site.portfolio_title || '최근 현장 사례'}
            posts={blogPosts}
            mediaItems={mediaItems}
          />
        )
      )}
      {currentPage === 'estimate' && showCalculator && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <EstimateCalculator site={site} calculator={calculator} />
        </section>
      )}
      {currentPage === 'estimate' && !showCalculator && <ContactPage data={data} palette={palette} />}
      {currentPage === 'reviews' && (isTemplateStudio ? <FieldTemplateStudioReviews /> : <ReviewsPage palette={palette} general={isGeneral} />)}
      {currentPage === 'faq' && (isSilverDaycare ? <SilverDaycareFaq data={data} /> : isCleanDetailShowcase ? <CleanDetailFaq /> : isCarenexShowcase ? <CarenexPrCenter /> : isTechShowcase ? <TechShowcaseFaq data={data} /> : isTemplateStudio ? <FieldTemplateStudioFaq /> : <FaqPage palette={palette} general={isGeneral} />)}
      {currentPage === 'contact' && (isSilverDaycare ? <SilverDaycareContact data={data} /> : isCleanDetailShowcase ? <CleanDetailContact data={data} /> : isCarenexShowcase ? <CarenexContact data={data} /> : isTechShowcase ? <TechShowcaseContact data={data} /> : isTemplateStudio ? <FieldTemplateStudioContact data={data} /> : <ContactPage data={data} palette={palette} />)}

      {isCleanDetailShowcase ? <CleanDetailFooter data={data} /> : isCarenexShowcase ? <CarenexFooter data={data} /> : isTechShowcase ? <TechShowcaseFooter data={data} /> : <HomepageFooter site={site} palette={palette} />}

      {(hasStickyContactBar || showCalculator) && (
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

const silverCareImages = [
  'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
]

const silverProgramCards = [
  ['인지 활동', '회상놀이, 미술, 노래교실로 어르신의 하루 리듬을 돕습니다.'],
  ['신체 활동', '가벼운 체조와 보행 훈련으로 무리 없는 움직임을 이어갑니다.'],
  ['정서 돌봄', '담당 선생님이 식사, 투약, 컨디션 변화를 보호자께 안내합니다.'],
]

const silverFaqRows = [
  ['장기요양등급이 없어도 상담 가능한가요?', '가능합니다. 현재 상황을 듣고 등급 신청 절차와 필요 서류를 함께 안내드립니다.'],
  ['차량 송영은 어디까지 가능한가요?', '센터 기준 인근 지역을 우선 운행하며, 주소 확인 후 가능 여부를 안내드립니다.'],
  ['식단표는 어떻게 확인하나요?', '주간 식단과 간식 구성을 홈페이지 또는 블로그 연동 방식으로 보여줄 수 있습니다.'],
  ['처음 방문 전에 무엇을 준비해야 하나요?', '어르신 건강 상태, 복용약, 식사 주의사항을 알려주시면 상담이 더 정확합니다.'],
]

function SilverDaycareHome({
  data,
  pageHref,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
}) {
  const { site } = data
  return (
    <>
      <section className="relative overflow-hidden bg-[#fbf6ea]">
        <div className="absolute inset-x-0 top-0 h-40 bg-[#e8f3dc]" />
        <div className="hp-container relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#1f6b4f] shadow-sm">
              주간보호센터 안심 상담형
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-[-0.055em] text-[#22352d] sm:text-6xl">
              부모님을 맡기는 결정,
              <br />
              전화 한 통으로 편하게 확인하세요.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-9 text-[#5c675f]">
              {site.subheadline}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {site.phone && (
                <a href={`tel:${site.phone}`} className="rounded-full bg-[#1f6b4f] px-7 py-4 text-center text-lg font-black text-white shadow-xl shadow-emerald-900/15">
                  전화상담 {site.phone}
                </a>
              )}
              <a href={pageHref('about')} className="rounded-full border border-[#1f6b4f]/25 bg-white px-7 py-4 text-center text-lg font-black text-[#1f6b4f]">
                장기요양등급 안내
              </a>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {['식단 공개', '차량 송영', '등급 신청 도움'].map((item) => (
                <div key={item} className="rounded-2xl bg-white p-4 text-center font-black text-[#22352d] shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] bg-white p-3 shadow-2xl shadow-emerald-950/10">
              <img src={silverCareImages[0]} alt="주간보호센터 상담 이미지" className="aspect-[4/5] w-full rounded-[1.4rem] object-cover" />
            </div>
            <div className="absolute -bottom-5 left-5 right-5 rounded-3xl bg-white p-5 shadow-xl">
              <p className="text-sm font-black text-[#1f6b4f]">오늘 상담 가능</p>
              <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#22352d]">센터 방문 전 전화로 먼저 확인하세요</p>
            </div>
          </div>
        </div>
      </section>
      <SilverDaycareQuickInfo data={data} />
      <SilverDaycareFacilities data={data} compact />
      <SilverDaycareMeals />
      <SilverDaycarePrograms />
      <SilverDaycareGradeGuide data={data} />
      <SilverDaycareVehicle data={data} />
      <SilverDaycareFaq data={data} compact />
      <SilverDaycareContact data={data} />
    </>
  )
}

function SilverDaycareQuickInfo({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  const rows = [
    ['운영시간', site.business_hours || '평일 08:00 - 18:00'],
    ['차량운행', site.service_area || '센터 인근 송영 가능'],
    ['상담내용', '등급 신청, 이용 절차, 비용 안내'],
    ['보호자 확인', '식단, 프로그램, 시설 사진 안내'],
  ]
  return (
    <section className="bg-white">
      <div className="hp-container grid gap-3 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([title, text]) => (
          <div key={title} className="rounded-3xl border border-[#dbe8d3] bg-[#fbf8f0] p-5">
            <p className="text-sm font-black text-[#1f6b4f]">{title}</p>
            <p className="mt-2 text-lg font-black tracking-[-0.02em] text-[#26352f]">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function SilverDaycareFacilities({ data, compact = false }: { data: HomepagePublicPackage; compact?: boolean }) {
  const images = data.mediaItems.length ? data.mediaItems.slice(0, 4).map((item) => item.image_url) : silverCareImages
  return (
    <section className="bg-[#f7f1e4]">
      <div className={`hp-container ${compact ? 'py-14' : 'py-20 sm:py-24'}`}>
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f6b4f]">Facility</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#26352f]">시설 상태를 사진으로 먼저 보여줍니다</h2>
          <p className="mt-4 leading-8 text-[#68746c]">보호자는 센터 분위기, 생활실, 식사 공간, 프로그램 공간을 먼저 보고 싶어합니다.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {images.map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className={`${index === 0 ? 'md:col-span-2 md:row-span-2' : ''} overflow-hidden rounded-3xl bg-white p-2 shadow-sm`}>
              <img src={imageUrl} alt="" className="h-full min-h-56 w-full rounded-[1.25rem] object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SilverDaycareMeals() {
  return (
    <section className="bg-white">
      <div className="hp-container grid gap-8 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f6b4f]">Meal Guide</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#26352f]">식단은 보호자가 가장 자주 확인하는 신뢰 자료입니다</h2>
          <p className="mt-5 leading-8 text-[#68746c]">주간 식단표, 간식, 저염식/당뇨식 상담 가능 여부를 보기 쉽게 정리합니다. 블로그 식단 게시물을 홈페이지에 연결하는 구조도 확장할 수 있습니다.</p>
        </div>
        <div className="rounded-[2rem] bg-[#fbf6ea] p-5">
          {[
            ['월', '잡곡밥 · 소고기무국 · 계란찜 · 나물무침'],
            ['화', '흑미밥 · 된장국 · 생선구이 · 제철과일'],
            ['수', '영양죽 · 두부조림 · 김치전 · 요거트'],
          ].map(([day, menu]) => (
            <div key={day} className="mb-3 grid grid-cols-[4rem_1fr] rounded-2xl bg-white p-4 last:mb-0">
              <p className="font-black text-[#1f6b4f]">{day}</p>
              <p className="font-bold leading-7 text-[#26352f]">{menu}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SilverDaycarePrograms() {
  return (
    <section className="bg-[#eef7e9]">
      <div className="hp-container py-20">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f6b4f]">Program</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#26352f]">하루가 무료하지 않도록 프로그램을 보여줍니다</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {silverProgramCards.map(([title, text], index) => (
            <div key={title} className="rounded-[2rem] bg-white p-7 shadow-sm">
              <p className="text-sm font-black text-[#1f6b4f]">0{index + 1}</p>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.035em] text-[#26352f]">{title}</h3>
              <p className="mt-3 leading-7 text-[#68746c]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SilverDaycareGradeGuide({ data }: { data: HomepagePublicPackage }) {
  return (
    <section className="bg-white">
      <div className="hp-container grid gap-8 py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f6b4f]">Care Grade</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#26352f]">장기요양등급 신청, 처음부터 같이 안내합니다</h2>
          <p className="mt-5 leading-8 text-[#68746c]">주간보호센터를 처음 찾는 보호자는 등급 신청부터 막히는 경우가 많습니다. 홈페이지에서 절차를 먼저 설명하고 바로 전화상담으로 연결합니다.</p>
          {data.site.phone && (
            <a href={`tel:${data.site.phone}`} className="mt-7 inline-flex rounded-full bg-[#1f6b4f] px-7 py-4 font-black text-white">
              등급 신청 전화상담
            </a>
          )}
        </div>
        <div className="grid gap-3">
          {['건강 상태와 이용 희망일 상담', '국민건강보험공단 신청 절차 안내', '인정조사 준비사항 확인', '등급 결과 후 이용 일정 조율'].map((item, index) => (
            <div key={item} className="rounded-2xl border border-[#dbe8d3] bg-[#fbf8f0] p-5">
              <p className="font-black text-[#1f6b4f]">STEP {index + 1}</p>
              <p className="mt-2 text-lg font-black text-[#26352f]">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SilverDaycareVehicle({ data }: { data: HomepagePublicPackage }) {
  return (
    <section className="bg-[#26352f] text-white">
      <div className="hp-container grid gap-8 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#bfe3b0]">Vehicle Service</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.045em]">차량 송영 가능 지역을 명확하게 안내합니다</h2>
        </div>
        <div className="rounded-[2rem] bg-white/10 p-6">
          <p className="text-2xl font-black">{data.site.service_area || '센터 인근 지역 차량 송영 가능'}</p>
          <p className="mt-4 leading-8 text-white/72">보호자가 가장 궁금해하는 등하원 시간, 동승 관리, 운행 가능 지역을 상담 전에 확인할 수 있게 구성합니다.</p>
        </div>
      </div>
    </section>
  )
}

function SilverDaycareFaq({ data, compact = false }: { data: HomepagePublicPackage; compact?: boolean }) {
  return (
    <section className="bg-[#fbf6ea]">
      <div className={`hp-container ${compact ? 'py-16' : 'py-20'}`}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f6b4f]">FAQ</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#26352f]">보호자가 묻기 전에 먼저 답합니다</h2>
          </div>
          {data.site.phone && <a href={`tel:${data.site.phone}`} className="rounded-full bg-[#1f6b4f] px-6 py-3 text-center font-black text-white">전화상담</a>}
        </div>
        <div className="grid gap-3">
          {silverFaqRows.map(([question, answer]) => (
            <div key={question} className="rounded-3xl bg-white p-6">
              <p className="text-lg font-black text-[#26352f]">{question}</p>
              <p className="mt-3 leading-7 text-[#68746c]">{answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SilverDaycareContact({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  return (
    <section className="bg-white">
      <div className="hp-container py-20">
        <div className="rounded-[2rem] bg-[#1f6b4f] p-8 text-white sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-white/70">Consultation</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em]">방문 전, 보호자님 상황부터 편하게 들려주세요</h2>
          <p className="mt-4 max-w-2xl leading-8 text-white/75">어르신 상태, 등급 여부, 송영 지역, 이용 희망 요일을 알려주시면 필요한 절차를 순서대로 안내드립니다.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {site.phone && <a href={`tel:${site.phone}`} className="rounded-full bg-white px-7 py-4 text-center text-lg font-black text-[#1f6b4f]">전화상담 {site.phone}</a>}
            {site.kakao_url && <a href={site.kakao_url} className="rounded-full bg-yellow-300 px-7 py-4 text-center text-lg font-black text-[#3b2a00]">카카오톡 상담</a>}
          </div>
        </div>
      </div>
    </section>
  )
}

const studioFeatureCards = [
  ['프리미엄 홈페이지', '저렴해 보이지 않는 구조와 화면 밀도로 첫인상을 만듭니다.', HOMEPAGE_PREVIEW_IMAGES[10]],
  ['트렌디한 이미지 효과', '현장 사진을 크게 쓰고 전환 포인트를 자연스럽게 배치합니다.', HOMEPAGE_PREVIEW_IMAGES[11]],
  ['커스터마이징', '업종, 지역, 서비스 문구를 바꿔 실제 업체 사이트처럼 보이게 합니다.', HOMEPAGE_PREVIEW_IMAGES[12]],
  ['디자인 템플릿', '전시형과 영업형을 업종별로 선택할 수 있게 구성합니다.', HOMEPAGE_PREVIEW_IMAGES[13]],
  ['마케팅 도구', '전화, 카카오톡, 문의 버튼이 모바일 화면에서 바로 보이게 합니다.', HOMEPAGE_PREVIEW_IMAGES[8]],
  ['더 많은 템플릿', '청소업뿐 아니라 줄눈, 목공, 인테리어까지 확장합니다.', HOMEPAGE_PREVIEW_IMAGES[9]],
]

const studioPlans = [
  ['Basic', '템플릿 세팅', '기본 템플릿 적용, 연락처 연결, 하단 정보 입력'],
  ['Standard', '문구/사진 교체', '업종 문구 정리, 대표 사진 교체, 기본 SEO 설정'],
  ['Premium', '업종 맞춤 구성', '섹션 순서 조정, 사례 구성, 전환 CTA 최적화'],
]

const studioPortfolioCards = [
  ['기업 홈페이지 1', '전시형 구조', HOMEPAGE_PREVIEW_IMAGES[6]],
  ['기업 홈페이지 2', '영업형 구조', HOMEPAGE_PREVIEW_IMAGES[7]],
  ['기업 홈페이지 3', '현장업 구조', HOMEPAGE_PREVIEW_IMAGES[8]],
]

const studioFaqRows = [
  ['코딩을 몰라도 운영할 수 있나요?', '문구, 사진, 연락처처럼 자주 바꾸는 항목은 관리 화면에서 수정하는 방향으로 구성합니다.'],
  ['사진이 부족해도 시작할 수 있나요?', '초기에는 템플릿 기본 이미지로 시작하고, 실제 현장 사진이 생기면 교체할 수 있습니다.'],
  ['도메인 연결도 가능한가요?', '보유 도메인 연결과 기본 검색 노출 설정까지 함께 안내합니다.'],
  ['제작 기간은 얼마나 걸리나요?', '자료가 준비되어 있으면 기본 세팅은 빠르게 진행하고, 맞춤 범위에 따라 일정이 달라집니다.'],
]

function FieldTemplateStudioHome({
  data,
  pageHref,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
}) {
  const { site } = data
  return (
    <>
      <section
        className="homepage-hero-section relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-black text-center text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.48), rgba(0,0,0,0.54)), url(${HOMEPAGE_PREVIEW_IMAGES[12]})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.16),transparent_32%)]" />
        <div className="relative mx-auto max-w-5xl px-5 py-24">
          <p className="font-serif text-sm italic tracking-[0.38em] text-white/70">premium website template</p>
          <h1 className="mt-7 text-5xl font-black leading-[0.95] tracking-[-0.07em] sm:text-7xl lg:text-8xl">
            현장업 홈페이지,
            <br />
            템플릿으로 시작합니다.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base font-medium leading-8 text-white/72">
            {site.subheadline}
          </p>
          <div className="mt-9 flex justify-center gap-3">
            <a href={pageHref('services')} className="rounded-none bg-white px-7 py-4 text-sm font-black text-black">
              바로 시작하기
            </a>
            <a href={pageHref('about')} className="rounded-none border border-white/45 px-7 py-4 text-sm font-black text-white">
              더 알아보기
            </a>
          </div>
        </div>
        <div className="absolute bottom-9 left-1/2 h-12 w-7 -translate-x-1/2 rounded-full border border-white/50">
          <span className="homepage-studio-scroll-dot absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-white" />
        </div>
      </section>

      <FieldTemplateStudioWhoWeAre />
      <FieldTemplateStudioCarousel />
      <FieldTemplateStudioTemplates pageHref={pageHref} compact />
      <FieldTemplateStudioInnovation />
      <FieldTemplateStudioPortfolio pageHref={pageHref} compact />
      <FieldTemplateStudioPricing pageHref={pageHref} />
      <FieldTemplateStudioReviews />
      <FieldTemplateStudioFaq compact />
      <FieldTemplateStudioFinalCta pageHref={pageHref} />
    </>
  )
}

function FieldTemplateStudioWhoWeAre() {
  return (
    <section className="bg-white">
      <div className="hp-container py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="font-serif text-sm italic tracking-[0.34em] text-[#888]">WHO WE ARE</p>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.055em] text-black sm:text-5xl">
              온사이트 템플릿에
              <br />
              오신 여러분 환영합니다.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#555]">
              수백만 원짜리 홈페이지의 흐름을 현장업 사장님이 빠르게 시작할 수 있는 템플릿 구조로 정리합니다.
              전시형, 영업형, 범용 현장업까지 문의 전환에 필요한 화면을 먼저 준비합니다.
            </p>
            <div className="mt-10 grid max-w-lg grid-cols-2 divide-x divide-black/15 border-y border-black/10 py-6">
              {[
                ['30+', 'Template sections'],
                ['10x', 'Faster setup'],
              ].map(([value, label]) => (
                <div key={value} className="px-6 first:pl-0">
                  <p className="text-6xl font-black tracking-[-0.06em] text-black">{value}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#888]">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden">
            <img src={HOMEPAGE_PREVIEW_IMAGES[13]} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  )
}

function FieldTemplateStudioCarousel() {
  return (
    <section className="bg-[#f7f7f7]">
      <div className="hp-container py-20 sm:py-28">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-serif text-sm italic tracking-[0.34em] text-[#888]">WHAT WE MAKE</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-black sm:text-5xl">템플릿은 싸 보인다는 틀을 깹니다.</h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <span className="flex h-11 w-11 items-center justify-center border border-black/15 bg-white text-xl">←</span>
            <span className="flex h-11 w-11 items-center justify-center border border-black/15 bg-black text-xl text-white">→</span>
          </div>
        </div>
        <div className="-mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-4">
          {studioFeatureCards.map(([title, text, imageUrl], index) => (
            <article key={title} className="group min-w-[82%] snap-start overflow-hidden bg-white shadow-sm sm:min-w-[46%] lg:min-w-[31%]">
              <div className="h-64 overflow-hidden">
                <img src={imageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-6">
                <p className="text-sm font-black text-[#888]">0{index + 1}</p>
                <h3 className="mt-4 text-2xl font-black tracking-[-0.035em] text-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#666]">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FieldTemplateStudioTemplates({
  pageHref,
  compact = false,
}: {
  pageHref: (slug: HomepagePageSlug) => string
  compact?: boolean
}) {
  const templates = [
    ['전시형', '회사소개, 서비스, 사례, 전후사진을 안정적으로 보여주는 기본 구조입니다.'],
    ['영업형', '후기, 기준 비용, 빠른 상담 버튼을 앞쪽에 배치해 문의를 목표로 합니다.'],
    ['범용 현장업', '줄눈, 목공, 인테리어, 방충망처럼 현장 사진이 중요한 업종에 맞춥니다.'],
  ]

  return (
    <section className="bg-white">
      <div className="hp-container py-20 text-center sm:py-28">
        <p className="font-serif text-sm italic tracking-[0.34em] text-[#888]">OUR SERVICE</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-tight tracking-[-0.055em] text-black sm:text-5xl">
          프리미엄 홈페이지 템플릿을
          <br />
          전문으로 제작합니다.
        </h1>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {['Homepage Template', 'Trendy Design', 'Fancy Animation', 'Innovation'].map((tag, index) => (
            <span key={tag} className={`rounded-full px-4 py-2 text-xs font-black ${index % 2 === 0 ? 'bg-black text-white' : 'border border-black text-black'}`}>
              {tag}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#666]">
          템플릿도 충분히 고급스러울 수 있다는 것을 증명합니다. 현장업에 필요한 페이지 흐름과 문의 버튼을 처음부터 포함합니다.
        </p>
      </div>
      <div className="hp-container">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-serif text-sm italic tracking-[0.34em] text-[#888]">TEMPLATE LINEUP</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] text-black sm:text-5xl">현장업에 맞춘 템플릿 구성</h2>
          </div>
          {!compact && (
            <a href={pageHref('contact')} className="rounded-none bg-black px-5 py-3 text-sm font-black text-white">
              제작 상담하기
            </a>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {templates.map(([title, text], index) => (
            <article key={title} className="group overflow-hidden border border-black/10 bg-white">
              <div
                className="h-56 bg-cover bg-center transition duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${HOMEPAGE_PREVIEW_IMAGES[index + 6]})` }}
              />
              <div className="p-6">
                <p className="text-sm font-black text-[#888]">0{index + 1}</p>
                <h2 className="mt-3 text-2xl font-black text-black">{title}</h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-[#666]">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FieldTemplateStudioInnovation() {
  return (
    <section
      className="overflow-hidden bg-black py-24 text-white"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0.62)), url(${HOMEPAGE_PREVIEW_IMAGES[14] || HOMEPAGE_PREVIEW_IMAGES[1]})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="homepage-studio-marquee flex whitespace-nowrap text-[5rem] font-black lowercase leading-none tracking-[-0.08em] text-white/45 sm:text-[8rem]">
        <span className="pr-10">innovation innovation innovation innovation</span>
        <span className="pr-10">innovation innovation innovation innovation</span>
      </div>
    </section>
  )
}

function FieldTemplateStudioPricing({ pageHref }: { pageHref: (slug: HomepagePageSlug) => string }) {
  return (
    <section className="bg-[#111] text-white">
      <div className="hp-container py-14 sm:py-20">
        <p className="font-serif text-sm italic tracking-[0.34em] text-white/45">PRODUCT</p>
        <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-[-0.06em] sm:text-5xl">
          필요한 범위에 맞춰 상품을 선택하세요
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {studioPlans.map(([name, title, text], index) => (
            <article key={name} className={`border p-6 ${index === 1 ? 'border-white bg-white text-black' : 'border-white/15 bg-white/[0.06]'}`}>
              <p className="text-sm font-black opacity-70">{name}</p>
              <h3 className="mt-4 text-2xl font-black">{title}</h3>
              <p className="mt-4 min-h-16 text-sm font-semibold leading-7 opacity-75">{text}</p>
              <a href={pageHref('contact')} className={`mt-6 inline-flex rounded-none px-5 py-3 text-sm font-black ${index === 1 ? 'bg-black text-white' : 'bg-white text-black'}`}>
                바로 문의하기
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FieldTemplateStudioAbout({ pageHref }: { pageHref: (slug: HomepagePageSlug) => string }) {
  return (
    <>
      <section className="hp-section bg-white">
        <div className="hp-container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="font-serif text-sm italic tracking-[0.34em] text-[#888]">ABOUT</p>
            <h1 className="mt-3 text-5xl font-black leading-tight tracking-[-0.07em] text-black">현장업 사장님을 위한 홈페이지 제작</h1>
            <p className="mt-5 text-base font-semibold leading-8 text-[#666]">
              예쁜 소개 페이지보다 중요한 것은 문의가 들어오는 구조입니다. 업종, 지역, 사례, 후기, 상담 버튼이 자연스럽게 이어지도록 템플릿을 구성합니다.
            </p>
            <a href={pageHref('services')} className="mt-7 inline-flex rounded-none bg-black px-6 py-4 text-sm font-black text-white">
              템플릿 구성 보기
            </a>
          </div>
          <div className="grid gap-3">
            {['업종별 첫 화면', '모바일 문의 동선', '사례 중심 구성', '운영 가능한 관리 항목'].map((item) => (
              <div key={item} className="border border-black/10 bg-[#f7f7f7] p-6 text-xl font-black text-black">{item}</div>
            ))}
          </div>
        </div>
      </section>
      <FieldTemplateStudioWhoWeAre />
    </>
  )
}

function FieldTemplateStudioPortfolio({
  pageHref,
  compact = false,
}: {
  pageHref: (slug: HomepagePageSlug) => string
  compact?: boolean
}) {
  return (
    <>
      <section className="hp-section bg-white">
        <div className="hp-container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-serif text-sm italic tracking-[0.34em] text-[#888]">PORTFOLIO</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-black sm:text-5xl">더 다양한 홈페이지 템플릿을 둘러보세요!</h1>
            </div>
            <a href={pageHref('contact')} className="rounded-none bg-black px-5 py-3 text-sm font-black text-white">
              View All Projects →
            </a>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {studioPortfolioCards.map(([title, label, imageUrl]) => (
              <article key={title} className="group relative h-80 cursor-pointer overflow-hidden bg-black">
                <img src={imageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/60" />
                <div className="absolute inset-x-0 bottom-0 translate-y-4 p-6 text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">{label}</p>
                  <h2 className="mt-3 text-2xl font-black">{title} →</h2>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      {!compact && <FieldTemplateStudioFinalCta pageHref={pageHref} />}
    </>
  )
}

function FieldTemplateStudioReviews() {
  return (
    <section className="hp-section bg-[#f7f7f7]">
      <div className="hp-container">
        <p className="font-serif text-sm italic tracking-[0.34em] text-[#888]">REVIEW</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-black sm:text-5xl">처음 홈페이지를 준비하는 분들이 이해하기 쉽게</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {['사진이 부족했는데도 기본 구성이 있어서 시작하기 쉬웠습니다.', '전화 버튼과 카카오톡 버튼이 바로 보여서 문의 안내가 편했습니다.', '업종에 맞게 문구를 바꾸니 우리 서비스처럼 보였습니다.'].map((text, index) => (
            <article key={text} className="border border-black/10 bg-white p-6">
              <p className="tracking-[0.18em] text-yellow-500">★★★★★</p>
              <p className="mt-5 text-base font-bold leading-8 text-black">“{text}”</p>
              <p className="mt-6 border-t border-black/10 pt-4 text-sm font-black text-[#888]">customer 0{index + 1}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FieldTemplateStudioFaq({ compact = false }: { compact?: boolean }) {
  const rows = compact ? studioFaqRows.slice(0, 3) : studioFaqRows
  return (
    <section className="hp-section bg-white">
      <div className="hp-container">
        <p className="font-serif text-sm italic tracking-[0.34em] text-[#888]">FAQ</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-black sm:text-5xl">자주 묻는 질문</h1>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {rows.map(([question, answer]) => (
            <article key={question} className="border border-black/10 bg-[#f7f7f7] p-6">
              <h2 className="text-xl font-black text-black">{question}</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-[#666]">{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FieldTemplateStudioContact({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  return (
    <section id="contact" className="hp-section bg-[#111] text-white">
      <div className="hp-container grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="font-serif text-sm italic tracking-[0.34em] text-white/45">CONTACT</p>
          <h1 className="mt-3 text-5xl font-black leading-tight tracking-[-0.07em]">어떤 업종인지 알려주시면 맞는 템플릿부터 안내합니다</h1>
          <p className="mt-5 text-base font-semibold leading-8 text-white/65">업종, 지역, 사진 보유 여부, 원하는 상담 방식을 남겨주세요.</p>
        </div>
        <div className="border border-white/15 bg-white p-6 text-black">
          <div className="grid gap-3">
            {['업종 선택', '원하는 템플릿', '예산 범위', '연락처'].map((item) => (
              <div key={item} className="rounded-none bg-[#f7f7f7] px-5 py-4 text-sm font-black text-[#666]">{item}</div>
            ))}
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {site.phone && <a href={`tel:${site.phone}`} className="rounded-none bg-black px-5 py-4 text-center text-sm font-black text-white">전화 문의</a>}
            {site.kakao_url && <a href={site.kakao_url} className="rounded-none bg-yellow-300 px-5 py-4 text-center text-sm font-black text-black">카카오톡 문의</a>}
          </div>
        </div>
      </div>
    </section>
  )
}

function FieldTemplateStudioFinalCta({ pageHref }: { pageHref: (slug: HomepagePageSlug) => string }) {
  return (
    <section className="bg-black text-white">
      <div className="hp-container py-12 sm:py-16">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="font-serif text-sm italic tracking-[0.34em] text-white/45">START</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">현장업 홈페이지, 템플릿부터 확인하세요</h2>
          </div>
          <a href={pageHref('contact')} className="rounded-none bg-white px-6 py-4 text-sm font-black text-black">
            3초 상담하기
          </a>
        </div>
      </div>
    </section>
  )
}

const techProductCards = [
  ['클라우드매니저', 'Cloud Architecture', HOMEPAGE_PREVIEW_IMAGES[6], '#0066ff'],
  ['인사이트 AI', 'AI Solutions', HOMEPAGE_PREVIEW_IMAGES[7], '#7c3aed'],
  ['시큐어가드', 'Cybersecurity', HOMEPAGE_PREVIEW_IMAGES[8], '#dc2626'],
  ['플렉스오토메이트', 'Automation', HOMEPAGE_PREVIEW_IMAGES[9], '#0066ff'],
  ['브랜드빌더', 'Digital Growth', HOMEPAGE_PREVIEW_IMAGES[10], '#059669'],
]

const techServiceCards = [
  {
    label: 'Cloud Architecture',
    color: '#0066ff',
    title: '클라우드 아키텍처',
    text: '비즈니스 규모에 맞춰 안정적으로 확장되는 클라우드 기반을 설계합니다.',
    bullets: ['확장 가능한 클라우드 인프라', '멀티클라우드 전략 수립', '비용 최적화 솔루션', '24/7 모니터링 서비스'],
  },
  {
    label: 'AI Solutions',
    color: '#7c3aed',
    title: '인공지능 솔루션',
    text: '데이터와 업무 흐름을 연결해 실제 운영에 쓰이는 AI 기능을 구현합니다.',
    bullets: ['머신러닝 모델 개발', '자연어 처리 서비스', '예측 분석 플랫폼', 'AI 기반 자동화'],
  },
  {
    label: 'Big Data Analytics',
    color: '#059669',
    title: '빅데이터 분석 플랫폼',
    text: '복잡한 데이터를 빠르게 처리하고 의사결정 가능한 지표로 전환합니다.',
    bullets: ['실시간 데이터 처리', '데이터 시각화 대시보드', '데이터 레이크 구축', '비즈니스 인텔리전스'],
  },
  {
    label: 'Cybersecurity',
    color: '#dc2626',
    title: '사이버 보안 솔루션',
    text: '위협 탐지부터 대응 체계까지 기업 보안을 구조적으로 강화합니다.',
    bullets: ['위협 탐지 및 대응', '제로트러스트 아키텍처', '보안 감사 및 컴플라이언스', '침해 사고 대응'],
  },
]

const techNewsCards = [
  ['테슬라, 자율주행 기술 업데이트 발표', '2024-09-17', 'AI 기반 주행 보조 시스템의 업데이트 방향과 산업 영향이 주목받고 있습니다.', HOMEPAGE_PREVIEW_IMAGES[11]],
  ['삼성전자, 3나노미터 칩 양산 시작', '2024-09-13', '차세대 반도체 공정 경쟁이 클라우드와 AI 인프라 시장을 다시 흔들고 있습니다.', HOMEPAGE_PREVIEW_IMAGES[12]],
  ['AI 스타트업 붐, 글로벌 투자 증가', '2024-09-13', '기업용 AI 자동화와 데이터 분석 솔루션 투자가 빠르게 확대되고 있습니다.', HOMEPAGE_PREVIEW_IMAGES[13]],
]

const cleaningTechProductCards = [
  ['빠른상담 매니저', 'Quick Contact', HOMEPAGE_PREVIEW_IMAGES[4], '#0066ff'],
  ['후기 신뢰보드', 'Review Conversion', HOMEPAGE_PREVIEW_IMAGES[5], '#7c3aed'],
  ['전후사진 갤러리', 'Before After', HOMEPAGE_PREVIEW_IMAGES[6], '#059669'],
  ['지역노출 구조', 'Local SEO', HOMEPAGE_PREVIEW_IMAGES[7], '#0066ff'],
  ['견적문의 동선', 'Lead Flow', HOMEPAGE_PREVIEW_IMAGES[8], '#dc2626'],
]

const cleaningTechServiceCards = [
  {
    label: 'Quick Contact',
    color: '#0066ff',
    title: '빠른 문의 전환',
    text: '모바일에서 전화와 카카오톡이 바로 보이도록 상담 동선을 앞쪽에 배치합니다.',
    bullets: ['상단 전화 버튼', '카카오톡 바로 연결', '하단 고정 CTA', '문의 흐름 단순화'],
  },
  {
    label: 'Review Trust',
    color: '#7c3aed',
    title: '후기 신뢰 설계',
    text: '청소업 고객이 가장 먼저 확인하는 후기와 별점, 고객 반응을 전면에 배치합니다.',
    bullets: ['별점 후기 카드', '고객 닉네임 표시', '후기 우선 노출', '신뢰 문구 정리'],
  },
  {
    label: 'Photo Proof',
    color: '#059669',
    title: '전후사진 중심 구성',
    text: '입주청소, 이사청소, 상가청소의 결과물을 사진 중심으로 보여줍니다.',
    bullets: ['전후 사진 섹션', '청소 후 사진 슬라이드', '현장 사례 카드', '디테일 사진 강조'],
  },
  {
    label: 'Local Cleaning',
    color: '#dc2626',
    title: '지역 청소 키워드',
    text: '강서구, 양천구, 마포구처럼 실제 상담으로 이어지는 지역 정보를 정리합니다.',
    bullets: ['지역 가능 안내', '서비스 지역 카드', '당일 상담 문구', '검색 노출 기본값'],
  },
]

const cleaningTechNewsCards = [
  ['입주청소 문의가 많은 첫 화면 구성', '2024-09-17', '가격보다 먼저 후기와 전후사진을 보여주면 상담 전환이 쉬워집니다.', HOMEPAGE_PREVIEW_IMAGES[5]],
  ['청소업 홈페이지에서 전후사진이 중요한 이유', '2024-09-13', '고객은 설명보다 결과 사진을 먼저 확인하고 업체를 비교합니다.', HOMEPAGE_PREVIEW_IMAGES[6]],
  ['지역명과 서비스명을 함께 노출하는 방법', '2024-09-13', '강서구 입주청소처럼 실제 검색 문구를 홈페이지 구조에 반영합니다.', HOMEPAGE_PREVIEW_IMAGES[7]],
]

function isCleaningTechSite(site: HomepagePublicPackage['site']) {
  return site.template_key === 'showcase-tech' && site.seo_keywords?.includes('청소업')
}

function TechShowcaseHome({
  data,
  pageHref,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
}) {
  const { site } = data
  const cleaning = isCleaningTechSite(site)
  const heroTitle = cleaning ? ['청소업 문의를 바꾸는', '통합 클린 솔루션'] : ['미래를 주도하는', '통합 테크 솔루션']
  return (
    <>
      <section
        className="homepage-hero-section relative flex min-h-[calc(100vh-72px)] items-center overflow-hidden bg-[#0a0a0a] text-white"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.68), rgba(0,0,0,0.44)), url(${site.hero_image_url || HOMEPAGE_PREVIEW_IMAGES[13]})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(0,102,255,0.24),transparent_30%)]" />
        <div className="relative mx-auto w-[min(1200px,calc(100%-32px))] py-24 sm:py-32">
          <p className="inline-flex border-l-[3px] border-[#0066ff] pl-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#0066ff]">
            {cleaning ? 'Cleaning business platform' : 'Tech business solution'}
          </p>
          <h1 className="mt-7 max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-7xl">
            {heroTitle[0]}
            <br />
            <span className="text-[#4da0ff]">{heroTitle[1]}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">
            {site.subheadline}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={pageHref('services')} className="rounded-md bg-[#0066ff] px-6 py-4 text-sm font-semibold text-white shadow-[0_4px_18px_rgba(0,102,255,0.42)] transition hover:scale-[1.03] hover:bg-[#0055cc]">
              {cleaning ? '청소업 구성 보기' : '솔루션 보기'}
            </a>
            <a href={pageHref('contact')} className="rounded-md border border-white/20 bg-white/5 px-6 py-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
              3초만에 문의하기
            </a>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 h-12 w-7 -translate-x-1/2 rounded-full border border-white/35">
          <span className="homepage-studio-scroll-dot absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-white" />
        </div>
      </section>
      <TechShowcaseProducts cleaning={cleaning} />
      <TechShowcaseServices cleaning={cleaning} />
      <TechShowcaseNews cleaning={cleaning} />
      <TechShowcaseCta pageHref={pageHref} />
    </>
  )
}

function TechShowcaseSectionHeader({
  label,
  title,
  dark = true,
}: {
  label: string
  title: string
  dark?: boolean
}) {
  return (
    <div className="mb-10">
      <p className="inline-flex border-l-[3px] border-[#0066ff] pl-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#0066ff]">
        {label}
      </p>
      <h2 className={`mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-[-0.025em] ${dark ? 'text-white' : 'text-[#1a1a1a]'}`}>
        {title}
      </h2>
    </div>
  )
}

function TechShowcaseProducts({ cleaning = false }: { cleaning?: boolean }) {
  const cards = cleaning ? cleaningTechProductCards : techProductCards
  return (
    <section className="bg-[#0a0a0a] text-white">
      <div className="mx-auto w-[min(1200px,calc(100%-32px))] py-20 sm:py-28">
        <TechShowcaseSectionHeader label="Innovation" title={cleaning ? '청소업 문의 전환 솔루션\n상담을 만드는 홈페이지 구조' : '테크 비즈니스 솔루션\n성공을 위한 기술 파트너'} />
        <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-4">
          {cards.map(([title, label, imageUrl, color]) => (
            <article key={title} className="group relative h-[400px] min-w-[300px] snap-start cursor-pointer overflow-hidden rounded-[14px] bg-[#111] transition duration-300 hover:scale-[1.03]">
              <img src={imageUrl} alt="" className="h-full w-full object-cover opacity-82 transition duration-500 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/90" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color }}>{label}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{title}</h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function TechShowcaseServices({ cleaning = false }: { cleaning?: boolean }) {
  const cards = cleaning ? cleaningTechServiceCards : techServiceCards
  return (
    <section className="bg-white">
      <div className="mx-auto w-[min(1200px,calc(100%-32px))] py-20 sm:py-28">
        <TechShowcaseSectionHeader label="Service" title={cleaning ? '청소업 상담을 만드는 핵심 구성' : '비즈니스 성장을 위한 핵심 기술 분야'} dark={false} />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-[14px] border border-black/[0.08] bg-white p-7 shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: card.color }}>{card.label}</p>
              <h3 className="mt-4 text-2xl font-bold text-[#1a1a1a]">{card.title}</h3>
              <p className="mt-4 text-sm leading-7 text-[#666]">{card.text}</p>
              <ul className="mt-6 space-y-3 text-sm text-[#444]">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span style={{ color: card.color }}>•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function TechShowcaseNews({ cleaning = false }: { cleaning?: boolean }) {
  const cards = cleaning ? cleaningTechNewsCards : techNewsCards
  return (
    <section className="bg-[#0a0a0a] text-white">
      <div className="mx-auto w-[min(1200px,calc(100%-32px))] py-20 sm:py-28">
        <TechShowcaseSectionHeader label={cleaning ? 'Cleaning insight' : 'News'} title={cleaning ? '청소업 홈페이지의 흐름을 읽다\n문의 전환과 신뢰 요소' : '테크 산업의 흐름을 읽다\n최신 뉴스와 트렌드'} />
        <div className="grid gap-7 md:grid-cols-3">
          {cards.map(([title, date, text, imageUrl]) => (
            <article key={title} className="overflow-hidden rounded-xl bg-white text-[#1a1a1a] shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
              <img src={imageUrl} alt="" className="h-[220px] w-full object-cover" loading="lazy" />
              <div className="p-6">
                <p className="text-[13px] text-[#999]">{date}</p>
                <h3 className="mt-3 text-lg font-semibold leading-snug">{title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#666]">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function TechShowcaseCta({ pageHref }: { pageHref: (slug: HomepagePageSlug) => string }) {
  return (
    <section className="bg-[linear-gradient(135deg,#0055ff_0%,#0033cc_100%)] px-5 py-24 text-center text-white">
      <h2 className="text-4xl font-bold tracking-[-0.02em]">도움이 필요하신가요?</h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">
        궁금하신 부분을 문의주시면 빠르게 도와드리겠습니다.
      </p>
      <a href={pageHref('contact')} className="mt-8 inline-flex rounded-lg bg-white px-9 py-4 text-base font-semibold text-[#0055ff] transition hover:bg-white/90">
        문의하기
      </a>
    </section>
  )
}

function TechShowcaseAbout({
  data,
  pageHref,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
}) {
  const cleaning = isCleaningTechSite(data.site)
  return (
    <>
      <section className="bg-[#0a0a0a] text-white">
        <div className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-10 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <TechShowcaseSectionHeader label="About" title={cleaning ? '청소업 상담을 실제 문의로 연결합니다' : '복잡한 기술을 비즈니스 성과로 연결합니다'} />
            <p className="text-base leading-8 text-white/70">
              {cleaning
                ? '입주청소, 이사청소, 상가청소 고객이 먼저 확인하는 가격 기준, 후기, 전후사진, 지역 정보를 한 흐름으로 정리합니다.'
                : '클라우드 인프라, AI 자동화, 데이터 분석, 보안 체계를 하나의 흐름으로 설계해 기업의 디지털 전환을 지원합니다.'}
            </p>
            <a href={pageHref('contact')} className="mt-8 inline-flex rounded-md bg-[#0066ff] px-6 py-4 text-sm font-semibold text-white">
              상담 문의
            </a>
          </div>
          <img src={HOMEPAGE_PREVIEW_IMAGES[12]} alt="" className="h-[520px] w-full rounded-[14px] object-cover" loading="lazy" />
        </div>
      </section>
      <TechShowcaseServices cleaning={cleaning} />
    </>
  )
}

function TechShowcaseFaq({ data }: { data: HomepagePublicPackage }) {
  const cleaning = isCleaningTechSite(data.site)
  const rows = cleaning
    ? [
        ['청소업 문구로 전부 바꿀 수 있나요?', '입주청소, 이사청소, 상가청소, 정기청소처럼 실제 서비스명에 맞춰 문구를 바꿉니다.'],
        ['전화와 카카오톡 문의가 바로 연결되나요?', '상단 CTA와 하단 CTA, 문의 페이지에 전화/카카오톡 연결 버튼을 배치합니다.'],
        ['전후사진과 후기도 넣을 수 있나요?', '청소 후 사진, 현장 사례, 별점 후기 섹션을 템플릿 기본 구조에 포함합니다.'],
      ]
    : [
        ['기존 시스템과 연동이 가능한가요?', '현재 사용 중인 클라우드, ERP, 데이터베이스 구조를 확인한 뒤 단계별 연동 범위를 제안합니다.'],
        ['보안 검토도 함께 진행하나요?', '초기 진단 단계에서 권한, 접근 제어, 로그, 백업 정책을 함께 검토합니다.'],
        ['AI 솔루션은 어떤 데이터가 필요한가요?', '업무 목적에 따라 필요한 데이터를 정의하고, 수집 가능 여부와 모델 적용 범위를 안내합니다.'],
      ]
  return (
    <section className="bg-white">
      <div className="mx-auto w-[min(900px,calc(100%-32px))] py-20 sm:py-28">
        <TechShowcaseSectionHeader label="FAQ" title="자주 묻는 질문" dark={false} />
        <div className="space-y-3">
          {rows.map(([question, answer]) => (
            <article key={question} className="rounded-[14px] border border-black/[0.08] bg-[#f8f9fa] p-6">
              <h2 className="text-xl font-bold text-[#1a1a1a]">{question}</h2>
              <p className="mt-3 text-sm leading-7 text-[#666]">{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function TechShowcaseContact({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  const cleaning = isCleaningTechSite(site)
  return (
    <section className="bg-[#0a0a0a] text-white">
      <div className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-10 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <TechShowcaseSectionHeader label="Contact" title={cleaning ? '청소 서비스와 지역을 알려주시면 상담 동선부터 안내합니다' : '기술 과제를 알려주시면 맞는 솔루션부터 안내합니다'} />
          <p className="text-base leading-8 text-white/70">
            {cleaning ? '입주청소, 이사청소, 상가청소 중 필요한 서비스와 주요 지역을 남겨주세요.' : '클라우드, AI, 데이터, 보안 중 필요한 영역과 현재 상황을 남겨주세요.'}
          </p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] p-7">
          <div className="grid gap-3">
            {(cleaning ? ['업체명', '청소 서비스', '서비스 가능 지역', '연락처'] : ['회사명', '필요한 솔루션', '현재 사용 중인 시스템', '연락처']).map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-black/30 px-5 py-4 text-sm font-semibold text-white/45">{item}</div>
            ))}
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {site.phone && <a href={`tel:${site.phone}`} className="rounded-md bg-[#0066ff] px-5 py-4 text-center text-sm font-semibold text-white">전화 문의</a>}
            {site.kakao_url && <a href={site.kakao_url} className="rounded-md bg-white px-5 py-4 text-center text-sm font-semibold text-[#0066ff]">문의하기</a>}
          </div>
        </div>
      </div>
    </section>
  )
}

function TechShowcaseFooter({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  const cleaning = isCleaningTechSite(site)
  const businessItems = cleaning
    ? ['입주청소', '이사청소', '상가청소', '정기청소']
    : ['클라우드', 'AI 솔루션', '빅데이터', '보안']
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a] text-white">
      <div className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-10 py-16 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-black">{site.business_name || site.name}</p>
          <div className="mt-8 grid gap-5 text-sm leading-7 text-white/65">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066ff]">Address</p>
              <p>{site.footer_address || site.address}</p>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066ff]">Contact</p>
              <p>T. {site.footer_phone || site.phone}</p>
              <p>F. 010 1234 1234</p>
            </div>
          </div>
        </div>
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066ff]">Business</p>
          {businessItems.map((item) => (
            <p key={item} className="text-sm leading-7 text-white/65">{item}</p>
          ))}
        </div>
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066ff]">Company</p>
          <p className="text-sm leading-7 text-white/65">대표: {site.footer_representative || '홍길동'}</p>
          <p className="text-sm leading-7 text-white/65">사업자등록번호: {site.footer_business_number || '000-00-00000'}</p>
        </div>
      </div>
      <div className="mx-auto flex w-[min(1200px,calc(100%-32px))] flex-wrap justify-between gap-3 border-t border-white/[0.08] py-6 text-sm text-white/45">
        <span>개인정보처리방침</span>
        <span>{cleaning ? 'CleanTech Platform' : 'Technova'}. All rights reserved.</span>
      </div>
    </footer>
  )
}

const carenexHeroSlides = [
  ['자산의 가치를 높이는\n스마트 건물관리 솔루션', '시설관리, 미화, 보안, 행정지원을 아우르는 원스톱 서비스를 경험하세요.', HOMEPAGE_PREVIEW_IMAGES[13]],
  ['체계적인 관리 시스템과\n전문 관리 인력', '전문 시스템과 숙련된 전문가가 파트너사의 건물관리를 책임집니다.', HOMEPAGE_PREVIEW_IMAGES[12]],
  ['건물의 특성에 맞춘\n최적의 관리 플랜', '대형 오피스부터 복합 상가, 관공서까지 각 현장에 최적화된 솔루션을 제안합니다.', HOMEPAGE_PREVIEW_IMAGES[11]],
]

const carenexServices = [
  ['시설관리 (FM)', '전기, 소방, 공조, 승강기 등 핵심 설비의 24/7 예방 점검 및 신속 대응', HOMEPAGE_PREVIEW_IMAGES[6]],
  ['미화·환경관리', '일상의 쾌적함과 건물의 가치를 높이는 전문 클리닝 및 조경, 방역', HOMEPAGE_PREVIEW_IMAGES[5]],
  ['보안·주차관리', '첨단 시스템과 전문 인력을 통한 24시간 빈틈없는 안전 및 주차 편의 제공', HOMEPAGE_PREVIEW_IMAGES[7]],
  ['아웃소싱·인재파견', '미화/보안 인력 등 건물 운영에 필요한 전문 인력 파견과 관리', HOMEPAGE_PREVIEW_IMAGES[8]],
]

const carenexCompetences = [
  ['AI', 'AI 건물 진단', 'AI 플랫폼 기반 정밀 분석과 데이터 기반 리스크 대응'],
  ['ESG', '친환경 청소 인증', 'ESG 경영 실천을 위한 친환경 세제·장비 및 인증 시스템'],
  ['IT', 'IT 스마트 관리', '실시간 현장 리포트와 디지털 데이터 기반의 투명한 관리'],
  ['FM', '시설·미화 통합관리', '인력·자원 최적화로 관리 품질 향상과 운영 비용 절감'],
]

const carenexPortfolio = [
  ['프라임 오피스 빌딩', HOMEPAGE_PREVIEW_IMAGES[9]],
  ['복합 상업시설', HOMEPAGE_PREVIEW_IMAGES[10]],
  ['공공기관 청사', HOMEPAGE_PREVIEW_IMAGES[11]],
  ['지식산업센터', HOMEPAGE_PREVIEW_IMAGES[12]],
  ['대형 주거단지', HOMEPAGE_PREVIEW_IMAGES[13]],
  ['물류 운영센터', HOMEPAGE_PREVIEW_IMAGES[14] || HOMEPAGE_PREVIEW_IMAGES[4]],
]

function CarenexShowcaseHome({
  data,
  pageHref,
}: {
  data: HomepagePublicPackage
  pageHref: (slug: HomepagePageSlug) => string
}) {
  return (
    <>
      <CarenexHero />
      <CarenexServices />
      <CarenexCompetence />
      <CarenexPlatform pageHref={pageHref} />
      <CarenexPerformance />
      <CarenexPortfolio />
      <CarenexPrCenter />
      <CarenexContact data={data} />
    </>
  )
}

function CarenexSectionHeader({ label, title, text, dark = false }: { label: string; title: string; text?: string; dark?: boolean }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[#0047ab]">{label}</p>
      <h2 className={`mt-4 text-4xl font-bold tracking-[-0.02em] ${dark ? 'text-white' : 'text-[#1a1a1a]'}`}>{title}</h2>
      {text && <p className={`mx-auto mt-5 max-w-xl text-base leading-8 ${dark ? 'text-white/75' : 'text-[#666]'}`}>{text}</p>}
    </div>
  )
}

function CarenexHero() {
  const [title, text, image] = carenexHeroSlides[0]
  return (
    <section
      className="homepage-hero-section relative flex min-h-[calc(100vh-70px)] items-center justify-center overflow-hidden bg-[#111827] text-center text-white"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.35)), url(${image})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="mx-auto max-w-5xl px-5">
        <h1 className="whitespace-pre-line text-4xl font-bold leading-[1.2] tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)] sm:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/85">{text}</p>
      </div>
      <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-2">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className={`h-2.5 rounded-full ${dot === 0 ? 'w-7 bg-white' : 'w-2.5 bg-white/40'}`} />
        ))}
      </div>
      <div className="homepage-studio-scroll-dot absolute bottom-9 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-[0.18em] text-white/70">SCROLL ↓</div>
    </section>
  )
}

function CarenexServices() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto w-[min(1200px,calc(100%-32px))]">
        <CarenexSectionHeader
          label="TOTAL PROPERTY SOLUTION"
          title="빌딩케어 프로 통합 관리 서비스"
          text="다년간의 전문 노하우를 바탕으로 자산 가치를 극대화하는 최적화된 건물 관리 서비스를 제공합니다."
        />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {carenexServices.map(([title, text, image], index) => (
            <article key={title} className="group overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
              <img src={image} alt="" className="h-60 w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              <div className="p-6">
                <p className="text-sm font-bold text-[#0047ab]">0{index + 1}</p>
                <h3 className="mt-3 text-xl font-bold text-[#1a1a1a]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#666]">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CarenexCompetence() {
  return (
    <section className="bg-[#f5f5f5] py-20 sm:py-28">
      <div className="mx-auto w-[min(1200px,calc(100%-32px))]">
        <CarenexSectionHeader label="CORE COMPETENCE" title="빌딩케어 프로만의 핵심 경쟁력" />
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4">
          {carenexCompetences.map(([icon, title, text]) => (
            <article key={title} className="rounded-[14px] border border-black/[0.06] bg-white p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#0047ab] hover:shadow-[0_8px_32px_rgba(0,71,171,0.12)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(0,71,171,0.08)] text-xl font-black text-[#0047ab]">{icon}</div>
              <h3 className="mt-6 text-xl font-bold text-[#1a1a1a]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#666]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CarenexPlatform({ pageHref }: { pageHref: (slug: HomepagePageSlug) => string }) {
  return (
    <section
      className="bg-[#111827] text-white"
      style={{ backgroundImage: `linear-gradient(rgba(17,24,39,0.92), rgba(17,24,39,0.92)), url(${HOMEPAGE_PREVIEW_IMAGES[12]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-12 py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#1565c0]">BUILDINGCARE SMART PLATFORM</p>
          <h2 className="mt-4 text-4xl font-bold leading-tight">데이터로 완성하는<br />효율적인 건물 관리</h2>
          <p className="mt-6 text-base leading-8 text-white/75">
            자체 개발한 통합 플랫폼을 통해 실시간 모니터링을 실현합니다. 시설, 미화, 보안 데이터를 통합 분석하여 문제를 사전에 감지하고 운영 비용을 최적화합니다.
          </p>
          <a href={pageHref('contact')} className="mt-8 inline-flex rounded-lg border-2 border-white px-7 py-4 text-sm font-bold text-white transition hover:bg-white hover:text-[#0047ab]">
            빌딩케어 솔루션 문의
          </a>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
          <div className="rounded-xl bg-white p-5 text-[#111827]">
            <p className="text-sm font-bold text-[#0047ab]">SMART DASHBOARD</p>
            <div className="mt-5 grid gap-3">
              {['시설 점검 현황', '미화 품질 리포트', '보안 이벤트 분석', '운영 비용 최적화'].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-lg bg-[#f5f5f5] px-4 py-3">
                  <span className="font-bold">{item}</span>
                  <span className="text-sm font-black text-[#0047ab]">{92 + index}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CarenexPerformance() {
  const rows = [['150+', '파트너스'], ['300+', '총 관리 빌딩'], ['500+', '전문 관리 인력'], ['95%', '계약 연장률']]
  return (
    <section className="bg-[#0047ab] py-16 text-white">
      <div className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([value, label], index) => (
          <div key={label} className={`text-center ${index > 0 ? 'lg:border-l lg:border-white/25' : ''}`}>
            <p className="text-6xl font-black tracking-[-0.04em]">{value}</p>
            <p className="mt-3 text-sm font-medium text-white/80">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CarenexPortfolio() {
  return (
    <section className="bg-[#f5f5f5] py-20 sm:py-28">
      <div className="mx-auto w-[min(1200px,calc(100%-32px))]">
        <CarenexSectionHeader label="PORTFOLIO" title="빌딩케어 프로 관리 현장" />
        <div className="grid gap-5 md:grid-cols-3">
          {carenexPortfolio.map(([title, image]) => (
            <article key={title} className="group relative aspect-[4/3] overflow-hidden rounded-[10px]">
              <img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-[#0047ab]/0 transition duration-300 group-hover:bg-[#0047ab]/70" />
              <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white opacity-0 transition duration-300 group-hover:opacity-100">{title} →</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CarenexPrCenter() {
  const rows = [
    ['회사소개', '고객만족을 위해 노력하는 건물관리 전문기업', '자세히 보기 →'],
    ['인증서 및 특허', '빌딩케어 프로의 신뢰와 전문성을 증명합니다.', '자세히 보기 →'],
    ['오시는 길', '본사 및 지점 위치 안내', '자세히 보기 →'],
  ]
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto w-[min(1200px,calc(100%-32px))]">
        <CarenexSectionHeader label="PR CENTER" title="빌딩케어 프로 커뮤니티" />
        <div className="grid gap-7 md:grid-cols-3">
          {rows.map(([title, text, link]) => (
            <article key={title} className="rounded-xl border border-[#e5e7eb] border-t-[#0047ab] border-t-[3px] bg-[#f9fafb] p-9">
              <h3 className="text-2xl font-bold text-[#1a1a1a]">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-[#666]">{text}</p>
              <p className="mt-7 text-sm font-bold text-[#0047ab]">{link}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CarenexAbout({ pageHref }: { pageHref: (slug: HomepagePageSlug) => string }) {
  return (
    <>
      <CarenexPlatform pageHref={pageHref} />
      <CarenexCompetence />
    </>
  )
}

function CarenexContact({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  return (
    <section
      className="bg-[#111827] px-5 py-24 text-center text-white"
      style={{ backgroundImage: `linear-gradient(rgba(10,20,50,0.85), rgba(10,20,50,0.85)), url(${HOMEPAGE_PREVIEW_IMAGES[13]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[#1565c0]">CONTACT US</p>
      <h2 className="mt-4 text-4xl font-bold">무엇을 도와드릴까요?</h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">
        건물 관리에 대한 문의나 견적이 필요하시면 편하게 연락 주세요. 전문 상담사가 신속하고 정확하게 답변드리겠습니다.
      </p>
      <div className="mt-7 text-lg font-bold leading-9">
        <p>📞 {site.phone || '0000-0000'}</p>
        <p>✉️ {site.footer_email || 'contact@buildingcare-pro.co.kr'}</p>
      </div>
      <a href={`tel:${site.phone || '0000-0000'}`} className="mt-8 inline-flex rounded-lg bg-[#0047ab] px-10 py-4 text-base font-bold text-white shadow-[0_4px_20px_rgba(0,71,171,0.4)] transition hover:-translate-y-0.5 hover:bg-[#0039a6]">
        견적 문의하기
      </a>
    </section>
  )
}

function CarenexFooter({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  return (
    <footer className="bg-[#0a0f1e] text-white/60">
      <div className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-10 py-16 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-black text-white">{site.business_name || '빌딩케어 프로'}</p>
          <p className="mt-5 max-w-sm text-sm leading-7">건물 종합관리 전문기업 빌딩케어 프로는 고객의 자산 가치를 지키기 위해 최선을 다합니다.</p>
          <p className="mt-6 text-sm leading-7">T. {site.footer_phone || site.phone}</p>
          <p className="text-sm leading-7">E. {site.footer_email || 'contact@buildingcare-pro.co.kr'}</p>
        </div>
        {[
          ['회사소개', '인사말', '연혁', '오시는 길'],
          ['서비스', '시설관리', '미화관리', '보안관리', '인재파견'],
          ['스마트플랫폼', '플랫폼 소개', '도입문의'],
        ].map(([title, ...items]) => (
          <div key={title}>
            <p className="mb-4 font-bold text-white">{title}</p>
            {items.map((item) => <p key={item} className="text-sm leading-7">{item}</p>)}
          </div>
        ))}
      </div>
      <div className="mx-auto flex w-[min(1200px,calc(100%-32px))] flex-wrap justify-between gap-3 border-t border-white/[0.08] py-6 text-sm">
        <span>사업자등록번호: {site.footer_business_number || '000-00-00000'} | 대표: {site.footer_representative || '홍길동'}</span>
        <span>© 2024 BuildingCare Pro. All rights reserved.</span>
      </div>
    </footer>
  )
}

const cleanDetailTargets = [
  ['새 집으로 첫 입주', '입주 전 실내 미세먼지와 자재 잔여물을 깨끗하게 정리해드려요'],
  ['영유아 가정', '면역력이 약한 아이를 위해 먼지와 유해물질을 꼼꼼하게 제거해 드려요'],
  ['알레르기 민감고객', '새집증후군 시공 추가 시 알레르기 유발물질을 줄일 수 있어요'],
  ['리모델링·인테리어', '공사 후 남아있는 분진 등 오염을 제거해 쾌적한 공간을 만들어드려요'],
]

const cleanDetailStandards = [
  ['하자점검', '타일·도배·마감재 하자 확인 후 보고'],
  ['분진제거', '전문 장비로 톱밥·미세먼지 제거'],
  ['200장 타올 구비', '4색 구분 타올을 공간별로 분리 사용'],
  ['고온 스팀세척', '고온 스팀으로 싱크·배수구 살균'],
  ['전문 청소장비', '습건식 청소기, 스팀기 등 장비 활용'],
  ['전용 청소세제', '장소별 특화 세제로 기름때·물때 제거'],
  ['1일 1집 청소', '하루 한 집만 전담 집중 서비스'],
  ['후불결제 안내', '청소 완료 후 확인하고 결제'],
]

const cleanDetailReviews = [
  ['박○준', '의정부시 평화로', '2026.06.21', '청소의 달인이 여기 계세요'],
  ['심○섭', '하남시 미사대로', '2026.06.20', '마스터님 감사합니다'],
  ['주○경', '연수구 송도과학로', '2026.06.17', '꼼꼼하고 확실한 청소'],
  ['박○희', '성남시 분당구', '2026.06.13', '너무나도 만족하는 1등 청소'],
  ['전○진', '중구 손기정로', '2026.06.12', '입주청소 감사드립니다'],
  ['이○정', '마포구 만리재로', '2026.06.11', '정말 감사합니다'],
]

const cleanDetailScopeRows = [
  ['방/거실', ['벽, 천장 먼지 및 이물질 제거', '몰딩 먼지 및 오염 제거', '문틀, 창문틀, 유리 오염 제거', '마루와 바닥 찌든 때 제거']],
  ['주방/싱크대', ['싱크대 상하부장 먼지 제거', '중간 타일 오염 제거', '후드 주변 기름때 제거', '배수구와 수전 디테일 청소']],
  ['화장실/욕실', ['배수구 오염 제거', '욕실 타일 먼지 제거', '수전과 스테인레스 이물질 제거', '천장과 벽 사이 찌든 때 제거']],
  ['베란다', ['방충망 먼지 제거', '섀시와 창틀 오염 제거', '바닥 타일 오염 제거', '다용도실 먼지 정리']],
]

const cleanDetailFaqRows = [
  ['평수 대비 투입 인원수는 어떻게 되나요?', '현장 구조와 평형에 따라 2명 이상 투입을 기준으로 안내합니다.'],
  ['예약 및 청소시기는 언제가 좋은가요?', '입주 전 가구와 짐이 들어오기 전 일정을 추천드립니다.'],
  ['식사비용은 어떻게 하나요?', '별도 식사비는 받지 않는 구성으로 안내할 수 있습니다.'],
  ['청소범위는 어떻게 되나요?', '방/거실, 주방, 욕실, 베란다 등 주요 공간별 범위를 사전에 안내합니다.'],
]

function CleanDetailHome({ data, pageHref }: { data: HomepagePublicPackage; pageHref: (slug: HomepagePageSlug) => string }) {
  return (
    <>
      <section className="bg-[#f5f5f5] pt-20 text-center">
        <div className="mx-auto w-[min(1120px,calc(100%-32px))] py-16">
          <p className="text-base italic text-[#666]">잘못된 선택으로 돈과 시간을 낭비하지 마세요</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.02em] text-[#1a2a6c] sm:text-5xl">
            클린홈 프로는 제대로 청소합니다
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#666]">{data.site.subheadline}</p>
          <a href={pageHref('contact')} className="mt-8 inline-flex rounded-lg bg-[#ff6600] px-10 py-4 text-base font-bold text-white transition hover:bg-[#e55a00]">
            간편견적 신청하기
          </a>
        </div>
      </section>
      <CleanDetailTargets />
      <CleanDetailTrust />
      <CleanDetailCertificates />
      <CleanDetailStandards />
      <CleanDetailReviews />
      <CleanDetailCostCta pageHref={pageHref} />
      <CleanDetailProcess />
      <CleanDetailScope />
      <CleanDetailPeopleTable />
      <CleanDetailFaq />
      <CleanDetailRelated />
    </>
  )
}

function CleanDetailSectionHeader({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#1a1a1a] sm:text-4xl">{title}</h2>
      {text && <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#666]">{text}</p>}
    </div>
  )
}

function CleanDetailTargets() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="입주청소는 이런 분께 추천드려요" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cleanDetailTargets.map(([title, text], index) => (
            <article key={title} className="rounded-xl border border-[#e0e0e0] bg-white p-7 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-[#1a2a6c]">
              <p className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#1a2a6c] text-sm font-bold text-white">0{index + 1}</p>
              <h3 className="mt-5 text-lg font-bold text-[#222]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#666]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CleanDetailTrust() {
  const rows = [
    ['칭찬후기 10만건+', '실제 이용 고객 후기 중심으로 신뢰를 보여줍니다.'],
    ['현장점검 7천회+', '서비스 품질을 현장에서 확인하는 구조를 보여줍니다.'],
    ['소비자 인증', '공식 인증과 품질 기준을 강조할 수 있습니다.'],
    ['본사 책임 관리', '체크리스트와 교육 이수 기준으로 관리합니다.'],
  ]
  return (
    <section className="bg-[#1a2a6c] py-16 text-white">
      <div className="mx-auto grid w-[min(1120px,calc(100%-32px))] gap-5 md:grid-cols-2">
        {rows.map(([title, text]) => (
          <article key={title} className="rounded-xl bg-white p-6 text-[#1a1a1a]">
            <h3 className="text-2xl font-black text-[#1a2a6c]">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#555]">{text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function CleanDetailCertificates() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="독보적 전문성, 압도적 품질" text="지속적인 기준 관리와 품질 개선으로 청소 서비스의 신뢰를 높입니다." />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {['품질 인증', '고객만족 인증', '친환경 장비', '전문 교육', '보험 안내', '현장 점검'].map((item) => (
            <div key={item} className="min-w-44 rounded-lg border border-[#e0e0e0] bg-white p-6 text-center font-bold text-[#1a2a6c]">{item}</div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CleanDetailStandards() {
  return (
    <section className="bg-[#f5f5f5] py-20">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="입주청소 서비스만의 기준과 품질" text="처음 입주하는 공간을 제대로 준비하기 위한 핵심 기준을 안내합니다." />
        <div className="grid gap-5 md:grid-cols-2">
          {cleanDetailStandards.map(([title, text], index) => (
            <article key={title} className="grid gap-5 rounded-xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:grid-cols-[3rem_1fr]">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1a2a6c] text-sm font-bold text-white">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-xl font-bold text-[#222]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#666]">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CleanDetailReviews() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="만족도 높은 서비스를 후기에서 확인하세요" text="현장점검과 실제 고객 후기를 함께 보여주는 정보형 구성입니다." />
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
          {cleanDetailReviews.map(([name, area, date, title], index) => (
            <article key={`${name}-${title}`} className="min-w-[260px] rounded-[10px] border border-[#e5e7eb] border-t-[#1a2a6c] border-t-[3px] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <span className="rounded bg-[#ff6600] px-2 py-1 text-[10px] font-bold text-white">{2800 + index}번째 현장점검</span>
              <h3 className="mt-4 text-base font-bold text-[#222]">{title}</h3>
              <p className="mt-3 line-clamp-4 text-sm leading-7 text-[#555]">공간별로 꼼꼼하게 확인해주셔서 입주 전 걱정을 줄일 수 있었습니다.</p>
              <p className="mt-4 text-xs text-[#888]">{name} · {area}</p>
              <p className="mt-1 text-xs text-[#aaa]">{date}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CleanDetailCostCta({ pageHref }: { pageHref: (slug: HomepagePageSlug) => string }) {
  return (
    <section className="bg-[linear-gradient(135deg,#1a2a6c,#2d4db5)] px-5 py-16 text-center text-white">
      <h2 className="text-3xl font-bold">우리집 청소비용이 궁금하다면</h2>
      <p className="mt-4 text-base leading-8 text-white/85">평형과 현장 상태에 따라 달라지는 비용을 상담으로 빠르게 확인하세요.</p>
      <a href={pageHref('contact')} className="mt-7 inline-flex rounded-lg bg-[#ff6600] px-9 py-4 text-base font-bold text-white hover:bg-[#e55a00]">비용 확인하기</a>
    </section>
  )
}

function CleanDetailProcess() {
  const rows = ['상담 안내', '예약 확정', '서비스 시작', '공간별 청소', '상태 확인', '후불 결제', '해피콜']
  return (
    <section className="bg-white py-20">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="시작부터 끝까지 꼼꼼하게" text="상담부터 사후 확인까지 단계별로 안내합니다." />
        <div className="grid gap-4 md:grid-cols-7">
          {rows.map((row, index) => (
            <div key={row} className="text-center">
              <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${index === 0 ? 'bg-[#ff6600]' : 'bg-[#1a2a6c]'}`}>0{index + 1}</span>
              <p className="mt-3 text-sm font-bold text-[#333]">{row}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CleanDetailScope() {
  return (
    <section className="bg-[#f5f5f5] py-20">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="공간별 청소 범위" text="고객이 궁금해하는 공간별 청소 항목을 한눈에 보여줍니다." />
        <div className="grid gap-5 md:grid-cols-2">
          {cleanDetailScopeRows.map(([title, items]) => (
            <article key={title as string} className="rounded-xl bg-white p-6">
              <h3 className="border-b-2 border-[#1a2a6c] pb-3 text-xl font-bold text-[#1a2a6c]">{title}</h3>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[#555]">
                {(items as string[]).map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CleanDetailPeopleTable() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto w-[min(800px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="전문 크린마스터가 방문합니다" />
        <table className="w-full border-collapse overflow-hidden rounded-xl border border-[#e0e0e0] text-center">
          <thead className="bg-[#1a2a6c] text-white">
            <tr><th className="p-4">평형기준</th><th className="p-4">인원기준</th></tr>
          </thead>
          <tbody>
            {[
              ['36평 이하', '2명'],
              ['52평 이하', '3명'],
              ['53평 이상', '4명'],
            ].map(([size, count], index) => (
              <tr key={size} className={index % 2 ? 'bg-[#f9f9f9]' : 'bg-white'}>
                <td className="border border-[#e0e0e0] p-4">{size}</td>
                <td className="border border-[#e0e0e0] p-4">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CleanDetailFaq() {
  return (
    <section className="bg-[#f5f5f5] py-20">
      <div className="mx-auto w-[min(900px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="자주 묻는 질문을 알려드립니다" text="더 궁금하신 점은 언제든 문의해주세요. ☎ 0000-0000" />
        <div className="space-y-3">
          {cleanDetailFaqRows.map(([question, answer], index) => (
            <article key={question} className="overflow-hidden rounded-[10px] border border-[#e0e0e0]">
              <h3 className={`p-5 text-base font-semibold ${index === 0 ? 'bg-[#f0f4ff] text-[#1a2a6c]' : 'bg-white text-[#333]'}`}>Q. {question}</h3>
              {index === 0 && <p className="bg-[#fafafa] p-5 text-sm leading-8 text-[#555]">{answer}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CleanDetailRelated() {
  const rows = ['포장이사', '새집증후군', '프리미엄청소', '에어컨 청소', '세탁기 청소', '마루코팅', '상판코팅', '줄눈시공']
  return (
    <section className="bg-white py-20">
      <div className="mx-auto w-[min(1120px,calc(100%-32px))]">
        <CleanDetailSectionHeader title="따로 알아보는 번거로움 없이 모두 가능합니다" />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {rows.map((row) => (
            <article key={row} className="rounded-[10px] border border-[#e0e0e0] bg-white p-5 text-center font-bold text-[#333] transition hover:border-[#1a2a6c] hover:bg-[#f0f4ff]">{row}</article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CleanDetailContact({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  return (
    <section className="bg-[#1a2a6c] px-5 py-20 text-center text-white">
      <h1 className="text-4xl font-bold">입주청소 견적이 필요하신가요?</h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/80">평형, 주소, 희망일정을 알려주시면 상담 기준에 맞춰 안내드립니다.</p>
      <p className="mt-6 text-2xl font-black">{site.phone || '0000-0000'}</p>
      <a href={`tel:${site.phone || '0000-0000'}`} className="mt-8 inline-flex rounded-lg bg-[#ff6600] px-10 py-4 text-base font-bold text-white">간편견적 신청하기</a>
    </section>
  )
}

function CleanDetailFooter({ data }: { data: HomepagePublicPackage }) {
  const { site } = data
  return (
    <footer className="bg-[#1a1a2e] text-[#cccccc]">
      <div className="mx-auto grid w-[min(1120px,calc(100%-32px))] gap-10 py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-black text-white">{site.business_name || '클린홈 프로'}</p>
          <p className="mt-5 text-sm leading-7">대표: 홍길동<br />사업자번호: 000-00-00000<br />주소: {site.footer_address || site.address}</p>
          <p className="mt-5 text-sm leading-7">전화: {site.footer_phone || site.phone} | FAX: 000-0000-0000</p>
        </div>
        <div>
          <p className="mb-3 font-bold text-white">청소 서비스</p>
          {['입주청소', '이사청소', '프리미엄청소', '가전청소'].map((item) => <p key={item} className="text-sm leading-7">{item}</p>)}
        </div>
        <div>
          <p className="mb-3 font-bold text-white">고객지원</p>
          {['FAQ', '견적문의', '후기', '계약 유의사항'].map((item) => <p key={item} className="text-sm leading-7">{item}</p>)}
        </div>
      </div>
      <div className="mx-auto flex w-[min(1120px,calc(100%-32px))] flex-wrap justify-between gap-3 border-t border-white/10 py-5 text-xs">
        <span>개인정보처리방침 | 서비스 이용약관</span>
        <span>© CleanHome Pro. All Rights Reserved.</span>
      </div>
    </footer>
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
  const general = isGeneralPreviewSite(site)
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
      <TrustStrip palette={palette} general={general} />
      <ServicesPage compact showEstimateCta={secondaryCalculator} pageHref={pageHref} palette={palette} general={general} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} general={general} />
      <ProcessSection palette={palette} compact general={general} />
      <ReviewsPage compact palette={palette} general={general} />
      <HomepageFaqSection palette={palette} general={general} />
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
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} general={isGeneralPreviewSite(site)} />
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
                평수와 서비스만 차례대로 선택하면 우리집 예상 견적을 바로 확인할 수 있습니다.
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
                걱정되는 공간을 먼저 고르면 필요한 청소 범위와 예상 비용을 쉽게 확인할 수 있습니다.
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
                <p className="text-sm font-black text-[#c2410c]">추천 결과</p>
                <p className="mt-2 text-3xl font-black text-[#2b160d]">입주청소 + 창틀 집중관리</p>
                <p className="mt-2 text-sm leading-6 text-[#73513e]">선택한 상태에 맞춰 필요한 청소 범위와 예상 비용을 안내합니다.</p>
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
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} general={isGeneralPreviewSite(site)} />
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
  const general = isGeneralPreviewSite(site)

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
      <ReviewsPage compact palette={palette} general={general} />
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
  const general = isGeneralPreviewSite(site)

  return (
    <>
      <LocalHero data={data} pageHref={pageHref} palette={palette} />
      <LocalAreaTrust site={site} palette={palette} />
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} general={general} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '우리 동네 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} general={general} />
      <ReviewsPage compact palette={palette} general={general} />
      <HomepageFaqSection palette={palette} general={general} />
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
  const general = isGeneralPreviewSite(site)

  return (
    <>
      <SalesReviewsHero data={data} pageHref={pageHref} palette={palette} />
      <AfterPhotoSliderSection palette={palette} mediaItems={data.mediaItems} general={general} />
      <ReviewsPage compact palette={palette} title="후기" general={general} />
      <SalesPricingSection palette={palette} general={general} />
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} general={general} />
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} general={general} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <HomepageFaqSection palette={palette} general={general} />
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
  const general = isGeneralPreviewSite(site)

  return (
    <>
      <SalesPriceHero data={data} palette={palette} />
      <SalesLargePriceTable palette={palette} general={general} />
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} general={general} />
      <ReviewsPage compact palette={palette} title="후기" general={general} />
      <ServicesPage compact showEstimateCta={false} pageHref={pageHref} palette={palette} general={general} />
      <HomepageFaqSection palette={palette} general={general} />
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
  const general = isGeneralPreviewSite(site)

  return (
    <>
      <SalesUrgentHero data={data} palette={palette} />
      <ReservationStatusSection palette={palette} />
      <ReviewsPage compact palette={palette} title="후기" general={general} />
      <BeforeAfterSection palette={palette} usePreviewImages={usePreviewImages} mediaItems={data.mediaItems} general={general} />
      {blogPosts.length > 0 && (
        <PortfolioSection compact palette={palette} siteTitle={site.portfolio_title || '최근 현장 사례'} posts={blogPosts.slice(0, 3)} mediaItems={data.mediaItems} />
      )}
      <HomepageFaqSection palette={palette} general={general} />
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
  const general = isGeneralPreviewSite(site)
  const metricRows = general
    ? [
        ['상담', '빠르게'],
        ['기준', '범위 안내'],
        ['사례', '사진 확인'],
      ]
    : [
        ['상담', '1분'],
        ['견적', '3분'],
        ['기준', '평당 15,000원~'],
      ]

  return (
    <section className="homepage-hero-section hp-section hp-surface border-b border-black/10">
      <div className="hp-container grid gap-8 lg:grid-cols-[1fr_0.78fr] lg:items-center">
        <div>
          <p className={`homepage-label mb-4 inline-flex rounded-full ${palette.accent} px-4 py-2 text-xs font-black uppercase ${palette.accentText}`}>
            {site.name}
          </p>
          <h1 className="hp-display font-black">{general ? site.headline : '입주청소 평당 15,000원~'}</h1>
          <p className="hp-copy mt-6 max-w-2xl">{site.subheadline}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {site.phone && <a href={`tel:${site.phone}`} className="hp-cta hp-primary min-h-16 text-lg">전화하기</a>}
            {site.kakao_url && <a href={site.kakao_url} className="hp-cta min-h-16 bg-yellow-300 text-lg text-gray-950">카톡상담</a>}
          </div>
        </div>
        <div className="grid gap-3">
          {metricRows.map(([label, value]) => (
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
  const general = isGeneralPreviewSite(site)
  const priceRows = general
    ? [
        ['줄눈', '욕실 1칸~'],
        ['목공', '품목별 상담'],
        ['인테리어', '범위별 안내'],
      ]
    : [
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
          <h1 className="hp-display font-black text-[#0b1f33]">{general ? site.headline : '가격이 먼저 보이는 청소'}</h1>
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

function SalesLargePriceTable({ palette, general = false }: { palette: HomepagePalette; general?: boolean }) {
  const priceRows = general
    ? [
        ['줄눈시공', '범위별 안내', '욕실, 주방, 베란다 등 시공 부위 기준'],
        ['목공시공', '품목별 상담', '선반, 붙박이장, 몰딩 등 제작 범위 기준'],
        ['인테리어', '현장별 안내', '부분 공사, 상가, 주거공간 범위 기준'],
      ]
    : [
        ['원룸', '15만원~', '소형 주거공간 기준'],
        ['20평', '30만원~', '가장 많이 문의하는 기준'],
        ['30평', '42만원~', '방/욕실 구조에 따라 변동'],
      ]

  return (
    <section className="hp-section bg-[linear-gradient(180deg,#ffffff,#f4f9ff)]">
      <div className="hp-container">
        <div className="mb-6">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Price table</p>
          <h2 className="hp-title mt-3 font-black">{general ? '시공 기준을 먼저 안내합니다' : '가격표를 숨기지 않습니다'}</h2>
        </div>
        <div className="grid gap-4">
          {priceRows.map(([label, price, text]) => (
            <div key={label} className="grid gap-5 border border-[#d6e6f7] bg-white p-6 shadow-[0_24px_70px_rgba(30,58,95,0.08)] sm:grid-cols-[0.3fr_0.5fr_1fr] sm:items-center">
              <p className="text-2xl font-black text-[#1e3a5f]">{label}</p>
              <p className="text-5xl font-black leading-none text-[#0b1f33] sm:text-6xl">{price}</p>
              <div>
                <p className="text-sm leading-7 text-gray-600">{text}</p>
                <p className="mt-2 text-xs font-bold text-[#506578]">
                  {general ? '정확한 비용은 현장 상태와 시공 범위 확인 후 안내합니다.' : '정확한 비용은 평수, 구조, 오염도 확인 후 안내합니다.'}
                </p>
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
  const general = isGeneralPreviewSite(site)
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
          <h1 className="max-w-lg text-6xl font-black leading-[0.92] tracking-[-0.07em] sm:text-7xl">
            {general ? site.headline : '당일 상담 가능'}
          </h1>
          <p className="mt-6 max-w-lg text-lg font-medium leading-9 text-white/68">
            {general
              ? '현장 사진과 시공 범위를 보내주시면 가능한 상담 일정부터 빠르게 안내합니다.'
              : '급한 일정은 빠른 확인이 중요합니다. 사진과 평수만 보내주시면 가능한 시간부터 안내합니다.'}
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
  general = false,
}: {
  palette: HomepagePalette
  mediaItems?: HomepagePublicPackage['mediaItems']
  general?: boolean
}) {
  const managedPhotos = mediaItems.filter((item) => item.item_type === 'after_photo' || item.item_type === 'gallery')
  const afterPhotos = managedPhotos.length
    ? managedPhotos.slice(0, 8).map((item) => ({ src: item.image_url, title: item.title || (general ? '시공 완료 사진' : '청소 완료 사진'), alt: item.alt_text || item.title || '' }))
    : HOMEPAGE_PREVIEW_IMAGES.slice(4, 9).map((src) => ({ src, title: general ? '시공 완료 사진' : '청소 완료 사진', alt: '' }))

  return (
    <section className="bg-white">
      <div className="hp-container py-5">
        <div className={`overflow-hidden border-y ${palette.border} py-5`}>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className={`homepage-label text-xs font-black uppercase ${palette.accentText}`}>
                {general ? 'Completed work' : 'After clean'}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {general ? '시공 후 사진으로 먼저 확인하세요' : '청소 후 사진으로 먼저 확인하세요'}
              </h2>
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

function SalesPricingSection({ palette, general = false }: { palette: HomepagePalette; general?: boolean }) {
  const prices = general
    ? [
        ['줄눈', '욕실 1칸 기준'],
        ['목공', '품목별 상담'],
        ['인테리어', '범위별 안내'],
      ]
    : [
        ['원룸', '평당 15,000원~'],
        ['20평대', '평당 15,000원~'],
        ['30평대', '평당 14,000원~'],
      ]

  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
        <div className="mb-6">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Expected cost</p>
          <h2 className="hp-title mt-3 font-black">{general ? '시공 기준을 먼저 확인하세요' : '예상비용을 먼저 확인하세요'}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {prices.map(([label, price]) => (
            <article key={label} className="border border-black/10 bg-white p-6">
              <p className={`text-sm font-black ${palette.accentText}`}>{label}</p>
              <p className="mt-4 text-3xl font-black">{price}</p>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {general ? '현장 상태와 시공 범위에 따라 최종 비용은 달라질 수 있습니다.' : '현장 구조와 오염도에 따라 최종 견적은 달라질 수 있습니다.'}
              </p>
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
  const general = isGeneralPreviewSite(site)
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
              {site.name}
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
            <p className="homepage-label mb-5 text-xs font-black uppercase opacity-70">{site.name}</p>
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
        <HeroCopy site={site} templateName={site.name} palette={palette} ctaHref={ctaHref} ctaLabel={ctaLabel} />
        <SceneMosaic palette={palette} usePreviewImages={site.slug?.startsWith('preview-')} general={general} />
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

function SceneMosaic({
  palette,
  usePreviewImages = false,
  general = false,
}: {
  palette: HomepagePalette
  usePreviewImages?: boolean
  general?: boolean
}) {
  const scenes = general ? generalScenes : cleaningScenes
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5">
      {scenes.map(([tag, title, text], index) => (
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

function TrustStrip({ palette, general = false }: { palette: HomepagePalette; general?: boolean }) {
  const rows = general
    ? ['시공 전후 확인', '지역 기반 상담', '시공 범위 안내', '현장 일정 조율']
    : ['전후 사진 확인', '지역 기반 상담', '추가 비용 기준 안내', '입주/이사 일정 대응']

  return (
    <section className="border-y border-black/10 bg-white">
      <div className="hp-container grid gap-4 py-5 text-sm font-black text-gray-700 sm:grid-cols-4">
        {rows.map((item) => (
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
  general = false,
}: {
  palette: HomepagePalette
  usePreviewImages?: boolean
  mediaItems?: HomepagePublicPackage['mediaItems']
  general?: boolean
}) {
  const managedScenes = mediaItems.filter((item) => item.item_type === 'before_after' || item.item_type === 'gallery')
  const fallbackScenes = general ? generalScenes : cleaningScenes
  const rows = managedScenes.length
    ? managedScenes.slice(0, 4).map((item, index) => [
        index % 2 === 0 ? 'Before' : 'After',
        item.title || '현장 사진',
        item.description || (general ? '현장에서 확인한 시공 사진입니다.' : '현장에서 확인한 청소 사진입니다.'),
        item.image_url,
        item.alt_text || item.title || '',
      ])
    : fallbackScenes.map(([tag, title, text], index) => [
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
            {general ? '시공은 결과물로 먼저 보여야 합니다' : '청소는 말보다 전후 차이가 먼저 보여야 합니다'}
          </h2>
          <p className="hp-copy mt-5">
            {general
              ? '시공 전후, 마감 디테일, 현장 결과를 사진 중심으로 보여줍니다.'
              : '창틀, 욕실, 주방, 바닥처럼 고객이 가장 많이 확인하는 구역을 전후 사진 중심으로 보여줍니다.'}
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
  const general = isGeneralPreviewSite(site)
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
  const general = isGeneralPreviewSite(site)
  return (
    <section className="hp-section pt-0">
      <div className="hp-container">
        <div className="grid gap-6 border-t border-black/10 pt-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className={`homepage-label text-xs font-black uppercase ${palette.accentText}`}>
              {general ? 'Ready to work' : 'Ready to clean'}
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
              {general ? '시공 상담, 지금 바로 확인하세요' : '청소 일정, 지금 바로 확인하세요'}
            </h2>
            <p className="hp-copy mt-4 max-w-2xl">
              {general ? '현장 위치와 필요한 시공 범위를 알려주시면 가능한 일정과 상담 내용을 빠르게 안내합니다.' : '평수와 현장 상태를 알려주시면 가능한 일정과 예상 비용을 빠르게 안내합니다.'}
            </p>
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
  general = false,
}: {
  compact?: boolean
  showEstimateCta: boolean
  pageHref: (slug: HomepagePageSlug) => string
  palette: HomepagePalette
  general?: boolean
}) {
  const cards = general
    ? [
        ['줄눈/타일 시공', '욕실, 주방, 베란다처럼 사용 빈도가 높은 공간의 마감 상태를 정리합니다.'],
        ['목공/맞춤 제작', '선반, 수납장, 몰딩, 문틀처럼 공간에 맞는 제작과 설치를 상담합니다.'],
        ['인테리어/부분 공사', '상가, 주거공간, 부분 보수처럼 현장 범위에 맞춰 시공을 안내합니다.'],
      ]
    : serviceCards

  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Our service</p>
          <h1 className="hp-title mt-3 font-black">{general ? '필요한 시공을 쉽게 선택하세요' : '필요한 청소를 쉽게 선택하세요'}</h1>
        </div>
        {showEstimateCta && (
          <a href={pageHref('estimate')} className="hp-cta hp-dark hidden text-sm sm:inline-flex">
            견적 계산하기
          </a>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map(([title, text], index) => (
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
  general = false,
}: {
  compact?: boolean
  palette: HomepagePalette
  title?: string
  general?: boolean
}) {
  const cards = general ? generalReviewCards : reviewCards
  const visibleReviews = cards.slice(0, compact ? 3 : cards.length)
  const sectionTitle = title === '믿고 맡길 수 있는 청소' && general ? '믿고 맡길 수 있는 시공' : title

  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>Reviews</p>
            <h1 className="hp-title mt-3 font-black">{sectionTitle}</h1>
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

function HomepageFaqSection({ palette, general = false }: { palette: HomepagePalette; general?: boolean }) {
  const rows = general ? generalFaqRows : faqRows

  return (
    <section className="hp-section hp-surface">
      <div className="hp-container">
        <div className="mb-6">
          <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>FAQ</p>
          <h2 className="hp-title mt-3 font-black">자주 묻는 질문</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {rows.map(([question, answer]) => (
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

function ProcessSection({
  palette,
  compact = false,
  general = false,
}: {
  palette: HomepagePalette
  compact?: boolean
  general?: boolean
}) {
  const processRows = general
    ? [
        ['01', '상담 및 현장 확인', '위치, 시공 범위, 일정, 현장 상태를 먼저 확인합니다.'],
        ['02', '범위 및 기준 안내', '자재, 면적, 제작 품목 기준으로 상담 내용을 안내합니다.'],
        ['03', '시공 진행', '현장 조건에 맞춰 마감과 디테일을 확인하며 작업합니다.'],
        ['04', '완료 사진 확인', '시공 전후 사진으로 완료 상태를 확인합니다.'],
      ]
    : [
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
          <h2 className="hp-title mt-3 font-black">
            {general ? '시공은 과정이 명확해야 결과가 깔끔합니다' : '청소는 순서가 명확해야 결과가 깔끔합니다'}
          </h2>
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

function FaqPage({ palette, general = false }: { palette: HomepagePalette; general?: boolean }) {
  const rows = general ? generalFaqRows : faqRows

  return (
    <section className="hp-section">
      <div className="mx-auto max-w-4xl px-4">
      <p className={`homepage-label text-sm font-bold uppercase ${palette.accentText}`}>FAQ</p>
      <h1 className="hp-title mt-3 font-black">자주 묻는 질문</h1>
      <div className="mt-6 space-y-3">
        {rows.map(([question, answer]) => (
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
        <p className="mt-2 text-sm text-gray-600">실제 현장 사례와 작업 사진을 확인해보세요.</p>
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
