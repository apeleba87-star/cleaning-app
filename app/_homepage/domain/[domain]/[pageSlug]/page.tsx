import { notFound } from 'next/navigation'
import PublicHomepage from '@/components/homepage/PublicHomepage'
import { getHomepagePublicPackageByDomain, normalizeDomain } from '@/lib/homepage/server'
import { normalizeHomepagePageSlug } from '@/lib/homepage/templates'

export const revalidate = 60

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
