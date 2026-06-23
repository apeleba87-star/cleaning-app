import { notFound } from 'next/navigation'
import PublicHomepage from '@/components/homepage/PublicHomepage'
import { getHomepagePublicPackageBySlug } from '@/lib/homepage/server'

export const revalidate = 60

export async function generateMetadata({ params }: { params: { tenantSlug: string } }) {
  const data = await getHomepagePublicPackageBySlug(params.tenantSlug).catch(() => null)
  if (!data) return {}
  const site = data.site
  return {
    title: site.seo_title || site.headline || site.name,
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

export default async function TenantSlugHomepagePage({ params }: { params: { tenantSlug: string } }) {
  const data = await getHomepagePublicPackageBySlug(params.tenantSlug).catch(() => null)
  if (!data) notFound()
  return <PublicHomepage data={data} page="home" />
}
