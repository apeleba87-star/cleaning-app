-- MUPL V2 initial schema (shares auth.users only with V1)
-- Run in Supabase SQL Editor

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE v2_user_role AS ENUM ('staff', 'business_owner', 'store_manager', 'platform_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_assignment_role AS ENUM ('staff', 'store_manager');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_issue_status AS ENUM (
    'pending', 'approved', 'rejected', 'acknowledged', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_issue_type AS ENUM ('problem', 'shortage', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_ad_campaign_status AS ENUM ('draft', 'active', 'paused', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Companies & users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region_sido TEXT,
  region_sigungu TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES v2_companies(id) ON DELETE SET NULL,
  role v2_user_role NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_users_company ON v2_users(company_id);
CREATE INDEX IF NOT EXISTS idx_v2_users_role ON v2_users(role);

-- ---------------------------------------------------------------------------
-- Stores & assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES v2_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  region_sido TEXT,
  region_sigungu TEXT,
  management_days TEXT,
  is_night_shift BOOLEAN NOT NULL DEFAULT false,
  work_start_hour INT NOT NULL DEFAULT 18,
  work_end_hour INT NOT NULL DEFAULT 8,
  service_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_v2_stores_company ON v2_stores(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_v2_stores_region ON v2_stores(region_sido, region_sigungu) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS v2_store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES v2_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
  assignment_role v2_assignment_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_assign_store ON v2_store_assignments(store_id);
CREATE INDEX IF NOT EXISTS idx_v2_assign_user ON v2_store_assignments(user_id);

-- ---------------------------------------------------------------------------
-- Store notes (field-level visibility)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_store_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES v2_stores(id) ON DELETE CASCADE,
  note_key TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  visible_to_staff BOOLEAN NOT NULL DEFAULT false,
  visible_to_store_manager BOOLEAN NOT NULL DEFAULT true,
  visible_to_owner BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, note_key)
);

-- note_key: entrance_password, cleaning_notes, payment_date, payment_amount, manager_memo

-- ---------------------------------------------------------------------------
-- Checklist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES v2_stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '기본 체크리스트',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_cl_template_store ON v2_checklist_templates(store_id);

CREATE TABLE IF NOT EXISTS v2_checklist_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES v2_stores(id) ON DELETE CASCADE,
  template_id UUID REFERENCES v2_checklist_templates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_v2_cl_run_store_date ON v2_checklist_runs(store_id, work_date);

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES v2_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_attendance_store_date ON v2_attendance(store_id, work_date);
CREATE INDEX IF NOT EXISTS idx_v2_attendance_user_date ON v2_attendance(user_id, work_date);

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_photo_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES v2_stores(id) ON DELETE CASCADE,
  checklist_run_id UUID REFERENCES v2_checklist_runs(id) ON DELETE SET NULL,
  issue_id UUID,
  user_id UUID REFERENCES v2_users(id) ON DELETE SET NULL,
  work_date DATE,
  kind TEXT NOT NULL DEFAULT 'after',
  storage_path TEXT NOT NULL,
  thumb_path TEXT,
  size_bytes INT,
  memo TEXT,
  upload_status TEXT NOT NULL DEFAULT 'uploaded',
  client_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_photos_store_date ON v2_photo_assets(store_id, work_date, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_photos_issue ON v2_photo_assets(issue_id) WHERE issue_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Issues
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_store_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES v2_stores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES v2_companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
  issue_type v2_issue_type NOT NULL DEFAULT 'problem',
  title TEXT NOT NULL,
  description TEXT,
  item_name TEXT,
  requested_quantity TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal',
  resolution_type TEXT,
  status v2_issue_status NOT NULL DEFAULT 'pending',
  needs_approval BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES v2_users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_issues_store ON v2_store_issues(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_issues_company ON v2_store_issues(company_id, status);

CREATE TABLE IF NOT EXISTS v2_issue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES v2_store_issues(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES v2_users(id),
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Ads (direct sales)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_ad_slots (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT
);

INSERT INTO v2_ad_slots (key, label, description) VALUES
  ('staff_home', '직원 홈', '직원 대시보드 상단/중간'),
  ('staff_clock_in', '출근 후', '출근 완료 직후 노출'),
  ('manage_dashboard', '관리자 대시보드', '업체관리자 대시보드'),
  ('manage_store_list', '매장 목록', '매장 목록 상단'),
  ('store_mgr_dashboard', '매장관리자 대시보드', '매장관리자 홈')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS v2_ad_advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID REFERENCES v2_ad_advertisers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status v2_ad_campaign_status NOT NULL DEFAULT 'draft',
  slot_key TEXT NOT NULL REFERENCES v2_ad_slots(key),
  priority INT NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  target_regions TEXT[] DEFAULT '{}',
  target_roles v2_user_role[] DEFAULT '{}',
  interstitial_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES v2_ad_campaigns(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  image_url TEXT,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_ad_impressions_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES v2_ad_campaigns(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  impression_date DATE NOT NULL DEFAULT CURRENT_DATE,
  impression_count INT NOT NULL DEFAULT 0,
  click_count INT NOT NULL DEFAULT 0,
  UNIQUE(campaign_id, slot_key, impression_date)
);

-- ---------------------------------------------------------------------------
-- Helper: current v2 user company
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v2_current_user_row()
RETURNS v2_users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM v2_users WHERE id = auth.uid() LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- RLS enable
-- ---------------------------------------------------------------------------
ALTER TABLE v2_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_store_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_store_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_checklist_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_photo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_store_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_issue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_ad_creatives ENABLE ROW LEVEL SECURITY;

-- v2_users: read own row; owners read company users
DROP POLICY IF EXISTS v2_users_select_own ON v2_users;
CREATE POLICY v2_users_select_own ON v2_users FOR SELECT
  USING (
    id = auth.uid()
    OR (
      company_id IS NOT NULL
      AND company_id = (SELECT company_id FROM v2_users WHERE id = auth.uid())
      AND (SELECT role FROM v2_users WHERE id = auth.uid()) IN ('business_owner', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS v2_users_update_own ON v2_users;
CREATE POLICY v2_users_update_own ON v2_users FOR UPDATE
  USING (id = auth.uid());

-- Companies: members read own company
DROP POLICY IF EXISTS v2_companies_select ON v2_companies;
CREATE POLICY v2_companies_select ON v2_companies FOR SELECT
  USING (
    id = (SELECT company_id FROM v2_users WHERE id = auth.uid())
    OR (SELECT role FROM v2_users WHERE id = auth.uid()) = 'platform_admin'
  );

-- Stores: company members
DROP POLICY IF EXISTS v2_stores_company ON v2_stores;
CREATE POLICY v2_stores_company ON v2_stores FOR SELECT
  USING (
    deleted_at IS NULL AND (
      company_id = (SELECT company_id FROM v2_users WHERE id = auth.uid())
      OR id IN (SELECT store_id FROM v2_store_assignments WHERE user_id = auth.uid())
      OR (SELECT role FROM v2_users WHERE id = auth.uid()) = 'platform_admin'
    )
  );

-- Ads: read active campaigns (public to authenticated)
DROP POLICY IF EXISTS v2_ad_campaigns_read ON v2_ad_campaigns;
CREATE POLICY v2_ad_campaigns_read ON v2_ad_campaigns FOR SELECT
  USING (status = 'active' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v2_ad_creatives_read ON v2_ad_creatives;
CREATE POLICY v2_ad_creatives_read ON v2_ad_creatives FOR SELECT
  USING (auth.uid() IS NOT NULL);
