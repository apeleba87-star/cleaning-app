import { notFound } from 'next/navigation'
import PublicHomepage from '@/components/homepage/PublicHomepage'
import { getHomepagePublicPackageBySlug } from '@/lib/homepage/server'
import { normalizeHomepagePageSlug } from '@/lib/homepage/templates'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: { tenantSlug: string; pageSlug: string }
}) {
  const data = await getHomepagePublicPackageBySlug(params.tenantSlug).catch(() => null)
  if (!data) return {}
  const page = normalizeHomepagePageSlug(params.pageSlug, data.site.template_key)
  const site = data.site
  return {
    title: `${page === 'home' ? site.seo_title || site.name : page} | ${site.name}`,
    description: site.seo_description || site.subheadline,
  }
}

export default async function TenantSlugHomepageSubPage({
  params,
}: {
  params: { tenantSlug: string; pageSlug: string }
}) {
  const data = await getHomepagePublicPackageBySlug(params.tenantSlug).catch(() => null)
  if (!data) notFound()
  const page = normalizeHomepagePageSlug(params.pageSlug, data.site.template_key)
  if (page === 'home' && params.pageSlug !== 'home') notFound()
  return <PublicHomepage data={data} page={page} />
}
