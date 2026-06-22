import { notFound } from 'next/navigation'
import PublicHomepage from '@/components/homepage/PublicHomepage'
import { getHomepagePublicPackageByDomain, normalizeDomain } from '@/lib/homepage/server'

export const revalidate = 60

export async function generateMetadata({ params }: { params: { domain: string } }) {
  const data = await getHomepagePublicPackageByDomain(normalizeDomain(decodeURIComponent(params.domain))).catch(() => null)
  if (!data) return {}
  const site = data.site
  return {
    title: site.seo_title || site.headline || site.name,
    description: site.seo_description || site.subheadline,
    openGraph: {
      title: site.seo_title || site.headline || site.name,
      description: site.seo_description || site.subheadline,
      images: site.hero_image_url ? [site.hero_image_url] : [],
    },
  }
}

export default async function HomepageDomainPage({ params }: { params: { domain: string } }) {
  const data = await getHomepagePublicPackageByDomain(normalizeDomain(decodeURIComponent(params.domain))).catch(() => null)
  if (!data) notFound()
  return <PublicHomepage data={data} page="home" />
}
