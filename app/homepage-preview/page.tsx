import Link from 'next/link'
import { getHomepagePalettes, HOMEPAGE_PAGE_LABELS, HOMEPAGE_TEMPLATES } from '@/lib/homepage/templates'

const CATEGORY_SECTIONS = [
  {
    key: 'showcase',
    label: '전시형',
    eyebrow: 'Showcase',
    description: '업체 소개, 신뢰 요소, 현장 사례, 사진을 차분하게 보여주는 홈페이지입니다.',
  },
  {
    key: 'sales',
    label: '영업형',
    eyebrow: 'Sales',
    description: '후기, 가격, 전화/카카오톡 문의처럼 전환에 필요한 요소를 앞쪽에 배치합니다.',
  },
  {
    key: 'interactive',
    label: '참여형',
    eyebrow: 'Interactive',
    description: '고객이 평수와 조건을 입력하며 견적을 확인하고 상담으로 이어지는 구조입니다.',
  },
] as const

const CATEGORY_LABELS = {
  showcase: '전시형',
  sales: '영업형',
  interactive: '참여형',
} as const

export default function HomepagePreviewIndexPage() {
  return (
    <main className="min-h-screen bg-[#f4f1eb] p-4 text-gray-950 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="border border-black/10 bg-white p-6 sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-gray-500">Homepage templates</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.075em] sm:text-7xl">홈페이지 템플릿</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600">
                전시형, 영업형, 참여형으로 나누어 고객이 목적에 맞는 홈페이지 구조를 바로 비교할 수 있게 정리했습니다. 각 템플릿은 실제 미리보기 화면으로 확인할 수 있습니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <GalleryStat value="9" label="템플릿" />
              <GalleryStat value="3" label="카테고리" />
              <GalleryStat value="LIVE" label="미리보기" />
            </div>
          </div>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 text-sm">
          {['전시형', '영업형', '참여형', '실제 미리보기', '모바일 최적화'].map((label) => (
            <a key={label} href={label.endsWith('형') ? `#${label}` : '#templates'} className="shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 font-black">
              {label}
            </a>
          ))}
        </div>

        <div id="templates" className="space-y-12 pb-10">
          {CATEGORY_SECTIONS.map((section) => {
            const templates = HOMEPAGE_TEMPLATES.filter((template) => template.category === section.key)
            return (
              <section key={section.key} id={section.label} className="mt-8 scroll-mt-8">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">{section.eyebrow}</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">{section.label}</h2>
                  </div>
                  <p className="hidden max-w-md text-right text-sm leading-6 text-gray-500 sm:block">{section.description}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {templates.map((template, index) => (
                    <TemplateCard key={template.key} template={template} index={index} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}

function TemplateCard({
  template,
  index,
}: {
  template: (typeof HOMEPAGE_TEMPLATES)[number]
  index: number
}) {
  const previewHref = `/homepage-preview/${template.key}`

  return (
    <article
      data-cursor="active"
      className="group overflow-hidden border border-black/10 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
    >
      <Link href={previewHref} className="block bg-[#ebe7df] p-3">
        <div className="relative aspect-[4/3] overflow-hidden border border-black/10 bg-white">
          <iframe
            src={`/homepage-preview/${template.key}?embed=1`}
            title={`${template.name} 미리보기`}
            className="h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black shadow-sm backdrop-blur">
            {CATEGORY_LABELS[template.category]} {String(index + 1).padStart(2, '0')}
          </div>
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">{CATEGORY_LABELS[template.category]}</p>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">{template.pages.length}페이지</span>
        </div>
        <h2 className="mt-2 text-xl font-black">{template.name}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{template.description}</p>
        <div className="mt-4 flex flex-wrap gap-1">
          {template.pages.map((page) => (
            <span key={page} className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600">
              {HOMEPAGE_PAGE_LABELS[page]}
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-4 gap-1">
          {Object.values(getHomepagePalettes(template.key)).map((palette) => (
            <span
              key={palette.key}
              className={`rounded-full px-2 py-1 text-center text-[10px] font-bold ${palette.accent} ${palette.accentText}`}
            >
              {palette.name}
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href={previewHref} className="rounded-xl bg-gray-950 px-3 py-3 text-center text-sm font-black text-white">
            전체 미리보기
          </Link>
          <Link href={previewHref} className="rounded-xl border border-black/10 px-3 py-3 text-center text-sm font-black">
            홈 보기
          </Link>
        </div>
      </div>
    </article>
  )
}

function GalleryStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-black/10 bg-gray-50 p-4 text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-gray-500">{label}</p>
    </div>
  )
}
