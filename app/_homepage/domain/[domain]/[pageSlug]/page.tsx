import { notFound } from 'next/navigation'
import PublicHomepage from '@/components/homepage/PublicHomepage'
import { getHomepagePublicPackageByDomain, normalizeDomain } from '@/lib/homepage/server'
import { normalizeHomepagePageSlug } from '@/lib/homepage/templates'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: { domain: string; pageSlug: string }
}) {
  const data = await getHomepagePublicPackageByDomain(normalizeDomain(decodeURIComponent(params.domain))).catch(
    () => null
  )
  if (!data) return {}
  const page = normalizeHomepagePageSlug(params.pageSlug, data.site.template_key)
  const site = data.site
  return {
    title: `${page === 'home' ? site.seo_title || site.name : page} | ${site.name}`,
    description: site.seo_description || site.subheadline,
    alternates: site.seo_canonical_url ? { canonical: site.seo_canonical_url } : undefined,
    robots: site.seo_noindex ? { index: false, follow: false } : undefined,
    verification: {
      google: site.seo_google_verification || undefined,
      other: site.seo_naver_verification ? { 'naver-site-verification': site.seo_naver_verification } : undefined,
    },
    openGraph: {
      title: site.seo_title || site.headline || site.name,
      description: site.seo_description || site.subheadline,
      images: site.seo_og_image_url || site.hero_image_url ? [site.seo_og_image_url || site.hero_image_url] : [],
    },
  }
}

export default async function HomepageDomainSubPage({
  params,
}: {
  params: { domain: string; pageSlug: string }
}) {
  const data = await getHomepagePublicPackageByDomain(normalizeDomain(decodeURIComponent(params.domain))).catch(
    () => null
  )
  if (!data) notFound()
  const page = normalizeHomepagePageSlug(params.pageSlug, data.site.template_key)
  if (page === 'home' && params.pageSlug !== 'home') notFound()
  return <PublicHomepage data={data} page={page} />
}
