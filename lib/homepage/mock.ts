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
  paletteKey?: HomepageColorPaletteKey,
  audience: 'cleaning' | 'general' = 'cleaning'
): HomepagePublicPackage {
  const template = getHomepageTemplate(templateKey)
  const key = template.key as HomepageTemplateKey
  const isGeneral = audience === 'general'
  const isPremium = key === 'showcase-portfolio'
  const isLocal = key === 'showcase-local'
  const isReviewSales = key === 'sales-reviews'
  const isPriceSales = key === 'sales-services'
  const isUrgentSales = key === 'sales-fast-contact'
  const isStepInteractive = key === 'interactive-steps'
  const isRecommendInteractive = key === 'interactive-campaign'

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
      business_name: isGeneral ? '온사이트 스튜디오' : isPremium ? '오브제 스튜디오' : '무플 클린',
      headline:
        isGeneral
          ? key === 'showcase-basic'
            ? '현장을 완성하는 전문 시공 업체'
            : key === 'showcase-portfolio'
              ? '공간과 현장의 완성도를 높입니다'
              : key === 'showcase-local'
                ? '우리 지역 현장 시공 빠른 상담'
                : key === 'sales-reviews'
                  ? '후기로 확인하는 현장 시공'
                  : key === 'sales-services'
                    ? '시공 기준과 비용을 투명하게 안내'
                    : key === 'sales-fast-contact'
                      ? '당일 현장 상담 가능'
                      : '현장에 맞는 상담을 빠르게'
        : isPremium
          ? '공간의 가치를 완성합니다'
          : isLocal
            ? '강서구 입주청소 당일 상담 가능'
            : isReviewSales
              ? '입주청소 평당 15,000원~'
              : isPriceSales
                ? '원룸 15만원부터 시작합니다'
                : isUrgentSales
                  ? '당일 상담 가능'
                  : isStepInteractive
                    ? '질문에 답하면 견적이 완성됩니다'
                    : isRecommendInteractive
                      ? '우리집에 맞는 청소를 추천합니다'
            : template.category === 'interactive'
          ? '우리집 청소 예상 견적을 바로 확인하세요'
          : template.category === 'sales'
            ? '믿을 수 있는 청소업체, 견적까지 빠르게'
            : '깔끔한 현장을 만드는 청소 전문 업체',
      subheadline: isGeneral
        ? key === 'showcase-portfolio'
          ? '인테리어 · 목공 · 타일 · 줄눈처럼 결과물이 중요한 현장업에 맞춘 구성입니다.'
          : key === 'showcase-local'
            ? '지역 기반 방문 상담과 시공 가능 일정을 빠르게 안내합니다.'
            : key === 'sales-reviews'
              ? '고객 후기와 시공 후 사진을 먼저 보여주고 문의로 연결합니다.'
              : key === 'sales-services'
                ? '서비스 범위와 기준 비용을 먼저 보여줘 문의 장벽을 낮춥니다.'
                : key === 'sales-fast-contact'
                  ? '오늘 가능한 상담과 빠른 연락을 강조하는 현장업 전환형입니다.'
                  : '시공 사례, 서비스 범위, 작업 과정을 깔끔하게 보여주는 현장업 홈페이지입니다.'
        : isPremium
        ? '인테리어 · 리모델링 전문'
        : isLocal
          ? '서울 서부권 빠른 방문 상담, 전화 한 번으로 일정을 확인하세요.'
          : isReviewSales
            ? '상담 1분, 견적 3분. 후기로 확인하고 예상비용까지 바로 안내받으세요.'
            : isPriceSales
              ? '원룸 15만원~, 20평 30만원~, 30평 42만원~ 기준으로 먼저 확인하세요.'
              : isUrgentSales
                ? '오늘 가능한 일정을 확인하고 전화 또는 카카오톡으로 빠르게 안내받으세요.'
                : isStepInteractive
                  ? '지역, 평수, 서비스만 차례대로 답하면 예상 결과를 바로 보여드립니다.'
                  : isRecommendInteractive
                    ? '걱정되는 공간을 선택하면 필요한 청소 범위와 예상 비용을 추천합니다.'
          : '입주청소, 이사청소, 상가청소까지 현장 상황에 맞춰 빠르게 안내드립니다.',
      description: isGeneral
        ? '상담부터 시공 완료까지 현장 상황에 맞춰 투명하게 안내드립니다.'
        : isPremium
        ? '오래 머무는 공간에는 이유가 있습니다.'
        : '상담부터 청소 완료까지 사진과 설명으로 투명하게 안내드립니다.',
      phone: '010-1234-5678',
      kakao_url: 'https://pf.kakao.com/_demo',
      blog_url: 'https://blog.naver.com/demo',
      naver_place_url: null,
      instagram_url: null,
      logo_image_url: null,
      address: isGeneral && isLocal ? '경기 성남시' : isLocal ? '서울 강서구' : '서울 강남구',
      service_area: isGeneral
        ? '성남 / 분당 / 용인 / 경기 일부'
        : isLocal ? '강서구 / 양천구 / 마포구 / 은평구' : '서울 전지역 / 경기 일부',
      business_hours: '매일 08:00 - 20:00',
      seo_title: isGeneral ? '현장업 홈페이지 템플릿' : isPremium ? '오브제 스튜디오 인테리어' : '무플 클린 입주청소',
      seo_description: isGeneral ? '인테리어, 줄눈, 목공, 타일 등 현장업 홈페이지 템플릿입니다.' : isPremium ? '인테리어와 리모델링 포트폴리오를 확인하세요.' : '입주청소와 이사청소 예상 견적을 바로 확인하세요.',
      seo_keywords: isGeneral ? ['현장업', '시공', '인테리어', '줄눈', '목공'] : isPremium ? ['인테리어', '리모델링', '상업공간'] : ['입주청소', '이사청소', '청소견적'],
      seo_og_image_url: HOMEPAGE_PREVIEW_IMAGES[isPremium ? 12 : 0],
      seo_canonical_url: null,
      seo_noindex: false,
      seo_naver_verification: null,
      seo_google_verification: null,
      hero_image_url: HOMEPAGE_PREVIEW_IMAGES[isPremium ? 12 : 0],
      portfolio_title: isGeneral
        ? isPremium ? 'Selected works' : '최근 시공 사례'
        : isPremium ? 'Selected projects' : isLocal ? '우리 동네 현장 사례' : '최근 현장 사례',
      portfolio_enabled: true,
      calculator_enabled: template.calculatorPosition !== 'none',
      footer_company_name: isGeneral ? '온사이트 스튜디오' : isPremium ? '오브제 스튜디오' : '무플 클린',
      footer_representative: '홍길동',
      footer_business_number: '123-45-67890',
      footer_email: 'hello@example.com',
      footer_address: isGeneral ? '경기 성남시 분당구 00' : isLocal ? '서울 강서구 공항대로 00' : '서울 강남구 테헤란로 00',
      footer_phone: '010-1234-5678',
      footer_business_hours: '매일 08:00 - 20:00',
      footer_privacy_url: null,
      footer_terms_url: null,
      footer_note: '상담 후 현장 상황에 따라 최종 견적이 확정됩니다.',
      product_name: template.name,
      product_price_note: '제작비와 월 관리비는 상담 후 안내',
      product_included_features: ['모바일 최적화', '빠른 문의 연결', '알림 기능', '검색 노출 기본 설정'],
      onboarding_checklist: {
        logo: false,
        photos: true,
        contact: true,
        domain: false,
      },
      trust_badges: [
        { title: 'A/S 안내', description: '작업 후 미흡한 부분을 확인합니다.' },
        { title: '직접 관리', description: '상담부터 검수까지 기준을 맞춥니다.' },
        { title: '사업자 정보 공개', description: '하단에 사업자 정보를 표시합니다.' },
      ],
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
        title: isGeneral ? '분당 상가 부분 시공 사례' : isPremium ? '논현동 라운지 리모델링' : isLocal ? '강서구 입주청소 현장' : '강남 입주청소 현장 다녀왔습니다',
        url: '#',
        summary: isGeneral ? '상담부터 마감까지 현장 조건에 맞춰 진행한 사례입니다.' : isPremium ? '조명과 마감재의 밀도를 높인 상업공간 프로젝트입니다.' : '신축 아파트 분진과 창틀 오염을 집중적으로 관리한 사례입니다.',
        thumbnail_url: HOMEPAGE_PREVIEW_IMAGES[isPremium ? 13 : 1],
        published_at: new Date().toISOString(),
        is_visible: true,
        is_pinned: true,
      },
      {
        id: 'preview-post-2',
        site_id: `preview-${key}`,
        title: isGeneral ? '욕실 줄눈 보수 전후 비교' : isPremium ? '성수 쇼룸 공간 디자인' : isLocal ? '양천구 이사청소 전후 비교' : '송파 이사청소 전후 비교',
        url: '#',
        summary: isGeneral ? '사용 빈도가 높은 공간을 중심으로 시공 범위를 정리했습니다.' : isPremium ? '브랜드 분위기가 오래 남도록 동선과 조도를 정리했습니다.' : '주방 기름때와 욕실 물때를 중심으로 작업했습니다.',
        thumbnail_url: HOMEPAGE_PREVIEW_IMAGES[isPremium ? 10 : 2],
        published_at: new Date(Date.now() - 86400000).toISOString(),
        is_visible: true,
        is_pinned: false,
      },
      {
        id: 'preview-post-3',
        site_id: `preview-${key}`,
        title: isGeneral ? '맞춤 선반 제작 및 설치 사례' : isPremium ? '청담 주거공간 리모델링' : isLocal ? '마포구 상가청소 빠른 방문' : '분당 상가청소 정기관리 사례',
        url: '#',
        summary: isGeneral ? '공간 치수와 사용 목적에 맞춰 제작한 현장입니다.' : isPremium ? '불필요한 장식을 줄이고 소재의 깊이를 살린 현장입니다.' : '영업 전후 동선에 맞춰 빠르게 관리한 현장입니다.',
        thumbnail_url: HOMEPAGE_PREVIEW_IMAGES[isPremium ? 11 : 3],
        published_at: new Date(Date.now() - 172800000).toISOString(),
        is_visible: true,
        is_pinned: false,
      },
    ],
    mediaItems: HOMEPAGE_PREVIEW_IMAGES.slice(4, 10).map((imageUrl, index) => ({
      id: `preview-media-${index + 1}`,
      site_id: `preview-${key}`,
      item_type: index < 3 ? 'after_photo' : 'portfolio',
      title: (isGeneral
        ? ['시공 후 현장', '마감 디테일', '작업 전후', '현장 사례', '자재 마감', '디테일 점검']
        : ['창틀 청소 후', '욕실 청소 후', '주방 청소 후', '현장 사례', '바닥 마감', '디테일 점검'])[index] || '현장 사진',
      description: isGeneral ? '현장에서 확인할 수 있는 시공 사진입니다.' : '현장에서 확인할 수 있는 청소 후 사진입니다.',
      image_url: imageUrl,
      before_image_url: null,
      after_image_url: null,
      alt_text: isGeneral ? '현장 시공 사진' : '청소 후 현장 사진',
      sort_order: index,
      is_visible: true,
    })),
  }
}

export const HOMEPAGE_PREVIEW_TEMPLATE_KEYS = HOMEPAGE_TEMPLATES.map((template) => template.key)
