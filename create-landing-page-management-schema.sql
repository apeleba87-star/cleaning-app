-- ============================================================
-- 랜딩 페이지 관리 스키마 생성
-- 웹사이트 콘텐츠를 관리할 수 있는 테이블들
-- ============================================================

-- ============================================================
-- 1. landing_page_settings 테이블
-- 섹션별 설정을 JSON 형식으로 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS public.landing_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section VARCHAR(50) NOT NULL UNIQUE, -- 'hero', 'problems', 'philosophy', 'solution', 'differentiation', 'cta', 'seo'
  settings JSONB NOT NULL DEFAULT '{}'::jsonb, -- 섹션별 설정 (JSON 형식)
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_landing_page_settings_section ON public.landing_page_settings(section);
CREATE INDEX IF NOT EXISTS idx_landing_page_settings_updated_at ON public.landing_page_settings(updated_at DESC);

-- ============================================================
-- 2. hero_images 테이블
-- 히어로 섹션 이미지 관리
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hero_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL, -- Supabase Storage URL
  display_order INTEGER NOT NULL DEFAULT 0, -- 표시 순서
  is_active BOOLEAN DEFAULT true, -- 활성화 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_hero_images_display_order ON public.hero_images(display_order);
CREATE INDEX IF NOT EXISTS idx_hero_images_is_active ON public.hero_images(is_active) WHERE is_active = true;

-- ============================================================
-- 3. RLS (Row Level Security) 정책
-- 관리자만 접근 가능
-- ============================================================

-- landing_page_settings RLS
ALTER TABLE public.landing_page_settings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능 (공개 페이지이므로)
CREATE POLICY "Anyone can view landing page settings"
  ON public.landing_page_settings
  FOR SELECT
  USING (true);

-- admin, platform_admin만 수정 가능
CREATE POLICY "Admins can update landing page settings"
  ON public.landing_page_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'platform_admin')
    )
  );

-- hero_images RLS
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view hero images"
  ON public.hero_images
  FOR SELECT
  USING (is_active = true);

-- admin, platform_admin만 관리 가능
CREATE POLICY "Admins can manage hero images"
  ON public.hero_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'platform_admin')
    )
  );

-- ============================================================
-- 4. custom_pages 테이블
-- 사용자가 생성한 커스텀 페이지 관리
-- ============================================================

CREATE TABLE IF NOT EXISTS public.custom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE, -- URL 경로 (예: 'about', 'contact')
  title TEXT NOT NULL, -- 페이지 제목
  content JSONB NOT NULL DEFAULT '{}'::jsonb, -- 페이지 콘텐츠 (JSON 형식)
  meta_title TEXT, -- SEO 메타 제목
  meta_description TEXT, -- SEO 메타 설명
  is_published BOOLEAN DEFAULT false, -- 발행 여부
  is_active BOOLEAN DEFAULT true, -- 활성화 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_custom_pages_slug ON public.custom_pages(slug);
CREATE INDEX IF NOT EXISTS idx_custom_pages_is_published ON public.custom_pages(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_custom_pages_is_active ON public.custom_pages(is_active) WHERE is_active = true;

-- RLS 정책
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 발행된 페이지 조회 가능
CREATE POLICY "Anyone can view published pages"
  ON public.custom_pages
  FOR SELECT
  USING (is_published = true AND is_active = true);

-- admin, platform_admin만 관리 가능
CREATE POLICY "Admins can manage custom pages"
  ON public.custom_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'platform_admin')
    )
  );

-- ============================================================
-- 5. 기본 데이터 삽입 (초기 설정)
-- ============================================================

-- 히어로 섹션 기본 설정
INSERT INTO public.landing_page_settings (section, settings)
VALUES (
  'hero',
  '{
    "tagline": "[ 현장을 늘리기보다, 지켜내는 운영 관리 ]",
    "headline1": "무인 플레이스",
    "headline2": "청소 운영 구조",
    "brandName": "무플",
    "subtitle": "무인 플레이스 청소 관리 솔루션",
    "ctaButton1": {
      "text": "운영 구조 상담받기",
      "link": "/login",
      "visible": true
    },
    "ctaButton2": {
      "text": "가볍게 상담 받기",
      "link": "/login",
      "visible": true
    },
    "sliderInterval": 5000
  }'::jsonb
)
ON CONFLICT (section) DO NOTHING;

-- SEO 기본 설정
INSERT INTO public.landing_page_settings (section, settings)
VALUES (
  'seo',
  '{
    "title": "무플(MUPL) - 무인 현장 운영 관리 플랫폼",
    "description": "무인 현장을 유지하는 운영 구조. 현장을 늘리기보다 지켜내는 운영 관리 솔루션",
    "keywords": "무인매장, 청소관리, 현장운영, 무플, MUPL"
  }'::jsonb
)
ON CONFLICT (section) DO NOTHING;
