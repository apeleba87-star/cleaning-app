import { revalidateTag } from 'next/cache'
import { fetchHomepageRssPosts, resolveNaverBlogRssUrl } from '@/lib/homepage/blog'
import {
  assertHomepageSiteAccess,
  getHomepageAdminClient,
  homepageErrorResponse,
  homepageJson,
  HomepageApiError,
  sanitizeExternalUrl,
} from '@/lib/homepage/server'

export async function POST(request: Request, { params }: { params: { siteId: string } }) {
  try {
    await assertHomepageSiteAccess(params.siteId, true)
    const body = await request.json()
    const blogUrl = sanitizeExternalUrl(body.blog_url)
    if (!blogUrl) throw new HomepageApiError('블로그 주소가 필요합니다.')

    const rssUrl = resolveNaverBlogRssUrl(blogUrl)
    if (!rssUrl) throw new HomepageApiError('네이버 블로그 RSS 주소를 찾지 못했습니다.')

    const client = getHomepageAdminClient()
    const { data: existingSource } = await client
      .from('homepage_blog_sources')
      .select('*')
      .eq('site_id', params.siteId)
      .eq('source_type', 'naver_blog')
      .maybeSingle()

    if (existingSource?.last_synced_at && Date.now() - Date.parse(existingSource.last_synced_at) < 3 * 60 * 1000) {
      throw new HomepageApiError('블로그 새로고침은 잠시 후 다시 시도해주세요.', 429)
    }

    let sourceId = existingSource?.id
    const sourcePayload = {
      site_id: params.siteId,
      source_type: 'naver_blog',
      blog_url: blogUrl,
      rss_url: rssUrl,
      sync_enabled: true,
      display_limit: Math.max(3, Math.min(12, Number(body.display_limit || 6))),
      last_synced_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    }

    const sourceResult = await client
      .from('homepage_blog_sources')
      .upsert(sourcePayload, { onConflict: 'site_id,source_type' })
      .select()
      .single()
    if (sourceResult.error) throw sourceResult.error
    sourceId = sourceResult.data.id

    try {
      const posts = await fetchHomepageRssPosts(rssUrl)
      if (posts.length) {
        const { error } = await client.from('homepage_blog_posts').upsert(
          posts.map((post) => ({
            ...post,
            site_id: params.siteId,
            source_id: sourceId,
            is_visible: true,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'site_id,external_id' }
        )
        if (error) throw error
      }

      await client.from('homepage_sites').update({ blog_url: blogUrl, updated_at: new Date().toISOString() }).eq('id', params.siteId)
      revalidateTag('homepage-public')
      return homepageJson({ posts })
    } catch (error: any) {
      await client
        .from('homepage_blog_sources')
        .update({ last_error: error.message || '동기화 실패', updated_at: new Date().toISOString() })
        .eq('id', sourceId)
      throw error
    }
  } catch (error) {
    return homepageErrorResponse(error)
  }
}
