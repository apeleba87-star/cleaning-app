import Link from 'next/link'
import { getHomepagePalettes, HOMEPAGE_PAGE_LABELS, HOMEPAGE_TEMPLATES } from '@/lib/homepage/templates'

const REPRESENTATIVE_TEMPLATE_KEYS = ['showcase-basic', 'sales-reviews', 'interactive-calculator']

export default function HomepagePreviewIndexPage() {
  const representativeTemplates = HOMEPAGE_TEMPLATES.filter((template) =>
    REPRESENTATIVE_TEMPLATE_KEYS.includes(template.key)
  )
  const additionalTemplates = HOMEPAGE_TEMPLATES.filter(
    (template) => !REPRESENTATIVE_TEMPLATE_KEYS.includes(template.key)
  )

  return (
    <main className="min-h-screen bg-[#f4f1eb] p-4 text-gray-950 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="border border-black/10 bg-white p-6 sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-gray-500">Premium templates</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.075em] sm:text-7xl">청소업체 홈페이지 컬렉션</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600">
                먼저 전시형, 영업형, 참여형 대표 디자인을 프리미엄 기준으로 정리했습니다. 색상보다 레이아웃과 첫인상이 다르게 보이도록 구성합니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <GalleryStat value="9" label="템플릿" />
              <GalleryStat value="6~7" label="페이지" />
              <GalleryStat value="LIVE" label="블로그" />
            </div>
          </div>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 text-sm">
          {['대표 3종 우선', '전시형', '영업형', '참여형', '모바일 최적화'].map((label) => (
            <span key={label} className="shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 font-black">
              {label}
            </span>
          ))}
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">Representative 3</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">대표 3종</h2>
            </div>
            <p className="hidden max-w-md text-right text-sm leading-6 text-gray-500 sm:block">
              전시형, 영업형, 참여형의 기준이 되는 우선 완성 템플릿입니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {representativeTemplates.map((template, index) => (
              <TemplateCard key={template.key} template={template} index={index} featured />
            ))}
          </div>
        </section>

        <section className="mt-10 pb-10">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">Additional templates</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">추가 템플릿 6종</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {additionalTemplates.map((template, index) => (
              <TemplateCard key={template.key} template={template} index={index + representativeTemplates.length} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function TemplateCard({
  template,
  index,
  featured = false,
}: {
  template: (typeof HOMEPAGE_TEMPLATES)[number]
  index: number
  featured?: boolean
}) {
  return (
    <Link
      href={`/homepage-preview/${template.key}`}
      data-cursor="active"
      className={`group overflow-hidden border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        featured ? 'border-gray-950' : 'border-black/10'
      }`}
    >
      <div className={`flex aspect-[4/3] items-center justify-center p-5 ${featured ? 'bg-gray-950' : 'bg-[#ebe7df]'}`}>
        <div className="w-full border border-black/10 bg-white p-4 transition group-hover:scale-[1.02]">
          <p className="text-xs font-black text-gray-500">
            {featured ? '대표' : 'NO'}
            {String(index + 1).padStart(2, '0')}
          </p>
          <div className="mt-8 h-3 w-24 bg-gray-950" />
          <div className="mt-5 grid grid-cols-[1fr_0.7fr] gap-3">
            <div className="h-24 bg-gray-100" />
            <div className="h-24 bg-gray-950" />
          </div>
          <div className="mt-3 h-2 w-full bg-gray-200" />
          <div className="mt-2 h-2 w-2/3 bg-gray-200" />
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">{template.category}</p>
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
        <p className="mt-5 text-sm font-black text-gray-950">디자인 확인하기</p>
      </div>
    </Link>
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
