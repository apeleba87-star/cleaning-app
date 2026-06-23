import Link from 'next/link'
import { HOMEPAGE_TEMPLATES } from '@/lib/homepage/templates'

const CATEGORY_SECTIONS = [
  {
    key: 'showcase',
    label: '전시형',
    eyebrow: 'Showcase',
  },
  {
    key: 'sales',
    label: '영업형',
    eyebrow: 'Sales',
  },
  {
    key: 'interactive',
    label: '참여형',
    eyebrow: 'Interactive',
  },
] as const

type CategoryKey = (typeof CATEGORY_SECTIONS)[number]['key']

export default function HomepagePreviewIndexPage({
  searchParams,
}: {
  searchParams?: { category?: string }
}) {
  const activeCategory = CATEGORY_SECTIONS.some((section) => section.key === searchParams?.category)
    ? (searchParams?.category as CategoryKey)
    : null
  const visibleSections = activeCategory
    ? CATEGORY_SECTIONS.filter((section) => section.key === activeCategory)
    : CATEGORY_SECTIONS

  return (
    <main className="min-h-screen bg-[#f4f1eb] p-4 text-gray-950 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="border border-black/10 bg-white p-6 sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-gray-500">Homepage templates</p>
          <div className="mt-4">
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.075em] sm:text-7xl">홈페이지 템플릿</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600">
              원하는 유형을 선택해 디자인을 확인하세요.
            </p>
          </div>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 text-sm">
          <CategoryButton href="/homepage-preview" active={!activeCategory} label="전체" />
          {CATEGORY_SECTIONS.map((section) => (
            <CategoryButton
              key={section.key}
              href={`/homepage-preview?category=${section.key}`}
              active={activeCategory === section.key}
              label={section.label}
            />
          ))}
        </div>

        <div id="templates" className="space-y-12 pb-10">
          {visibleSections.map((section) => {
            const templates = HOMEPAGE_TEMPLATES.filter((template) => template.category === section.key)
            return (
              <section key={section.key} id={section.label} className="mt-8 scroll-mt-8">
                <div className="mb-4">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">{section.eyebrow}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">{section.label}</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {templates.map((template) => (
                    <TemplateCard key={template.key} template={template} />
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

function CategoryButton({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-4 py-2 font-black ${
        active ? 'border-gray-950 bg-gray-950 text-white' : 'border-black/10 bg-white text-gray-950'
      }`}
    >
      {label}
    </Link>
  )
}

function TemplateCard({ template }: {
  template: (typeof HOMEPAGE_TEMPLATES)[number]
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
            title={`${template.name} 디자인`}
            className="h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
        </div>
      </Link>
      <div className="p-5">
        <h2 className="text-xl font-black">{template.name}</h2>
        <div className="mt-5">
          <Link href={previewHref} className="rounded-xl bg-gray-950 px-3 py-3 text-center text-sm font-black text-white">
            전체 미리보기
          </Link>
        </div>
      </div>
    </article>
  )
}
