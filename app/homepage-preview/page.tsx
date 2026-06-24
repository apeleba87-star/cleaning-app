import Link from 'next/link'
import { HOMEPAGE_TEMPLATES } from '@/lib/homepage/templates'

type AudienceKey = 'cleaning' | 'general' | 'silver'

export default function HomepagePreviewIndexPage({
  searchParams,
}: {
  searchParams?: { audience?: string }
}) {
  const audience: AudienceKey = searchParams?.audience === 'general' ? 'general' : searchParams?.audience === 'silver' ? 'silver' : 'cleaning'
  const visibleTemplates = HOMEPAGE_TEMPLATES.filter((template) => {
    if (audience === 'silver') return template.category === 'silver'
    if (audience === 'general') return template.category !== 'interactive' && template.category !== 'silver'
    return template.category !== 'silver'
  })

  return (
    <main className="min-h-screen bg-[#f4f1eb] p-4 text-gray-950 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="border border-black/10 bg-white p-6 sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-gray-500">
            {audience === 'silver' ? 'Silver care templates' : audience === 'general' ? 'Field service templates' : 'Homepage templates'}
          </p>
          <div className="mt-4">
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.075em] sm:text-7xl">
              {audience === 'silver' ? '실버 템플릿' : audience === 'general' ? '범용 현장업 템플릿' : '홈페이지 템플릿'}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600">
              {audience === 'silver'
                ? '주간보호센터, 데이케어센터처럼 보호자 상담과 신뢰 안내가 중요한 업종을 위한 템플릿입니다.'
                : audience === 'general'
                ? '줄눈시공, 인테리어, 목공, 타일처럼 현장 사례가 중요한 업종에 맞춘 템플릿입니다.'
                : '원하는 디자인을 확인하세요.'}
            </p>
          </div>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 text-sm">
          <CategoryButton href="/homepage-preview" active={audience === 'cleaning'} label="청소업 템플릿" />
          <CategoryButton href="/homepage-preview?audience=general" active={audience === 'general'} label="범용 현장업" />
          <CategoryButton href="/homepage-preview?audience=silver" active={audience === 'silver'} label="실버" />
        </div>

        <div id="templates" className="grid gap-4 py-8 md:grid-cols-2 xl:grid-cols-3">
          {visibleTemplates.map((template, index) => (
            <TemplateCard
              key={template.key}
              template={template}
              audience={audience}
              index={index}
            />
          ))}
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

function TemplateCard({ template, audience, index }: {
  template: (typeof HOMEPAGE_TEMPLATES)[number]
  audience: AudienceKey
  index: number
}) {
  const audienceQueryValue = audience === 'cleaning' ? '' : `?audience=${audience}`
  const embedQuery = audience === 'cleaning' ? '?embed=1' : `?embed=1&audience=${audience}`
  const previewHref = `/homepage-preview/${template.key}${audienceQueryValue}`
  const title = `템플릿${index + 1}`

  return (
    <article
      data-cursor="active"
      className="group overflow-hidden border border-black/10 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
    >
      <Link href={previewHref} className="block bg-[#ebe7df] p-3">
        <div className="relative aspect-[4/3] overflow-hidden border border-black/10 bg-white">
          <iframe
            src={`/homepage-preview/${template.key}${embedQuery}`}
            title={`${title} 화면 미리보기`}
            className="pointer-events-none h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
            loading="lazy"
            sandbox="allow-same-origin"
            tabIndex={-1}
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
        </div>
      </Link>
      <div className="p-5">
        <h2 className="text-xl font-black">{title}</h2>
        <div className="mt-5">
          <Link href={previewHref} className="rounded-xl bg-gray-950 px-3 py-3 text-center text-sm font-black text-white">
            전체 미리보기
          </Link>
        </div>
      </div>
    </article>
  )
}
