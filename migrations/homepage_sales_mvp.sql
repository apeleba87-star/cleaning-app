-- Homepage sales MVP extension
-- Run after homepage_platform_initial_schema.sql

ALTER TABLE public.homepage_sites
  ADD COLUMN IF NOT EXISTS logo_image_url TEXT,
  ADD COLUMN IF NOT EXISTS footer_company_name TEXT,
  ADD COLUMN IF NOT EXISTS footer_representative TEXT,
  ADD COLUMN IF NOT EXISTS footer_business_number TEXT,
  ADD COLUMN IF NOT EXISTS footer_email TEXT,
  ADD COLUMN IF NOT EXISTS footer_address TEXT,
  ADD COLUMN IF NOT EXISTS footer_phone TEXT,
  ADD COLUMN IF NOT EXISTS footer_business_hours TEXT,
  ADD COLUMN IF NOT EXISTS footer_privacy_url TEXT,
  ADD COLUMN IF NOT EXISTS footer_terms_url TEXT,
  ADD COLUMN IF NOT EXISTS footer_note TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_noindex BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seo_naver_verification TEXT,
  ADD COLUMN IF NOT EXISTS seo_google_verification TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS product_price_note TEXT,
  ADD COLUMN IF NOT EXISTS product_included_features TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_badges JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.homepage_domains
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS dns_target TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'error')),
  ADD COLUMN IF NOT EXISTS verification_error TEXT,
  ADD COLUMN IF NOT EXISTS ssl_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ssl_status IN ('pending', 'issued', 'error')),
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

ALTER TABLE public.homepage_estimate_submissions
  ADD COLUMN IF NOT EXISTS contact_method TEXT NOT NULL DEFAULT 'form'
    CHECK (contact_method IN ('form', 'phone_click', 'kakao_click', 'test')),
  ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  ADD COLUMN IF NOT EXISTS source_campaign TEXT,
  ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;

CREATE TABLE IF NOT EXISTS public.homepage_media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'gallery'
    CHECK (item_type IN ('gallery', 'before_after', 'portfolio', 'after_photo')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  image_url TEXT NOT NULL,
  before_image_url TEXT,
  after_image_url TEXT,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_media_items_public
  ON public.homepage_media_items(site_id, item_type, is_visible, sort_order);

CREATE TABLE IF NOT EXISTS public.homepage_onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.homepage_sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewing', 'applied', 'archived')),
  business_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT,
  contact_phone TEXT,
  phone TEXT,
  kakao_url TEXT,
  blog_url TEXT,
  naver_place_url TEXT,
  instagram_url TEXT,
  service_area TEXT,
  address TEXT,
  business_hours TEXT,
  hero_headline TEXT,
  hero_subheadline TEXT,
  company_intro TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  pricing_notes TEXT[] NOT NULL DEFAULT '{}',
  reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_image_url TEXT,
  representative_images TEXT[] NOT NULL DEFAULT '{}',
  portfolio_images TEXT[] NOT NULL DEFAULT '{}',
  before_after_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  footer_representative TEXT,
  footer_business_number TEXT,
  footer_email TEXT,
  footer_address TEXT,
  footer_note TEXT,
  reference_urls TEXT[] NOT NULL DEFAULT '{}',
  request_note TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_onboarding_submissions_site
  ON public.homepage_onboarding_submissions(site_id, status, created_at DESC);

ALTER TABLE public.homepage_media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_onboarding_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage media public read" ON public.homepage_media_items;
CREATE POLICY "homepage media public read" ON public.homepage_media_items
  FOR SELECT USING (
    is_visible = true AND EXISTS (
      SELECT 1
      FROM public.homepage_sites s
      WHERE s.id = homepage_media_items.site_id
        AND s.status = 'published'
    )
  );

DROP POLICY IF EXISTS "homepage media admin read" ON public.homepage_media_items;
CREATE POLICY "homepage media admin read" ON public.homepage_media_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_media_items.site_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "homepage media admin write" ON public.homepage_media_items;
CREATE POLICY "homepage media admin write" ON public.homepage_media_items
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_media_items.site_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_media_items.site_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "homepage onboarding admin read" ON public.homepage_onboarding_submissions;
CREATE POLICY "homepage onboarding admin read" ON public.homepage_onboarding_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_onboarding_submissions.site_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "homepage onboarding admin write" ON public.homepage_onboarding_submissions;
CREATE POLICY "homepage onboarding admin write" ON public.homepage_onboarding_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_onboarding_submissions.site_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.homepage_admin_members m
      WHERE m.site_id = homepage_onboarding_submissions.site_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  );
