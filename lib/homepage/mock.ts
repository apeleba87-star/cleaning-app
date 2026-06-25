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

const HOMEPAGE_CLEANUP_PREVIEW_IMAGES = [
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1603712725038-e9334ae8f39f?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1560439514-4e9645039924?auto=format&fit=crop&w=1200&q=85',
]

const HOMEPAGE_SILVER_PREVIEW_IMAGES = [
  'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85',
]

const HOMEPAGE_SILVER_HOSPITAL_IMAGES = [
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=85',
]

const HOMEPAGE_SILVER_HOMECARE_IMAGES = [
  'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
]

export function createHomepagePreviewPackage(
  templateKey: string,
  paletteKey?: HomepageColorPaletteKey,
  audience: 'cleaning' | 'general' | 'silver' = 'cleaning'
): HomepagePublicPackage {
  const template = getHomepageTemplate(templateKey)
  const key = template.key as HomepageTemplateKey
  const isGeneral = audience === 'general'
  const isSilver = audience === 'silver'
  const previewTemplates = isGeneral
    ? HOMEPAGE_TEMPLATES.filter((item) => item.category !== 'interactive' && item.category !== 'silver' && item.key !== 'cleaning-legacy-cleanup')
    : isSilver
    ? HOMEPAGE_TEMPLATES.filter((item) => item.category === 'silver')
    : HOMEPAGE_TEMPLATES.filter((item) => item.category !== 'silver')
  const previewIndex = Math.max(previewTemplates.findIndex((item) => item.key === key), 0)
  const previewName = `템플릿${previewIndex + 1}`
  const isCleanupLegacy = key === 'cleaning-legacy-cleanup'
  const isSilverDaycare = key === 'silver-daycare'
  const isSilverHospital = key === 'silver-hospital'
  const isSilverHomecare = key === 'silver-homecare'
  const isPremium = key === 'showcase-portfolio'
  const isLocal = key === 'showcase-local'
  const isTech = key === 'showcase-tech'
  const isCarenex = key === 'showcase-carenex'
  const isCleanDetail = key === 'showcase-clean-detail'
  const isReviewSales = key === 'sales-reviews'
  const isPriceSales = key === 'sales-services'
  const isUrgentSales = key === 'sales-fast-contact'
  const isTemplateStudio = key === 'field-template-studio'
  const isStepInteractive = key === 'interactive-steps'
  const isRecommendInteractive = key === 'interactive-campaign'

  return {
    site: {
      id: `preview-${key}`,
      tenant_id: null,
      slug: `preview-${key}`,
      name: previewName,
      template_key: key,
      template_category: template.category,
      color_palette: paletteKey || template.defaultPalette,
      status: 'published',
      business_name: isCleanupLegacy ? '무플 유품정리' : isSilverHomecare ? '무플재가복지센터' : isSilverHospital ? '무플 요양병원' : isSilverDaycare ? '무플 요양원' : isCleanDetail ? '클린홈 프로' : isCarenex ? '빌딩케어 프로' : isTech ? (isGeneral ? '테크노바 솔루션' : '클린테크 플랫폼') : isTemplateStudio ? '온사이트 템플릿' : isGeneral ? '온사이트 스튜디오' : isPremium ? '오브제 스튜디오' : '무플 클린',
      headline:
        isCleanupLegacy
          ? '특수청소와 유품정리, 조용하고 신속하게'
          : isSilverHomecare
          ? '건강한 노후의 행복'
          : isSilverHospital
          ? '보금자리 같은 편안함과 아늑함'
          : isSilverDaycare
          ? '부모님의 내일을 정성으로 지킵니다'
          : isCleanDetail
          ? '입주 전 공간을 제대로 준비하는 전문 청소'
          : isCarenex
          ? '자산의 가치를 높이는 스마트 건물관리 솔루션'
          : isTech
          ? isGeneral ? '미래를 주도하는 통합 테크 솔루션' : '청소업 운영을 바꾸는 통합 클린 솔루션'
          : isTemplateStudio
          ? '현장업 홈페이지, 템플릿으로 빠르게 시작하세요'
          : isGeneral
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
      subheadline: isCleanupLegacy
        ? '쓰레기집 청소, 유품정리, 고독사 청소, 폐기물 처리까지 365일 전화상담으로 안내합니다.'
        : isSilverHomecare
        ? '방문요양, 등급신청, 본인부담금 상담까지 가족 곁에서 안내합니다.'
        : isSilverHospital
        ? '보건복지부 의료기관 인증 병원, 섬김과 사랑을 실천하는 요양병원입니다.'
        : isSilverDaycare
        ? '메디컬 특화 도심형 프리미엄 요양원, 무플 요양원입니다.'
        : isCleanDetail
        ? '하자점검, 분진 제거, 공간별 체크리스트까지 입주청소에 필요한 기준을 자세히 안내합니다.'
        : isCarenex
        ? '시설관리, 미화, 보안, 행정지원을 아우르는 원스톱 서비스를 경험하세요.'
        : isTech
        ? isGeneral
          ? '복잡한 비즈니스 환경 속에서도 성공을 이끄는 기술 파트너입니다.'
          : '입주청소, 이사청소, 상가청소 문의를 빠르게 받고 일정과 후기를 함께 보여주는 청소업 전용 홈페이지 구조입니다.'
        : isTemplateStudio
        ? '청소, 줄눈, 인테리어, 목공, 방충망처럼 현장에서 일하는 업종에 맞춰 문의가 들어오는 홈페이지 구조로 준비했습니다.'
        : isGeneral
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
      description: isCleanupLegacy
        ? '무플 유품정리는 특수청소, 유품정리, 고독사 청소, 폐기물 처리 상담 전환을 위한 청소업 템플릿입니다.'
        : isSilverHomecare
        ? '무플재가복지센터는 방문요양 서비스, 등급신청 절차, 지원금과 본인부담금 안내, 서비스 신청을 한 화면에서 연결합니다.'
        : isSilverHospital
        ? '무플 요양병원은 양한방 협진, 노인성 질환 치료, 사회복지 프로그램과 간병 문의를 안내하는 공식 홈페이지형 템플릿입니다.'
        : isSilverDaycare
        ? '무플 요양원은 의료 연계, 1~2인실 특화, 도심 접근성, 이용 비용과 시설 정보를 한 페이지에서 안내합니다.'
        : isCleanDetail
        ? '클린홈 프로는 입주 전 현장 상태와 공간별 청소 범위를 기준으로 꼼꼼한 청소 서비스를 안내합니다.'
        : isCarenex
        ? '건물 종합관리 전문기업 빌딩케어 프로는 고객의 자산 가치를 지키기 위해 최적화된 관리 서비스를 제공합니다.'
        : isTech
        ? isGeneral
          ? '클라우드, AI, 빅데이터, 보안을 연결해 기업의 디지털 전환을 돕는 기술 기업입니다.'
          : '청소업체의 상담 전환, 후기 신뢰, 현장 사진 노출을 한 화면에서 연결하는 다크 프리미엄 홈페이지입니다.'
        : isTemplateStudio
        ? '현장업 사장님이 바로 확인하고 선택할 수 있는 홈페이지 템플릿 판매 브랜드입니다.'
        : isGeneral
        ? '상담부터 시공 완료까지 현장 상황에 맞춰 투명하게 안내드립니다.'
        : isPremium
        ? '오래 머무는 공간에는 이유가 있습니다.'
        : '상담부터 청소 완료까지 사진과 설명으로 투명하게 안내드립니다.',
      phone: isCleanupLegacy ? '00-000-0000' : isSilverHomecare ? '00-000-0000' : isSilverHospital ? '055-000-0000' : isSilverDaycare ? '031-466-9979' : isCleanDetail ? '0000-0000' : isCarenex ? '0000-0000' : '010-1234-5678',
      kakao_url: 'https://pf.kakao.com/_demo',
      blog_url: 'https://blog.naver.com/demo',
      naver_place_url: null,
      instagram_url: null,
      logo_image_url: null,
      address: isCleanupLegacy ? '서울특별시 강북구 무플로 00' : isSilverHomecare ? '강원특별자치도 원주시 무플로 00' : isSilverHospital ? '경남 창원시 마산합포구 무플로 00' : isSilverDaycare ? '경기 안양시 만안구 안양로 115, 2~6층' : isCleanDetail ? '서울특별시 강서구 공항대로 00' : isCarenex ? '서울특별시 영등포구 국제금융로 00' : isTech ? (isGeneral ? '서울 성동구 테크로 10' : '서울 강서구') : isTemplateStudio ? '서울 마포구' : isGeneral && isLocal ? '경기 성남시' : isLocal ? '서울 강서구' : '서울 강남구',
      service_area: isCleanupLegacy
        ? '전국 특수청소 / 유품정리 / 폐기물 처리'
        : isSilverHomecare
        ? '원주 방문요양 / 등급신청 / 가족 상담'
        : isSilverHospital
        ? '마산 / 창원 / 진해 / 함안 입원 상담'
        : isSilverDaycare
        ? '명학역 1번 출구 도보 5분 / 지하주차장 완비'
        : isCleanDetail
        ? '서울 전지역 / 경기 일부'
        : isCarenex
        ? '서울 / 경기 / 수도권 주요 빌딩'
        : isTech
        ? isGeneral ? '서울 / 판교 / 전국 기업 컨설팅' : '강서구 / 양천구 / 마포구 / 서울 전지역'
        : isTemplateStudio
        ? '전국 비대면 제작 / 수도권 상담'
        : isGeneral
        ? '성남 / 분당 / 용인 / 경기 일부'
        : isLocal ? '강서구 / 양천구 / 마포구 / 은평구' : '서울 전지역 / 경기 일부',
      business_hours: isCleanupLegacy ? '365일 24시간 전화상담' : isSilverHomecare ? '방문요양 상담 09:00 - 18:00' : isSilverHospital ? '입원·간병 상담 09:00 - 18:00' : isSilverDaycare ? '상담 가능 시간 09:00 - 18:00' : isCarenex ? '평일 09:00 - 18:00' : '매일 08:00 - 20:00',
      seo_title: isCleanupLegacy ? '무플 유품정리 특수청소' : isSilverHomecare ? '무플재가복지센터 방문요양' : isSilverHospital ? '무플 요양병원 공식 홈페이지' : isSilverDaycare ? '무플 요양원' : isCleanDetail ? '클린홈 프로 입주청소' : isCarenex ? '빌딩케어 프로 건물 종합관리' : isTech ? (isGeneral ? '테크노바 솔루션 IT 기업 홈페이지' : '청소업 다크 프리미엄 홈페이지') : isTemplateStudio ? '현장업 홈페이지 템플릿 판매' : isGeneral ? '현장업 홈페이지 템플릿' : isPremium ? '오브제 스튜디오 인테리어' : '무플 클린 입주청소',
      seo_description: isCleanupLegacy ? '특수청소, 유품정리, 고독사 청소, 폐기물 처리 전화 상담 전환을 위한 청소업 템플릿입니다.' : isSilverHomecare ? '방문요양 서비스 소개, 등급신청 절차, 본인부담금 안내와 전화 상담을 연결하는 재가복지센터 템플릿입니다.' : isSilverHospital ? '마산·창원·진해·함안 지역 입원 및 간병 상담을 위한 요양병원 공식 홈페이지 템플릿입니다.' : isSilverDaycare ? '안양 명학역 인근 메디컬 특화 프리미엄 요양원 무플 요양원 랜딩페이지 템플릿입니다.' : isCleanDetail ? '입주청소 서비스 신뢰 구축과 견적 전환을 위한 정보집약형 청소업 홈페이지 템플릿입니다.' : isCarenex ? '시설관리, 미화, 보안, 인재파견을 제공하는 건물 종합관리 기업 홈페이지 템플릿입니다.' : isTech ? (isGeneral ? '클라우드, AI, 빅데이터, 보안 솔루션을 제공하는 테크 기업 홈페이지 템플릿입니다.' : '입주청소와 이사청소 상담 전환을 위한 다크 테크 스타일 청소업 홈페이지 템플릿입니다.') : isTemplateStudio ? '현장업 사장님을 위한 홈페이지 템플릿과 제작 상품을 소개합니다.' : isGeneral ? '인테리어, 줄눈, 목공, 타일 등 현장업 홈페이지 템플릿입니다.' : isPremium ? '인테리어와 리모델링 포트폴리오를 확인하세요.' : '입주청소와 이사청소 예상 견적을 바로 확인하세요.',
      seo_keywords: isCleanupLegacy ? ['특수청소', '유품정리', '고독사청소', '폐기물처리', '쓰레기집청소'] : isSilverHomecare ? ['재가복지센터', '방문요양', '등급신청', '본인부담금', '요양보호사'] : isSilverHospital ? ['요양병원', '마산요양병원', '창원요양병원', '간병문의', '보건복지부인증'] : isSilverDaycare ? ['무플요양원', '안양요양원', '평촌요양원', '명학역요양원', '프리미엄요양원'] : isCleanDetail ? ['입주청소', '이사청소', '청소후기', '청소견적', '청소범위'] : isCarenex ? ['건물관리', '시설관리', '미화관리', '보안관리', 'FM'] : isTech ? (isGeneral ? ['IT기업', '클라우드', 'AI', '빅데이터', '보안'] : ['청소업', '입주청소', '이사청소', '청소견적', '후기']) : isTemplateStudio ? ['현장업', '홈페이지 템플릿', '제작', '문의'] : isGeneral ? ['현장업', '시공', '인테리어', '줄눈', '목공'] : isPremium ? ['인테리어', '리모델링', '상업공간'] : ['입주청소', '이사청소', '청소견적'],
      seo_og_image_url: isCleanupLegacy ? HOMEPAGE_CLEANUP_PREVIEW_IMAGES[0] : isSilverHomecare ? HOMEPAGE_SILVER_HOMECARE_IMAGES[0] : isSilverHospital ? HOMEPAGE_SILVER_HOSPITAL_IMAGES[0] : isSilverDaycare ? HOMEPAGE_SILVER_PREVIEW_IMAGES[0] : HOMEPAGE_PREVIEW_IMAGES[isPremium ? 12 : 0],
      seo_canonical_url: null,
      seo_noindex: false,
      seo_naver_verification: null,
      seo_google_verification: null,
      hero_image_url: isCleanupLegacy ? HOMEPAGE_CLEANUP_PREVIEW_IMAGES[0] : isSilverHomecare ? HOMEPAGE_SILVER_HOMECARE_IMAGES[0] : isSilverHospital ? HOMEPAGE_SILVER_HOSPITAL_IMAGES[0] : isSilverDaycare ? HOMEPAGE_SILVER_PREVIEW_IMAGES[0] : HOMEPAGE_PREVIEW_IMAGES[isCleanDetail ? 4 : isCarenex ? 13 : isTech ? (isGeneral ? 13 : 4) : isPremium ? 12 : 0] || HOMEPAGE_PREVIEW_IMAGES[0],
      portfolio_title: isCleanupLegacy
        ? '작업 후기와 상담 사례'
        : isSilverHomecare
        ? '방문요양 서비스 안내'
        : isSilverHospital
        ? '의료진과 병원 소식'
        : isSilverDaycare
        ? '시설과 이용 안내'
        : isCleanDetail
        ? '현장점검과 칭찬후기'
        : isCarenex
        ? '빌딩케어 프로 관리 현장'
        : isTech
        ? '최신 뉴스와 트렌드'
        : isTemplateStudio
        ? '대표 템플릿'
        : isGeneral
        ? isPremium ? 'Selected works' : '최근 시공 사례'
        : isPremium ? 'Selected projects' : isLocal ? '우리 동네 현장 사례' : '최근 현장 사례',
      portfolio_enabled: true,
      calculator_enabled: template.calculatorPosition !== 'none',
      footer_company_name: isCleanupLegacy ? '무플 유품정리' : isSilverHomecare ? '무플재가복지센터' : isSilverHospital ? '무플 요양병원' : isSilverDaycare ? '무플 요양원' : isCleanDetail ? '클린홈 프로' : isCarenex ? '빌딩케어 프로' : isTech ? (isGeneral ? '테크노바 솔루션' : '클린테크 플랫폼') : isTemplateStudio ? '온사이트 템플릿' : isGeneral ? '온사이트 스튜디오' : isPremium ? '오브제 스튜디오' : '무플 클린',
      footer_representative: '홍길동',
      footer_business_number: '123-45-67890',
      footer_email: isSilverDaycare ? 'care@example.com' : isCleanDetail ? 'cleanhome@example.com' : isCarenex ? 'contact@buildingcare-pro.co.kr' : 'hello@example.com',
      footer_address: isCleanupLegacy ? '서울특별시 강북구 무플로 00' : isSilverHomecare ? '강원특별자치도 원주시 무플로 00' : isSilverHospital ? '경남 창원시 마산합포구 무플로 00' : isSilverDaycare ? '경기 안양시 만안구 안양로 115, 2~6층' : isCleanDetail ? '서울특별시 강서구 공항대로 00' : isCarenex ? '서울특별시 영등포구 국제금융로 00' : isTech ? (isGeneral ? '서울 성동구 테크로 10' : '서울 강서구 공항대로 00') : isTemplateStudio ? '서울 마포구 월드컵북로 00' : isGeneral ? '경기 성남시 분당구 00' : isLocal ? '서울 강서구 공항대로 00' : '서울 강남구 테헤란로 00',
      footer_phone: isCleanupLegacy ? '00-000-0000' : isSilverHomecare ? '00-000-0000' : isSilverHospital ? '055-000-0000' : isSilverDaycare ? '031-466-9979' : isCleanDetail ? '0000-0000' : isCarenex ? '0000-0000' : '010-1234-5678',
      footer_business_hours: isCleanupLegacy ? '365일 24시간 전화상담' : isSilverHomecare ? '방문요양 상담 09:00 - 18:00' : isSilverHospital ? '입원·간병 상담 09:00 - 18:00' : isSilverDaycare ? '상담 가능 시간 09:00 - 18:00' : isCarenex ? '평일 09:00 - 18:00' : '매일 08:00 - 20:00',
      footer_privacy_url: null,
      footer_terms_url: null,
      footer_note: isCleanupLegacy ? '현장 상황과 폐기물 양에 따라 최종 견적이 달라질 수 있습니다.' : isSilverHomecare ? '방문요양 신청과 등급신청 상담은 전화로 빠르게 안내드립니다.' : isSilverHospital ? '입원 및 간병 상담은 전화 또는 문의 폼으로 접수할 수 있습니다.' : isSilverDaycare ? '상담 후 입소 조건과 이용 비용을 자세히 안내드립니다.' : '상담 후 현장 상황에 따라 최종 견적이 확정됩니다.',
      product_name: isCleanupLegacy ? '특수청소 유품정리 전환형 홈페이지' : isSilverHomecare ? '재가복지센터 방문요양 홈페이지' : isSilverHospital ? '요양병원 공식 홈페이지' : isSilverDaycare ? '요양원 소개 랜딩페이지' : isCleanDetail ? '입주청소 정보형 서비스 페이지' : isCarenex ? '건물 종합관리 서비스' : isTech ? (isGeneral ? '통합 테크 솔루션' : '청소업 전환형 홈페이지') : isTemplateStudio ? '현장업 홈페이지 템플릿 제작' : previewName,
      product_price_note: isCleanupLegacy ? '사진/전화 상담 후 현장별 견적 안내' : isSilverHomecare ? '장기요양등급과 본인부담금 전화 상담' : isSilverHospital ? '입원·간병 상담 후 안내' : isSilverDaycare ? '1인실 250~257만원 / 2인실 190~197만원' : isCleanDetail ? '평형과 현장 상태에 따른 상담 견적' : isCarenex ? '관리 현장 규모별 맞춤 견적' : isTech ? (isGeneral ? '기업 맞춤 컨설팅 후 안내' : '청소업 템플릿 세팅 후 안내') : isTemplateStudio ? 'Basic / Standard / Premium 상품 운영' : '제작비와 월 관리비는 상담 후 안내',
      product_included_features: isCleanupLegacy
        ? ['전화/카카오톡 CTA', '서비스별 카드', '후기/가격표', '작업 절차', '비교 우위', '상담 폼']
        : isSilverHomecare
        ? ['방문요양 서비스 소개', '등급신청 절차', '지원금/본인부담금 안내', '서비스 신청 CTA', '전화상담 고정 버튼']
        : isSilverHospital
        ? ['멀티페이지 병원 소개', '진료안내', '의료진 소개', '공지/소식 게시판형 화면', '간병 문의 폼']
        : isSilverDaycare
        ? ['전화상담 고정 버튼', '의료 연계 배너', '차별화 카드', '이용안내 탭형 UI', '지도/연락처 섹션']
        : isCleanDetail
        ? ['추천 대상 안내', '신뢰 지표', '공간별 청소 범위', 'FAQ/계약 유의사항']
        : isCarenex
        ? ['시설관리', '미화·환경관리', '보안·주차관리', '아웃소싱·인재파견']
        : isTech
        ? isGeneral ? ['클라우드 아키텍처', 'AI 솔루션', '빅데이터 분석', '사이버 보안'] : ['전화/카톡 문의', '후기 노출', '전후사진 구성', '지역 청소 키워드']
        : isTemplateStudio
        ? ['모바일 최적화', '전화/카카오톡 연결', '업종별 문구 교체', '도메인 연결', '검색 노출 기본 설정']
        : ['모바일 최적화', '빠른 문의 연결', '알림 기능', '검색 노출 기본 설정'],
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
        title: isCleanupLegacy ? '쓰레기집 청소 상담 안내' : isSilverHomecare ? '방문요양 서비스 신청 안내' : isSilverHospital ? '보건복지부 의료기관 인증 안내' : isSilverDaycare ? '무플의원 연계 진료 안내' : isTemplateStudio ? '청소업 전시형 홈페이지 구성' : isGeneral ? '분당 상가 부분 시공 사례' : isPremium ? '논현동 라운지 리모델링' : isLocal ? '강서구 입주청소 현장' : '강남 입주청소 현장 다녀왔습니다',
        url: '#',
        summary: isCleanupLegacy ? '폐기물 양, 오염도, 동선에 따라 전화로 빠르게 1차 견적을 안내합니다.' : isSilverHomecare ? '전화 한 통으로 방문요양 가능 여부와 신청 절차를 안내합니다.' : isSilverHospital ? '환자 안전과 의료서비스 기준을 갖춘 인증 병원 정보를 안내합니다.' : isSilverDaycare ? '내과, 가정의학과, 피부과 연계 진료 구조를 보호자에게 쉽게 안내합니다.' : isTemplateStudio ? '회사소개, 서비스, 전후사진, 후기, 문의를 기본 흐름으로 보여주는 템플릿입니다.' : isGeneral ? '상담부터 마감까지 현장 조건에 맞춰 진행한 사례입니다.' : isPremium ? '조명과 마감재의 밀도를 높인 상업공간 프로젝트입니다.' : '신축 아파트 분진과 창틀 오염을 집중적으로 관리한 사례입니다.',
        thumbnail_url: isCleanupLegacy ? HOMEPAGE_CLEANUP_PREVIEW_IMAGES[1] : isSilverHomecare ? HOMEPAGE_SILVER_HOMECARE_IMAGES[0] : isSilverHospital ? HOMEPAGE_SILVER_HOSPITAL_IMAGES[1] : isSilverDaycare ? HOMEPAGE_SILVER_PREVIEW_IMAGES[3] : HOMEPAGE_PREVIEW_IMAGES[isPremium ? 13 : 1],
        published_at: new Date().toISOString(),
        is_visible: true,
        is_pinned: true,
      },
      {
        id: 'preview-post-2',
        site_id: `preview-${key}`,
        title: isCleanupLegacy ? '유품정리 진행 절차' : isSilverHomecare ? '장기요양 등급신청 절차' : isSilverHospital ? '사회복지 프로그램 운영 소식' : isSilverDaycare ? '1~2인실 생활 공간 안내' : isTemplateStudio ? '현장업 영업형 홈페이지 구성' : isGeneral ? '욕실 줄눈 보수 전후 비교' : isPremium ? '성수 쇼룸 공간 디자인' : isLocal ? '양천구 이사청소 전후 비교' : '송파 이사청소 전후 비교',
        url: '#',
        summary: isCleanupLegacy ? '유족 입장에서 분류, 보관, 폐기, 청소까지 조용하게 진행합니다.' : isSilverHomecare ? '신청, 방문조사, 등급판정, 결과통보까지 보호자 눈높이에 맞춰 안내합니다.' : isSilverHospital ? '원예치료, 음악치료, 자원봉사 활동 등 환자 정서 지원 프로그램을 소개합니다.' : isSilverDaycare ? '프라이버시와 생활 편의를 고려한 1~2인실 중심의 공간 구성을 보여줍니다.' : isTemplateStudio ? '후기, 가격 기준, 빠른 상담 버튼을 앞쪽에 배치해 문의 전환을 목표로 합니다.' : isGeneral ? '사용 빈도가 높은 공간을 중심으로 시공 범위를 정리했습니다.' : isPremium ? '브랜드 분위기가 오래 남도록 동선과 조도를 정리했습니다.' : '주방 기름때와 욕실 물때를 중심으로 작업했습니다.',
        thumbnail_url: isCleanupLegacy ? HOMEPAGE_CLEANUP_PREVIEW_IMAGES[2] : isSilverHomecare ? HOMEPAGE_SILVER_HOMECARE_IMAGES[3] : isSilverHospital ? HOMEPAGE_SILVER_HOSPITAL_IMAGES[4] : isSilverDaycare ? HOMEPAGE_SILVER_PREVIEW_IMAGES[2] : HOMEPAGE_PREVIEW_IMAGES[isPremium ? 10 : 2],
        published_at: new Date(Date.now() - 86400000).toISOString(),
        is_visible: true,
        is_pinned: false,
      },
      {
        id: 'preview-post-3',
        site_id: `preview-${key}`,
        title: isCleanupLegacy ? '고독사 청소 비밀 상담' : isSilverHomecare ? '본인부담금 전화상담 안내' : isSilverHospital ? '자원봉사자 모집 안내' : isSilverDaycare ? '입소 상담과 이용 비용 안내' : isTemplateStudio ? '범용 현장업 홈페이지 구성' : isGeneral ? '맞춤 선반 제작 및 설치 사례' : isPremium ? '청담 주거공간 리모델링' : isLocal ? '마포구 상가청소 빠른 방문' : '분당 상가청소 정기관리 사례',
        url: '#',
        summary: isCleanupLegacy ? '이웃 노출을 줄이고 개인정보 보호를 우선으로 현장을 정리합니다.' : isSilverHomecare ? '등급, 이용시간, 경감 여부에 따른 월 예상 부담금을 전화로 안내합니다.' : isSilverHospital ? '지역사회와 함께하는 병원 활동과 후원 소식을 공지합니다.' : isSilverDaycare ? '상담, 신청, 계약 흐름과 1인실/2인실 비용 정보를 한눈에 정리합니다.' : isTemplateStudio ? '줄눈, 목공, 인테리어, 방충망처럼 업종 문구만 바꿔 사용할 수 있습니다.' : isGeneral ? '공간 치수와 사용 목적에 맞춰 제작한 현장입니다.' : isPremium ? '불필요한 장식을 줄이고 소재의 깊이를 살린 현장입니다.' : '영업 전후 동선에 맞춰 빠르게 관리한 현장입니다.',
        thumbnail_url: isCleanupLegacy ? HOMEPAGE_CLEANUP_PREVIEW_IMAGES[3] : isSilverHomecare ? HOMEPAGE_SILVER_HOMECARE_IMAGES[5] : isSilverHospital ? HOMEPAGE_SILVER_HOSPITAL_IMAGES[5] : isSilverDaycare ? HOMEPAGE_SILVER_PREVIEW_IMAGES[5] : HOMEPAGE_PREVIEW_IMAGES[isPremium ? 11 : 3],
        published_at: new Date(Date.now() - 172800000).toISOString(),
        is_visible: true,
        is_pinned: false,
      },
    ],
    mediaItems: (isCleanupLegacy ? HOMEPAGE_CLEANUP_PREVIEW_IMAGES : isSilverHomecare ? HOMEPAGE_SILVER_HOMECARE_IMAGES : isSilverHospital ? HOMEPAGE_SILVER_HOSPITAL_IMAGES : isSilverDaycare ? HOMEPAGE_SILVER_PREVIEW_IMAGES : HOMEPAGE_PREVIEW_IMAGES.slice(4, 10)).map((imageUrl, index) => ({
      id: `preview-media-${index + 1}`,
      site_id: `preview-${key}`,
      item_type: index < 3 ? 'after_photo' : 'portfolio',
      title: (isCleanupLegacy
        ? ['쓰레기집 청소', '유품정리', '고독사 청소', '폐기물 처리', '쓰레기 처리', '일반 청소']
        : isSilverHomecare
        ? ['방문요양 상담', '요양보호사 방문', '가족 상담', '등급신청 안내', '사회복지사 방문', '건강한 식사']
        : isSilverHospital
        ? ['병원 외관', '병실', '재활 치료실', '진료 공간', '사회복지 프로그램', '간호 스테이션']
        : isSilverDaycare
        ? ['요양원 외관', '상담 라운지', '케어 공간', '식당', '생활실', '건강 체크']
        : isTemplateStudio
        ? ['전시형 템플릿', '영업형 템플릿', '모바일 문의 화면', '상품 가격 카드', 'FAQ 구성', '상담 연결']
        : isGeneral
        ? ['시공 후 현장', '마감 디테일', '작업 전후', '현장 사례', '자재 마감', '디테일 점검']
        : ['창틀 청소 후', '욕실 청소 후', '주방 청소 후', '현장 사례', '바닥 마감', '디테일 점검'])[index] || '현장 사진',
      description: isCleanupLegacy ? '특수청소와 유품정리 상담 전환을 위한 대표 서비스 이미지입니다.' : isSilverHomecare ? '방문요양 상담과 가정 돌봄 서비스를 보호자가 이해하기 쉽게 보여줍니다.' : isSilverHospital ? '병원 신뢰도를 높이기 위해 외관, 병실, 진료 및 재활 환경을 사진으로 보여줍니다.' : isSilverDaycare ? '보호자가 안심할 수 있도록 요양원 시설과 케어 환경을 사진으로 보여줍니다.' : isTemplateStudio ? '템플릿 판매 홈페이지에서 강조할 수 있는 구성 화면입니다.' : isGeneral ? '현장에서 확인할 수 있는 시공 사진입니다.' : '현장에서 확인할 수 있는 청소 후 사진입니다.',
      image_url: imageUrl,
      before_image_url: null,
      after_image_url: null,
      alt_text: isCleanupLegacy ? '특수청소 유품정리 사진' : isSilverHomecare ? '재가복지센터 방문요양 사진' : isSilverHospital ? '요양병원 시설 사진' : isSilverDaycare ? '요양원 시설 사진' : isTemplateStudio ? '홈페이지 템플릿 화면' : isGeneral ? '현장 시공 사진' : '청소 후 현장 사진',
      sort_order: index,
      is_visible: true,
    })),
  }
}

export const HOMEPAGE_PREVIEW_TEMPLATE_KEYS = HOMEPAGE_TEMPLATES.map((template) => template.key)
