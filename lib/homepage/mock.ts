import { DEFAULT_HOMEPAGE_CALCULATOR } from '@/lib/homepage/calculator'
import { getHomepageTemplate, HOMEPAGE_TEMPLATES } from '@/lib/homepage/templates'
import type { HomepageColorPaletteKey, HomepagePublicPackage, HomepageTemplateKey } from '@/types/homepage'

export const HOMEPAGE_PREVIEW_IMAGES = [
  'https://cdn.imweb.me/thumbnail/20241127/198946796876f.jpeg',
  'https://cdn.imweb.me/thumbnail/20241127/32ab49f3da994.jpeg',
  'https://cdn.imweb.me/thumbnail/20241127/4ca1e63bbd766.jpeg',
  'https://cdn.imweb.me/thumbnail/20241127/87f5696b992d0.jpeg',
  'https://cdn.imweb.me/thumbnail/20241127/962030520f6d5.jpeg',
  'https://cdn.imweb.me/thumbnail/20241127/a377d952aaffd.jpeg',
  'https://cdn.imweb.me/thumbnail/20241129/36c42dd8deff7.jpg',
  'https://cdn.imweb.me/thumbnail/20241129/37fb720fc3ff3.jpg',
  'https://cdn.imweb.me/thumbnail/20241129/67e7d960ac3fe.jpg',
  'https://cdn.imweb.me/thumbnail/20241129/84734b112c321.jpg',
  'https://cdn.imweb.me/thumbnail/20241129/90695f282c562.jpg',
  'https://cdn.imweb.me/thumbnail/20241129/9f58534625b9c.jpg',
  'https://cdn.imweb.me/thumbnail/20241129/fd63210a48315.jpg',
  'https://cdn.imweb.me/thumbnail/20241130/23893c7732c17.jpeg',
]

export function createHomepagePreviewPackage(
  templateKey: string,
  paletteKey?: HomepageColorPaletteKey
): HomepagePublicPackage {
  const template = getHomepageTemplate(templateKey)
  const key = template.key as HomepageTemplateKey

  return {
    site: {
      id: `preview-${key}`,
      tenant_id: null,
      slug: `preview-${key}`,
      name: template.name,
      template_key: key,
      template_category: template.category,
      color_palette: paletteKey || template.defaultPalette,
      status: 'published',
      business_name: '무플 클린',
      headline:
        template.category === 'interactive'
          ? '우리집 청소 예상 견적을 바로 확인하세요'
          : template.category === 'sales'
            ? '믿을 수 있는 청소업체, 견적까지 빠르게'
            : '깔끔한 현장을 만드는 청소 전문 업체',
      subheadline: '입주청소, 이사청소, 상가청소까지 현장 상황에 맞춰 빠르게 안내드립니다.',
      description: '상담부터 청소 완료까지 사진과 설명으로 투명하게 안내드립니다.',
      phone: '010-1234-5678',
      kakao_url: 'https://pf.kakao.com/_demo',
      blog_url: 'https://blog.naver.com/demo',
      naver_place_url: null,
      instagram_url: null,
      address: '서울 강남구',
      service_area: '서울 전지역 / 경기 일부',
      business_hours: '매일 08:00 - 20:00',
      seo_title: '무플 클린 입주청소',
      seo_description: '입주청소와 이사청소 예상 견적을 바로 확인하세요.',
      seo_keywords: ['입주청소', '이사청소', '청소견적'],
      hero_image_url: HOMEPAGE_PREVIEW_IMAGES[0],
      portfolio_title: '최근 현장 사례',
      portfolio_enabled: true,
      calculator_enabled: template.calculatorPosition !== 'none',
    },
    domains: [],
    calculator: {
      ...DEFAULT_HOMEPAGE_CALCULATOR,
      site_id: `preview-${key}`,
    },
    blogPosts: [
      {
        id: 'preview-post-1',
        site_id: `preview-${key}`,
        title: '강남 입주청소 현장 다녀왔습니다',
        url: '#',
        summary: '신축 아파트 분진과 창틀 오염을 집중적으로 관리한 사례입니다.',
        thumbnail_url: HOMEPAGE_PREVIEW_IMAGES[1],
        published_at: new Date().toISOString(),
        is_visible: true,
        is_pinned: true,
      },
      {
        id: 'preview-post-2',
        site_id: `preview-${key}`,
        title: '송파 이사청소 전후 비교',
        url: '#',
        summary: '주방 기름때와 욕실 물때를 중심으로 작업했습니다.',
        thumbnail_url: HOMEPAGE_PREVIEW_IMAGES[2],
        published_at: new Date(Date.now() - 86400000).toISOString(),
        is_visible: true,
        is_pinned: false,
      },
      {
        id: 'preview-post-3',
        site_id: `preview-${key}`,
        title: '분당 상가청소 정기관리 사례',
        url: '#',
        summary: '영업 전후 동선에 맞춰 빠르게 관리한 현장입니다.',
        thumbnail_url: HOMEPAGE_PREVIEW_IMAGES[3],
        published_at: new Date(Date.now() - 172800000).toISOString(),
        is_visible: true,
        is_pinned: false,
      },
    ],
  }
}

export const HOMEPAGE_PREVIEW_TEMPLATE_KEYS = HOMEPAGE_TEMPLATES.map((template) => template.key)
