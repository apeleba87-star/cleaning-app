import { notFound } from 'next/navigation'
import PalettePreviewSwitcher from '@/components/homepage/PalettePreviewSwitcher'
import PublicHomepage from '@/components/homepage/PublicHomepage'
import { createHomepagePreviewPackage, HOMEPAGE_PREVIEW_TEMPLATE_KEYS } from '@/lib/homepage/mock'

export default function HomepageTemplatePreviewPage({
  params,
  searchParams,
}: {
  params: { templateKey: string }
  searchParams?: { palette?: string; embed?: string }
}) {
  if (!HOMEPAGE_PREVIEW_TEMPLATE_KEYS.includes(params.templateKey as any)) notFound()
  const data = createHomepagePreviewPackage(params.templateKey, searchParams?.palette as any)
  if (searchParams?.embed === '1') {
    data.site.slug = `embed-${params.templateKey}`
  }

  return (
    <>
      {searchParams?.embed !== '1' && (
        <PalettePreviewSwitcher templateKey={params.templateKey} currentPalette={searchParams?.palette} />
      )}
      <PublicHomepage data={data} page="home" />
    </>
  )
}
