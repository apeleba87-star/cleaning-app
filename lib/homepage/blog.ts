import { sanitizeText } from '@/lib/homepage/server'

export type HomepageRssPost = {
  external_id: string
  title: string
  url: string
  summary: string
  thumbnail_url: string | null
  published_at: string | null
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtml(value: string) {
  return decodeXml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function tag(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))
  return match ? decodeXml(match[1]).trim() : ''
}

function firstImage(value: string) {
  const decoded = decodeXml(value)
  const src = decoded.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
  if (!src) return null
  try {
    const url = new URL(src)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.toString()
  } catch {
    return null
  }
}

export function resolveNaverBlogRssUrl(blogUrl: string) {
  const trimmed = blogUrl.trim()
  if (!trimmed) return ''
  if (trimmed.includes('rss.blog.naver.com')) return trimmed

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    const pathId = url.pathname.split('/').filter(Boolean)[0]
    const queryId = url.searchParams.get('blogId')
    const hostId = url.hostname.endsWith('.blog.me') ? url.hostname.split('.')[0] : ''
    const blogId = queryId || pathId || hostId
    return blogId ? `https://rss.blog.naver.com/${blogId}.xml` : ''
  } catch {
    return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? `https://rss.blog.naver.com/${trimmed}.xml` : ''
  }
}

export async function fetchHomepageRssPosts(rssUrl: string): Promise<HomepageRssPost[]> {
  const res = await fetch(rssUrl, {
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml',
      'User-Agent': 'MUPL-Homepage-RSS/1.0',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`RSS를 불러오지 못했습니다. (${res.status})`)
  const xml = await res.text()
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []

  return items.slice(0, 12).map((item) => {
    const title = sanitizeText(stripHtml(tag(item, 'title')), 120)
    const link = tag(item, 'link') || tag(item, 'guid')
    const description = tag(item, 'description')
    const pubDate = tag(item, 'pubDate')
    const published = pubDate && !Number.isNaN(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null
    return {
      external_id: link || `${title}-${published || ''}`,
      title,
      url: link,
      summary: sanitizeText(stripHtml(description), 180),
      thumbnail_url: firstImage(description),
      published_at: published,
    }
  }).filter((post) => post.title && post.url)
}
