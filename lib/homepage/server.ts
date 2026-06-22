import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DEFAULT_HOMEPAGE_CALCULATOR } from '@/lib/homepage/calculator'
import type {
  HomepageCalculatorSettings,
  HomepageDomain,
  HomepagePublicPackage,
  HomepageSite,
} from '@/types/homepage'

export class HomepageApiError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export class HomepageUnauthorizedError extends HomepageApiError {
  constructor(message = '로그인이 필요합니다.') {
    super(message, 401)
  }
}

export class HomepageForbiddenError extends HomepageApiError {
  constructor(message = '권한이 없습니다.') {
    super(message, 403)
  }
}

export function getHomepageAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service role configuration')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getHomepageAuthUserId() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getHomepageUser() {
  const userId = await getHomepageAuthUserId()
  if (!userId) return null

  const client = getHomepageAdminClient()
  const [{ data: v1User }, { data: v2User }] = await Promise.all([
    client.from('users').select('id, role, name, company_id').eq('id', userId).maybeSingle(),
    client.from('v2_users').select('id, role, name, company_id').eq('id', userId).maybeSingle(),
  ])

  const profile = v1User || v2User || { id: userId, role: 'homepage_owner', name: null, company_id: null }
  return { ...profile, id: userId }
}

export function homepageJson<T>(data: T, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers })
}

export function homepageErrorResponse(error: unknown) {
  if (error instanceof HomepageApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('[homepage]', error)
  return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
}

export function normalizeDomain(host: string | null | undefined) {
  return (host || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/:\d+$/, '')
    .replace(/^www\./, '')
    .trim()
}

export function sanitizeExternalUrl(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:', 'tel:'].includes(url.protocol)) return null
    return url.toString()
  } catch {
    return null
  }
}

export function sanitizeText(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.replace(/[<>]/g, '').trim().slice(0, maxLength)
}

export async function assertHomepageSiteAccess(siteId: string, write = false) {
  const user = await getHomepageUser()
  if (!user) throw new HomepageUnauthorizedError()

  const client = getHomepageAdminClient()
  const { data: member } = await client
    .from('homepage_admin_members')
    .select('role')
    .eq('site_id', siteId)
    .eq('user_id', user.id)
    .maybeSingle()

  const platformRoles = new Set(['admin', 'platform_admin'])
  const isPlatform = platformRoles.has(String(user.role))
  const canWrite = isPlatform || member?.role === 'owner' || member?.role === 'manager'
  const canRead = canWrite || member?.role === 'viewer'

  if (write ? !canWrite : !canRead) throw new HomepageForbiddenError()
  return { user, role: member?.role || (isPlatform ? 'platform_admin' : null) }
}

export async function listHomepageSitesForUser() {
  const user = await getHomepageUser()
  if (!user) throw new HomepageUnauthorizedError()
  const client = getHomepageAdminClient()

  if (['admin', 'platform_admin'].includes(String(user.role))) {
    const { data, error } = await client
      .from('homepage_sites')
      .select('*, homepage_domains(*)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data || []
  }

  const { data, error } = await client
    .from('homepage_admin_members')
    .select('role, homepage_sites(*, homepage_domains(*))')
    .eq('user_id', user.id)
  if (error) throw error

  return (data || []).map((row: any) => row.homepage_sites).filter(Boolean)
}

export async function getHomepageAdminPackage(siteId: string) {
  await assertHomepageSiteAccess(siteId)
  const client = getHomepageAdminClient()
  const [site, domains, calculator, blogSource, blogPosts, submissions] = await Promise.all([
    client.from('homepage_sites').select('*').eq('id', siteId).maybeSingle(),
    client.from('homepage_domains').select('*').eq('site_id', siteId).order('is_primary', { ascending: false }),
    client.from('homepage_calculator_settings').select('*').eq('site_id', siteId).maybeSingle(),
    client.from('homepage_blog_sources').select('*').eq('site_id', siteId).maybeSingle(),
    client
      .from('homepage_blog_posts')
      .select('*')
      .eq('site_id', siteId)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(20),
    client
      .from('homepage_estimate_submissions')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (site.error) throw site.error
  if (!site.data) throw new HomepageApiError('홈페이지를 찾을 수 없습니다.', 404)
  if (domains.error) throw domains.error
  if (calculator.error) throw calculator.error
  if (blogSource.error) throw blogSource.error
  if (blogPosts.error) throw blogPosts.error
  if (submissions.error) throw submissions.error

  return {
    site: site.data,
    domains: domains.data || [],
    calculator: calculator.data || null,
    blogSource: blogSource.data || null,
    blogPosts: blogPosts.data || [],
    submissions: submissions.data || [],
  }
}

async function loadHomepagePublicPackageBy(field: 'slug' | 'domain', value: string): Promise<HomepagePublicPackage | null> {
  const client = getHomepageAdminClient()
  let site: HomepageSite | null = null
  let domains: HomepageDomain[] = []

  if (field === 'domain') {
    const domain = normalizeDomain(value)
    const { data: domainRow, error } = await client
      .from('homepage_domains')
      .select('*, homepage_sites(*)')
      .eq('domain', domain)
      .eq('verified', true)
      .maybeSingle()
    if (error) throw error
    site = domainRow?.homepage_sites || null
  } else {
    const { data, error } = await client
      .from('homepage_sites')
      .select('*')
      .eq('slug', value)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw error
    site = data as HomepageSite | null
  }

  if (!site || site.status !== 'published') return null

  const [domainsResult, calculatorResult, blogPostsResult] = await Promise.all([
    client.from('homepage_domains').select('*').eq('site_id', site.id),
    client.from('homepage_calculator_settings').select('*').eq('site_id', site.id).eq('enabled', true).maybeSingle(),
    client
      .from('homepage_blog_posts')
      .select('id, site_id, title, url, summary, thumbnail_url, published_at, is_visible, is_pinned')
      .eq('site_id', site.id)
      .eq('is_visible', true)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(12),
  ])

  if (domainsResult.error) throw domainsResult.error
  if (calculatorResult.error) throw calculatorResult.error
  if (blogPostsResult.error) throw blogPostsResult.error
  domains = domainsResult.data || []

  const calculator = calculatorResult.data
    ? ({ ...DEFAULT_HOMEPAGE_CALCULATOR, ...calculatorResult.data } as HomepageCalculatorSettings)
    : null

  return {
    site,
    domains,
    calculator,
    blogPosts: blogPostsResult.data || [],
  }
}

export const getHomepagePublicPackageBySlug = unstable_cache(
  async (slug: string) => loadHomepagePublicPackageBy('slug', slug),
  ['homepage-public-slug'],
  { revalidate: 60, tags: ['homepage-public'] }
)

export const getHomepagePublicPackageByDomain = unstable_cache(
  async (domain: string) => loadHomepagePublicPackageBy('domain', normalizeDomain(domain)),
  ['homepage-public-domain'],
  { revalidate: 60, tags: ['homepage-public'] }
)
