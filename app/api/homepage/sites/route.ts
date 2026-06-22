import { DEFAULT_HOMEPAGE_CALCULATOR } from '@/lib/homepage/calculator'
import { getTemplateCategory } from '@/lib/homepage/templates'
import {
  getHomepageAdminClient,
  getHomepageUser,
  homepageErrorResponse,
  homepageJson,
  HomepageUnauthorizedError,
  listHomepageSitesForUser,
  sanitizeText,
} from '@/lib/homepage/server'

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `site-${Date.now()}`
}

export async function GET() {
  try {
    const sites = await listHomepageSitesForUser()
    return homepageJson({ sites })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getHomepageUser()
    if (!user) throw new HomepageUnauthorizedError()

    const body = await request.json()
    const name = sanitizeText(body.name, 80) || '새 홈페이지'
    const templateKey = sanitizeText(body.template_key, 80) || 'interactive-calculator'
    const templateCategory = getTemplateCategory(templateKey)
    const baseSlug = slugify(body.slug || name)
    const client = getHomepageAdminClient()

    let slug = baseSlug
    for (let i = 0; i < 5; i += 1) {
      const { data: existing } = await client.from('homepage_sites').select('id').eq('slug', slug).maybeSingle()
      if (!existing) break
      slug = `${baseSlug}-${i + 2}`
    }

    const { data: site, error } = await client
      .from('homepage_sites')
      .insert({
        slug,
        name,
        business_name: sanitizeText(body.business_name, 100) || name,
        template_key: templateKey,
        template_category: templateCategory,
        color_palette: body.color_palette || 'primary',
        status: 'draft',
        created_by: user.id,
        tenant_id: user.company_id || null,
      })
      .select()
      .single()
    if (error) throw error

    const [{ error: memberError }, { error: calculatorError }] = await Promise.all([
      client.from('homepage_admin_members').insert({
        site_id: site.id,
        user_id: user.id,
        role: 'owner',
      }),
      client.from('homepage_calculator_settings').insert({
        ...DEFAULT_HOMEPAGE_CALCULATOR,
        site_id: site.id,
      }),
    ])
    if (memberError) throw memberError
    if (calculatorError) throw calculatorError

    return homepageJson({ site }, 201)
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
