-- MUPL homepage platform schema
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.homepage_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  template_key TEXT NOT NULL DEFAULT 'interactive-calculator',
  template_category TEXT NOT NULL DEFAULT 'interactive',
  color_palette TEXT NOT NULL DEFAULT 'primary',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused')),
  business_name TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '우리집 청소 예상 견적을 바로 확인하세요',
  subheadline TEXT NOT NULL DEFAULT '지역과 평수만 입력하면 예상 금액을 확인할 수 있습니다.',
  description TEXT,
  phone TEXT,
  kakao_url TEXT,
  blog_url TEXT,
  naver_place_url TEXT,
  instagram_url TEXT,
  address TEXT,
  service_area TEXT,
  business_hours TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] NOT NULL DEFAULT '{}',
  hero_image_url TEXT,
  portfolio_title TEXT NOT NULL DEFAULT '최근 현장 사례',
  portfolio_enabled BOOLEAN NOT NULL DEFAULT true,
  calculator_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sites_tenant ON public.homepage_sites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_homepage_sites_status ON public.homepage_sites(status);

CREATE TABLE IF NOT EXISTS public.homepage_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_domains_site ON public.homepage_domains(site_id);
CREATE INDEX IF NOT EXISTS idx_homepage_domains_public ON public.homepage_domains(domain) WHERE verified = true;

CREATE TABLE IF NOT EXISTS public.homepage_admin_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_homepage_admin_members_user ON public.homepage_admin_members(user_id);
CREATE INDEX IF NOT EXISTS idx_homepage_admin_members_site ON public.homepage_admin_members(site_id);

CREATE TABLE IF NOT EXISTS public.homepage_templates (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('showcase', 'sales', 'interactive')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.homepage_calculator_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  default_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homepage_calculator_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  industry TEXT NOT NULL DEFAULT 'move_in_cleaning',
  enabled BOOLEAN NOT NULL DEFAULT true,
  base_unit_price INT NOT NULL DEFAULT 13000,
  minimum_price INT NOT NULL DEFAULT 250000,
  pollution_extra_light INT NOT NULL DEFAULT 0,
  pollution_extra_normal INT NOT NULL DEFAULT 0,
  pollution_extra_heavy INT NOT NULL DEFAULT 50000,
  no_elevator_extra INT NOT NULL DEFAULT 30000,
  region_extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  option_extras JSONB NOT NULL DEFAULT '{"balcony":30000,"window":40000,"mold":50000}'::jsonb,
  discount_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  result_notice TEXT NOT NULL DEFAULT '실제 견적은 오염도, 구조, 현장 상황에 따라 달라질 수 있습니다.',
  caution_note TEXT NOT NULL DEFAULT '방문 상담 후 최종 금액이 확정됩니다.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, industry)
);

CREATE INDEX IF NOT EXISTS idx_homepage_calculator_settings_site ON public.homepage_calculator_settings(site_id);

CREATE TABLE IF NOT EXISTS public.homepage_estimate_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  tenant_id UUID,
  industry TEXT NOT NULL DEFAULT 'move_in_cleaning',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  region TEXT,
  area_pyeong NUMERIC(8,2),
  selected_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimate_input JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_amount INT NOT NULL DEFAULT 0,
  message TEXT,
  source_page TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'checked', 'consulting', 'completed', 'hold')),
  admin_memo TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_estimate_submissions_site_status ON public.homepage_estimate_submissions(site_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_homepage_estimate_submissions_tenant ON public.homepage_estimate_submissions(tenant_id);

CREATE TABLE IF NOT EXISTS public.homepage_blog_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'naver_blog',
  blog_url TEXT NOT NULL,
  rss_url TEXT NOT NULL,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  display_limit INT NOT NULL DEFAULT 6,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, source_type)
);

CREATE INDEX IF NOT EXISTS idx_homepage_blog_sources_site ON public.homepage_blog_sources(site_id);
CREATE INDEX IF NOT EXISTS idx_homepage_blog_sources_sync ON public.homepage_blog_sources(sync_enabled, last_synced_at);

CREATE TABLE IF NOT EXISTS public.homepage_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.homepage_blog_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_homepage_blog_posts_public ON public.homepage_blog_posts(site_id, is_visible, is_pinned, published_at DESC);

CREATE TABLE IF NOT EXISTS public.homepage_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_push_subscriptions_site ON public.homepage_push_subscriptions(site_id, active);
CREATE INDEX IF NOT EXISTS idx_homepage_push_subscriptions_user ON public.homepage_push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.homepage_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.homepage_estimate_submissions(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'pwa',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_homepage_notifications_site ON public.homepage_notifications(site_id, created_at DESC);

INSERT INTO public.homepage_templates (key, category, name, description, sort_order) VALUES
  ('showcase-basic', 'showcase', '기본 회사소개형', '회사소개, 서비스, 문의폼 중심의 기본 홈페이지입니다.', 10),
  ('showcase-portfolio', 'showcase', '시공사례 강조형', '블로그 포트폴리오와 현장 사례를 크게 보여줍니다.', 20),
  ('showcase-local', 'showcase', '지역업체 신뢰형', '지역명, 후기, 빠른 문의를 강조합니다.', 30),
  ('sales-reviews', 'sales', '후기 전환형', '후기와 사례를 보다가 견적계산기로 자연스럽게 이동합니다.', 40),
  ('sales-services', 'sales', '서비스 비교형', '서비스별 장점을 비교하고 견적계산기로 유도합니다.', 50),
  ('sales-fast-contact', 'sales', '빠른 상담형', '전화, 카카오톡, 견적계산 버튼을 계속 노출합니다.', 60),
  ('interactive-calculator', 'interactive', '계산기 첫화면형', '첫 화면에서 바로 예상 견적을 계산합니다.', 70),
  ('interactive-steps', 'interactive', '단계형 계산기형', '지역, 평수, 옵션을 단계적으로 입력합니다.', 80),
  ('interactive-campaign', 'interactive', '캠페인 랜딩형', '빠른 견적 확인과 상담 전환에 집중합니다.', 90)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.homepage_calculator_templates (industry, name, default_settings) VALUES
  (
    'move_in_cleaning',
    '입주청소 / 이사청소',
    '{
      "base_unit_price": 13000,
      "minimum_price": 250000,
      "pollution_extra_light": 0,
      "pollution_extra_normal": 0,
      "pollution_extra_heavy": 50000,
      "no_elevator_extra": 30000,
      "region_extras": {},
      "option_extras": { "balcony": 30000, "window": 40000, "mold": 50000 },
      "discount_rate": 0,
      "result_notice": "실제 견적은 오염도, 구조, 현장 상황에 따라 달라질 수 있습니다.",
      "caution_note": "방문 상담 후 최종 금액이 확정됩니다."
    }'::jsonb
  )
ON CONFLICT (industry) DO UPDATE SET
  name = EXCLUDED.name,
  default_settings = EXCLUDED.default_settings,
  is_active = true;

ALTER TABLE public.homepage_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_admin_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_calculator_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_calculator_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_estimate_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_blog_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage templates public read" ON public.homepage_templates;
CREATE POLICY "homepage templates public read" ON public.homepage_templates
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "homepage calculator templates public read" ON public.homepage_calculator_templates;
CREATE POLICY "homepage calculator templates public read" ON public.homepage_calculator_templates
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "homepage public sites read" ON public.homepage_sites;
CREATE POLICY "homepage public sites read" ON public.homepage_sites
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "homepage public domains read" ON public.homepage_domains;
CREATE POLICY "homepage public domains read" ON public.homepage_domains
  FOR SELECT USING (verified = true);

DROP POLICY IF EXISTS "homepage public calculators read" ON public.homepage_calculator_settings;
CREATE POLICY "homepage public calculators read" ON public.homepage_calculator_settings
  FOR SELECT USING (
    enabled = true
    AND EXISTS (
      SELECT 1 FROM public.homepage_sites s
      WHERE s.id = homepage_calculator_settings.site_id
        AND s.status = 'published'
    )
  );

DROP POLICY IF EXISTS "homepage public blog posts read" ON public.homepage_blog_posts;
CREATE POLICY "homepage public blog posts read" ON public.homepage_blog_posts
  FOR SELECT USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM public.homepage_sites s
      WHERE s.id = homepage_blog_posts.site_id
        AND s.status = 'published'
    )
  );

DROP POLICY IF EXISTS "homepage admin member read own" ON public.homepage_admin_members;
CREATE POLICY "homepage admin member read own" ON public.homepage_admin_members
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "homepage admin sites manage" ON public.homepage_sites;
CREATE POLICY "homepage admin sites manage" ON public.homepage_sites
  FOR ALL USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_sites.id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (select auth.uid())
        AND u.role IN ('admin', 'platform_admin')
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_sites.id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (select auth.uid())
        AND u.role IN ('admin', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "homepage admin related manage domains" ON public.homepage_domains;
CREATE POLICY "homepage admin related manage domains" ON public.homepage_domains
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_domains.site_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_domains.site_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "homepage admin related manage calculators" ON public.homepage_calculator_settings;
CREATE POLICY "homepage admin related manage calculators" ON public.homepage_calculator_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_calculator_settings.site_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_calculator_settings.site_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "homepage admin related manage submissions" ON public.homepage_estimate_submissions;
CREATE POLICY "homepage admin related manage submissions" ON public.homepage_estimate_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_estimate_submissions.site_id
        AND m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_estimate_submissions.site_id
        AND m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "homepage admin related manage blog sources" ON public.homepage_blog_sources;
CREATE POLICY "homepage admin related manage blog sources" ON public.homepage_blog_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_blog_sources.site_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_blog_sources.site_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "homepage admin related manage blog posts" ON public.homepage_blog_posts;
CREATE POLICY "homepage admin related manage blog posts" ON public.homepage_blog_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_blog_posts.site_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_blog_posts.site_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "homepage admin own push subscriptions" ON public.homepage_push_subscriptions;
CREATE POLICY "homepage admin own push subscriptions" ON public.homepage_push_subscriptions
  FOR ALL USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "homepage admin notifications read" ON public.homepage_notifications;
CREATE POLICY "homepage admin notifications read" ON public.homepage_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_notifications.site_id
        AND m.user_id = (select auth.uid())
    )
  );
