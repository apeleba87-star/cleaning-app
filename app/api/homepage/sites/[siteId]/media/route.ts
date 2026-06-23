import {
  assertHomepageSiteAccess,
  getHomepageAdminClient,
  homepageErrorResponse,
  homepageJson,
  HomepageApiError,
  sanitizeText,
} from '@/lib/homepage/server'

const mediaTypes = new Set(['gallery', 'before_after', 'portfolio', 'after_photo'])

function sanitizeMediaPayload(body: any, siteId: string) {
  const itemType = sanitizeText(body.item_type, 40) || 'gallery'
  if (!mediaTypes.has(itemType)) throw new HomepageApiError('사진 유형이 올바르지 않습니다.')
  const imageUrl = sanitizeText(body.image_url, 600)
  if (!imageUrl) throw new HomepageApiError('이미지 주소가 필요합니다.')

  return {
    site_id: siteId,
    item_type: itemType,
    title: sanitizeText(body.title, 100),
    description: sanitizeText(body.description, 300),
    image_url: imageUrl,
    before_image_url: sanitizeText(body.before_image_url, 600),
    after_image_url: sanitizeText(body.after_image_url, 600),
    alt_text: sanitizeText(body.alt_text, 120),
    sort_order: Number(body.sort_order || 0),
    is_visible: body.is_visible !== false,
    updated_at: new Date().toISOString(),
  }
}

export async function POST(request: Request, { params }: { params: { siteId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const body = await request.json()
    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('homepage_media_items')
      .insert(sanitizeMediaPayload(body, params.siteId))
      .select()
      .single()
    if (error) throw error
    return homepageJson({ mediaItem: data }, 201)
  } catch (error) {
    return homepageErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: { params: { siteId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const body = await request.json()
    const id = sanitizeText(body.id, 80)
    if (!id) throw new HomepageApiError('수정할 사진을 찾을 수 없습니다.')
    const client = getHomepageAdminClient()
    const { data, error } = await client
      .from('homepage_media_items')
      .update(sanitizeMediaPayload(body, params.siteId))
      .eq('id', id)
      .eq('site_id', params.siteId)
      .select()
      .single()
    if (error) throw error
    return homepageJson({ mediaItem: data })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}

export async function DELETE(request: Request, { params }: { params: { siteId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const { searchParams } = new URL(request.url)
    const id = sanitizeText(searchParams.get('id'), 80)
    if (!id) throw new HomepageApiError('삭제할 사진을 찾을 수 없습니다.')
    const client = getHomepageAdminClient()
    const { error } = await client.from('homepage_media_items').delete().eq('id', id).eq('site_id', params.siteId)
    if (error) throw error
    return homepageJson({ ok: true })
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
