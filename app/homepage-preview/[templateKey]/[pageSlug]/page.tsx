import { notFound } from 'next/navigation'
import PalettePreviewSwitcher from '@/components/homepage/PalettePreviewSwitcher'
import PublicHomepage from '@/components/homepage/PublicHomepage'
import { createHomepagePreviewPackage, HOMEPAGE_PREVIEW_TEMPLATE_KEYS } from '@/lib/homepage/mock'
import { normalizeHomepagePageSlug } from '@/lib/homepage/templates'

export default function HomepageTemplatePreviewSubPage({
  params,
  searchParams,
}: {
  params: { templateKey: string; pageSlug: string }
  searchParams?: { palette?: string; audience?: string }
}) {
  if (!HOMEPAGE_PREVIEW_TEMPLATE_KEYS.includes(params.templateKey as any)) notFound()
  const audience = searchParams?.audience === 'general' ? 'general' : searchParams?.audience === 'silver' ? 'silver' : 'cleaning'
  const data = createHomepagePreviewPackage(params.templateKey, searchParams?.palette as any, audience)
  const page = normalizeHomepagePageSlug(params.pageSlug, data.site.template_key)
  if (page === 'home' && params.pageSlug !== 'home') notFound()
  return (
    <>
      <PalettePreviewSwitcher
        templateKey={params.templateKey}
        currentPalette={searchParams?.palette}
        pageSlug={params.pageSlug}
        audience={audience}
      />
      <PublicHomepage data={data} page={page} />
    </>
  )
}
