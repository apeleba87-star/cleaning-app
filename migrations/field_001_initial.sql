-- MUPL Field (현장 Before/After + 고객 Report) initial schema
-- Design: docs/architecture/02-data-model.md, 03-media-pipeline.md
--
-- Run once in Supabase SQL Editor.
-- After running: Dashboard > Project Settings > API > Exposed schemas 에 `field` 추가.

BEGIN;

CREATE SCHEMA IF NOT EXISTS field;

GRANT USAGE ON SCHEMA field TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Types (시스템 내부 상태값만 ENUM. 업무 분류는 참조 테이블)
-- ---------------------------------------------------------------------------
CREATE TYPE field.member_role    AS ENUM ('owner');
CREATE TYPE field.project_status AS ENUM ('in_progress', 'completed');
CREATE TYPE field.media_role     AS ENUM ('before', 'after');
CREATE TYPE field.media_status   AS ENUM ('pending', 'uploaded', 'failed');
CREATE TYPE field.share_status   AS ENUM ('active', 'revoked');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE field.companies (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  max_photos_per_project  int CHECK (max_photos_per_project > 0),
  created_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz
);

CREATE TABLE field.company_members (
  company_id  uuid NOT NULL REFERENCES field.companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        field.member_role NOT NULL DEFAULT 'owner',
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE field.service_types (
  code        text PRIMARY KEY CHECK (code ~ '^[A-Z][A-Z0-9_]{1,29}$'),
  label_ko    text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

INSERT INTO field.service_types (code, label_ko, sort_order) VALUES
  ('MOVE_IN',    '입주청소',       10),
  ('MOVE_OUT',   '이사청소',       20),
  ('OFFICE',     '사무실청소',     30),
  ('REGULAR',    '정기청소',       40),
  ('COMMERCIAL', '상가·매장청소',  50),
  ('ETC',        '기타',          999);

CREATE TABLE field.projects (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES field.companies(id),
  title                text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  service_type_code    text NOT NULL REFERENCES field.service_types(code) ON UPDATE RESTRICT,
  service_type_note    text CHECK (char_length(service_type_note) <= 50),
  region_sido_code     text CHECK (region_sido_code ~ '^[0-9]{2}$'),
  region_sigungu_code  text CHECK (region_sigungu_code ~ '^[0-9]{5}$'),
  region_sido_name     text CHECK (char_length(region_sido_name) <= 20),
  region_sigungu_name  text CHECK (char_length(region_sigungu_name) <= 30),
  work_date            date,
  status               field.project_status NOT NULL DEFAULT 'in_progress',
  created_by           uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz,
  CONSTRAINT region_code_consistent
    CHECK (region_sigungu_code IS NULL OR left(region_sigungu_code, 2) = region_sido_code)
);

CREATE TABLE field.project_private_details (
  project_id      uuid PRIMARY KEY REFERENCES field.projects(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES field.companies(id),
  customer_name   text CHECK (char_length(customer_name) <= 50),
  customer_phone  text CHECK (char_length(customer_phone) <= 20),
  address_road    text CHECK (char_length(address_road) <= 200),
  address_detail  text CHECK (char_length(address_detail) <= 100),
  memo            text CHECK (char_length(memo) <= 1000),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE field.areas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES field.companies(id),
  project_id  uuid NOT NULL REFERENCES field.projects(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE TABLE field.photo_pairs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid NOT NULL REFERENCES field.companies(id),
  project_id         uuid NOT NULL REFERENCES field.projects(id) ON DELETE CASCADE,
  area_id            uuid NOT NULL REFERENCES field.areas(id) ON DELETE CASCADE,
  caption            text CHECK (char_length(caption) <= 200),
  include_in_report  boolean NOT NULL DEFAULT true,
  sort_order         int NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE TABLE field.media_assets (
  id                uuid PRIMARY KEY,
  company_id        uuid NOT NULL REFERENCES field.companies(id),
  project_id        uuid NOT NULL REFERENCES field.projects(id) ON DELETE CASCADE,
  photo_pair_id     uuid NOT NULL REFERENCES field.photo_pairs(id) ON DELETE CASCADE,
  role              field.media_role NOT NULL,
  provider          text NOT NULL DEFAULT 'supabase',
  bucket            text NOT NULL DEFAULT 'project-media',
  storage_path      text NOT NULL,
  thumb_path        text NOT NULL,
  mime_type         text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/webp')),
  width             int CHECK (width BETWEEN 1 AND 10000),
  height            int CHECK (height BETWEEN 1 AND 10000),
  size_bytes        int CHECK (size_bytes <= 1048576),
  thumb_size_bytes  int CHECK (thumb_size_bytes <= 102400),
  status            field.media_status NOT NULL DEFAULT 'pending',
  captured_at       timestamptz,
  created_by        uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  uploaded_at       timestamptz,
  deleted_at        timestamptz
);

CREATE TABLE field.report_shares (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES field.companies(id),
  project_id      uuid NOT NULL REFERENCES field.projects(id) ON DELETE CASCADE,
  token_hash      bytea NOT NULL UNIQUE,
  status          field.share_status NOT NULL DEFAULT 'active',
  expires_at      timestamptz,
  view_count      int NOT NULL DEFAULT 0,
  last_viewed_at  timestamptz,
  created_by      uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes (docs/architecture/02-data-model.md "I. 주요 Query와 Index")
-- ---------------------------------------------------------------------------
CREATE INDEX company_members_user_idx ON field.company_members (user_id);

CREATE INDEX projects_company_recent_idx
  ON field.projects (company_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX projects_deleted_idx
  ON field.projects (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX areas_project_idx ON field.areas (project_id, sort_order);

CREATE INDEX photo_pairs_area_idx    ON field.photo_pairs (area_id, sort_order);
CREATE INDEX photo_pairs_project_idx ON field.photo_pairs (project_id, sort_order);

CREATE UNIQUE INDEX media_assets_pair_role_uq
  ON field.media_assets (photo_pair_id, role) WHERE deleted_at IS NULL;
CREATE INDEX media_assets_project_idx
  ON field.media_assets (project_id) WHERE deleted_at IS NULL;
CREATE INDEX media_assets_unfinished_idx
  ON field.media_assets (created_at) WHERE status <> 'uploaded';

CREATE INDEX report_shares_project_idx ON field.report_shares (project_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
CREATE FUNCTION field.my_company_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT company_id FROM field.company_members WHERE user_id = auth.uid()
$$;

CREATE FUNCTION field.photo_limit_per_project(p_company_id uuid) RETURNS int
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT max_photos_per_project FROM field.companies WHERE id = p_company_id),
    1000
  )
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE FUNCTION field.tg_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON field.projects
  FOR EACH ROW EXECUTE FUNCTION field.tg_set_updated_at();
CREATE TRIGGER project_private_details_updated_at BEFORE UPDATE ON field.project_private_details
  FOR EACH ROW EXECUTE FUNCTION field.tg_set_updated_at();

-- 자식 행의 company_id / project_id 가 부모와 일치하는지 강제
CREATE FUNCTION field.tg_check_parent_project() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM field.projects p
    WHERE p.id = NEW.project_id AND p.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'company_mismatch' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_private_details_parent BEFORE INSERT OR UPDATE ON field.project_private_details
  FOR EACH ROW EXECUTE FUNCTION field.tg_check_parent_project();
CREATE TRIGGER areas_parent BEFORE INSERT OR UPDATE ON field.areas
  FOR EACH ROW EXECUTE FUNCTION field.tg_check_parent_project();
CREATE TRIGGER report_shares_parent BEFORE INSERT ON field.report_shares
  FOR EACH ROW EXECUTE FUNCTION field.tg_check_parent_project();

CREATE FUNCTION field.tg_check_parent_area() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM field.areas a
    WHERE a.id = NEW.area_id AND a.project_id = NEW.project_id AND a.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'company_mismatch' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER photo_pairs_parent BEFORE INSERT OR UPDATE ON field.photo_pairs
  FOR EACH ROW EXECUTE FUNCTION field.tg_check_parent_area();

CREATE FUNCTION field.tg_check_media_asset() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_prefix text;
  v_count  int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM field.photo_pairs pp
    WHERE pp.id = NEW.photo_pair_id AND pp.project_id = NEW.project_id AND pp.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'company_mismatch' USING ERRCODE = '42501';
  END IF;

  v_prefix := 'companies/' || NEW.company_id || '/projects/' || NEW.project_id || '/' || NEW.id;
  IF NEW.storage_path NOT IN (v_prefix || '.jpg', v_prefix || '.webp')
     OR NEW.thumb_path <> v_prefix || '_t.webp' THEN
    RAISE EXCEPTION 'invalid_storage_path' USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO v_count
    FROM field.media_assets m
    WHERE m.project_id = NEW.project_id AND m.deleted_at IS NULL;

    IF v_count >= field.photo_limit_per_project(NEW.company_id) THEN
      RAISE EXCEPTION 'photo_limit_exceeded' USING ERRCODE = '54000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER media_assets_check BEFORE INSERT OR UPDATE ON field.media_assets
  FOR EACH ROW EXECUTE FUNCTION field.tg_check_media_asset();

CREATE FUNCTION field.tg_report_share_revoked() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'revoked' AND OLD.status <> 'revoked' THEN
    NEW.revoked_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER report_shares_revoked BEFORE UPDATE ON field.report_shares
  FOR EACH ROW EXECUTE FUNCTION field.tg_report_share_revoked();

-- ---------------------------------------------------------------------------
-- Privileges (anon: 테이블 권한 없음. 컬럼 단위 UPDATE로 id/company_id 변경 차단)
-- ---------------------------------------------------------------------------
GRANT SELECT ON field.companies, field.company_members, field.service_types,
                field.projects, field.project_private_details, field.areas,
                field.photo_pairs, field.media_assets, field.report_shares
  TO authenticated;

GRANT UPDATE (name) ON field.companies TO authenticated;

GRANT INSERT ON field.projects TO authenticated;
GRANT UPDATE (title, service_type_code, service_type_note,
              region_sido_code, region_sigungu_code, region_sido_name, region_sigungu_name,
              work_date, status, deleted_at)
  ON field.projects TO authenticated;

GRANT INSERT ON field.project_private_details TO authenticated;
GRANT UPDATE (customer_name, customer_phone, address_road, address_detail, memo)
  ON field.project_private_details TO authenticated;

GRANT INSERT ON field.areas TO authenticated;
GRANT UPDATE (name, sort_order, deleted_at) ON field.areas TO authenticated;

GRANT INSERT ON field.photo_pairs TO authenticated;
GRANT UPDATE (caption, include_in_report, sort_order, deleted_at) ON field.photo_pairs TO authenticated;

GRANT INSERT ON field.media_assets TO authenticated;
GRANT UPDATE (deleted_at) ON field.media_assets TO authenticated;

GRANT UPDATE (status) ON field.report_shares TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA field TO service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE field.companies               ENABLE ROW LEVEL SECURITY;
ALTER TABLE field.company_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE field.service_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE field.projects                ENABLE ROW LEVEL SECURITY;
ALTER TABLE field.project_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE field.areas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE field.photo_pairs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE field.media_assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE field.report_shares           ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select ON field.companies FOR SELECT TO authenticated
  USING (id IN (SELECT field.my_company_ids()));
CREATE POLICY companies_update ON field.companies FOR UPDATE TO authenticated
  USING (id IN (SELECT field.my_company_ids()))
  WITH CHECK (id IN (SELECT field.my_company_ids()));

CREATE POLICY company_members_select ON field.company_members FOR SELECT TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()));

CREATE POLICY service_types_select ON field.service_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY projects_select ON field.projects FOR SELECT TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY projects_insert ON field.projects FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY projects_update ON field.projects FOR UPDATE TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()))
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));

CREATE POLICY private_details_select ON field.project_private_details FOR SELECT TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY private_details_insert ON field.project_private_details FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY private_details_update ON field.project_private_details FOR UPDATE TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()))
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));

CREATE POLICY areas_select ON field.areas FOR SELECT TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY areas_insert ON field.areas FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY areas_update ON field.areas FOR UPDATE TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()))
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));

CREATE POLICY photo_pairs_select ON field.photo_pairs FOR SELECT TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY photo_pairs_insert ON field.photo_pairs FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY photo_pairs_update ON field.photo_pairs FOR UPDATE TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()))
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));

CREATE POLICY media_assets_select ON field.media_assets FOR SELECT TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY media_assets_insert ON field.media_assets FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT field.my_company_ids())
    AND status = 'pending'
    AND provider = 'supabase'
    AND bucket = 'project-media'
    AND uploaded_at IS NULL
    AND deleted_at IS NULL
  );
CREATE POLICY media_assets_update ON field.media_assets FOR UPDATE TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()))
  WITH CHECK (company_id IN (SELECT field.my_company_ids()));

CREATE POLICY report_shares_select ON field.report_shares FOR SELECT TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()));
CREATE POLICY report_shares_revoke ON field.report_shares FOR UPDATE TO authenticated
  USING (company_id IN (SELECT field.my_company_ids()))
  WITH CHECK (company_id IN (SELECT field.my_company_ids()) AND status = 'revoked');

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- 회사 + owner 멤버십을 한 트랜잭션으로 생성 (MVP: 사용자당 회사 1개)
CREATE FUNCTION field.create_company(p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_company_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM field.company_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'company_already_exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO field.companies (name) VALUES (btrim(p_name)) RETURNING id INTO v_company_id;
  INSERT INTO field.company_members (company_id, user_id, role) VALUES (v_company_id, v_uid, 'owner');
  RETURN v_company_id;
END;
$$;

-- Storage에 실제 파일이 있는지 검증한 뒤에만 uploaded 로 확정. 크기는 Storage 메타데이터 기준
CREATE FUNCTION field.mark_asset_uploaded(p_asset_id uuid) RETURNS field.media_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_asset field.media_assets%ROWTYPE;
  v_full  record;
  v_thumb record;
BEGIN
  SELECT * INTO v_asset FROM field.media_assets WHERE id = p_asset_id;

  IF NOT FOUND OR v_asset.company_id NOT IN (SELECT field.my_company_ids()) THEN
    RAISE EXCEPTION 'asset_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_asset.status = 'uploaded' THEN
    RETURN v_asset.status;
  END IF;
  IF v_asset.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'asset_deleted' USING ERRCODE = '22023';
  END IF;

  SELECT (o.metadata->>'size')::int AS size, o.metadata->>'mimetype' AS mimetype INTO v_full
  FROM storage.objects o
  WHERE o.bucket_id = v_asset.bucket AND o.name = v_asset.storage_path;

  SELECT (o.metadata->>'size')::int AS size, o.metadata->>'mimetype' AS mimetype INTO v_thumb
  FROM storage.objects o
  WHERE o.bucket_id = v_asset.bucket AND o.name = v_asset.thumb_path;

  IF v_full.size IS NULL OR v_thumb.size IS NULL THEN
    RAISE EXCEPTION 'file_missing' USING ERRCODE = 'P0002';
  END IF;
  IF v_full.size > 1048576 OR v_thumb.size > 102400
     OR v_full.mimetype <> v_asset.mime_type OR v_thumb.mimetype <> 'image/webp' THEN
    RAISE EXCEPTION 'file_invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE field.media_assets
  SET status = 'uploaded',
      uploaded_at = now(),
      size_bytes = v_full.size,
      thumb_size_bytes = v_thumb.size
  WHERE id = p_asset_id;

  RETURN 'uploaded'::field.media_status;
END;
$$;

-- 원문 token은 이 응답에서 한 번만 반환. DB에는 sha256 만 저장
CREATE FUNCTION field.create_report_share(p_project_id uuid, p_expires_at timestamptz DEFAULT NULL)
RETURNS TABLE (share_id uuid, token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_token text;
BEGIN
  SELECT p.company_id INTO v_company_id
  FROM field.projects p
  WHERE p.id = p_project_id
    AND p.deleted_at IS NULL
    AND p.company_id IN (SELECT field.my_company_ids());

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_expires_at' USING ERRCODE = '22023';
  END IF;

  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');

  INSERT INTO field.report_shares (company_id, project_id, token_hash, expires_at, created_by)
  VALUES (v_company_id, p_project_id, extensions.digest(v_token, 'sha256'), p_expires_at, auth.uid())
  RETURNING id INTO share_id;

  token := v_token;
  RETURN NEXT;
END;
$$;

-- 내부용: token → 유효한 share 의 project. anon에게 직접 노출하지 않음
CREATE FUNCTION field._resolve_share(p_token text)
RETURNS TABLE (share_id uuid, project_id uuid, company_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT s.id, s.project_id, s.company_id
  FROM field.report_shares s
  JOIN field.projects p ON p.id = s.project_id
  JOIN field.companies c ON c.id = s.company_id
  WHERE p_token ~ '^[A-Za-z0-9_-]{43}$'
    AND s.token_hash = extensions.digest(p_token, 'sha256')
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND p.deleted_at IS NULL
    AND c.deleted_at IS NULL
$$;

-- 내부용: Report에 보여줄 PhotoPair 한 페이지 (개인정보 없음)
CREATE FUNCTION field._report_pairs(p_project_id uuid, p_offset int, p_limit int) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(x.pair ORDER BY x.area_order, x.area_created, x.pair_order, x.pair_created), '[]'::jsonb)
  FROM (
    SELECT
      a.sort_order AS area_order, a.created_at AS area_created,
      pp.sort_order AS pair_order, pp.created_at AS pair_created,
      jsonb_build_object(
        'id', pp.id,
        'area_id', pp.area_id,
        'caption', pp.caption,
        'before', (
          SELECT jsonb_build_object('path', m.storage_path, 'thumb_path', m.thumb_path,
                                    'width', m.width, 'height', m.height)
          FROM field.media_assets m
          WHERE m.photo_pair_id = pp.id AND m.role = 'before'
            AND m.status = 'uploaded' AND m.deleted_at IS NULL
        ),
        'after', (
          SELECT jsonb_build_object('path', m.storage_path, 'thumb_path', m.thumb_path,
                                    'width', m.width, 'height', m.height)
          FROM field.media_assets m
          WHERE m.photo_pair_id = pp.id AND m.role = 'after'
            AND m.status = 'uploaded' AND m.deleted_at IS NULL
        )
      ) AS pair
    FROM field.photo_pairs pp
    JOIN field.areas a ON a.id = pp.area_id
    WHERE pp.project_id = p_project_id
      AND pp.deleted_at IS NULL
      AND a.deleted_at IS NULL
      AND pp.include_in_report
      AND EXISTS (
        SELECT 1 FROM field.media_assets m
        WHERE m.photo_pair_id = pp.id AND m.status = 'uploaded' AND m.deleted_at IS NULL
      )
    ORDER BY a.sort_order, a.created_at, pp.sort_order, pp.created_at
    OFFSET greatest(p_offset, 0)
    LIMIT least(greatest(p_limit, 1), 24)
  ) x
$$;

-- 고객 Report 첫 화면: 헤더 + 공간 목록 + 첫 12쌍. 조회수 갱신
CREATE FUNCTION field.get_report(p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_share record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_share FROM field._resolve_share(p_token);
  IF v_share.share_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE field.report_shares
  SET view_count = view_count + 1, last_viewed_at = now()
  WHERE id = v_share.share_id;

  SELECT jsonb_build_object(
    'company_name', c.name,
    'title', p.title,
    'service_type', st.label_ko,
    'region', nullif(concat_ws(' ', p.region_sido_name, p.region_sigungu_name), ''),
    'work_date', p.work_date,
    'status', p.status,
    'areas', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name) ORDER BY a.sort_order, a.created_at)
      FROM field.areas a
      WHERE a.project_id = p.id AND a.deleted_at IS NULL
    ), '[]'::jsonb),
    'total_pairs', (
      SELECT count(*)
      FROM field.photo_pairs pp
      JOIN field.areas a ON a.id = pp.area_id
      WHERE pp.project_id = p.id AND pp.deleted_at IS NULL AND a.deleted_at IS NULL
        AND pp.include_in_report
        AND EXISTS (
          SELECT 1 FROM field.media_assets m
          WHERE m.photo_pair_id = pp.id AND m.status = 'uploaded' AND m.deleted_at IS NULL
        )
    ),
    'pairs', field._report_pairs(p.id, 0, 12)
  ) INTO v_result
  FROM field.projects p
  JOIN field.companies c ON c.id = p.company_id
  JOIN field.service_types st ON st.code = p.service_type_code
  WHERE p.id = v_share.project_id;

  RETURN v_result;
END;
$$;

-- 고객 Report 다음 페이지 (최대 24쌍)
CREATE FUNCTION field.get_report_media(p_token text, p_offset int, p_limit int DEFAULT 24) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT r.project_id INTO v_project_id FROM field._resolve_share(p_token) r;
  IF v_project_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN field._report_pairs(v_project_id, p_offset, p_limit);
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA field FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION field.my_company_ids()                          TO authenticated;
GRANT EXECUTE ON FUNCTION field.photo_limit_per_project(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION field.create_company(text)                      TO authenticated;
GRANT EXECUTE ON FUNCTION field.mark_asset_uploaded(uuid)                 TO authenticated;
GRANT EXECUTE ON FUNCTION field.create_report_share(uuid, timestamptz)    TO authenticated;
GRANT EXECUTE ON FUNCTION field.get_report(text)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION field.get_report_media(text, int, int)          TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA field                            TO service_role;

-- ---------------------------------------------------------------------------
-- Storage: private bucket + 회사 경로 정책
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-media', 'project-media', false, 1048576, ARRAY['image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 경로: companies/{company_id}/projects/{project_id}/{asset_id}(.jpg|.webp|_t.webp)
-- 덮어쓰기(UPDATE)와 삭제(DELETE) 정책은 두지 않는다. 재시도 시 이미 있으면 409 = 성공으로 처리
CREATE POLICY field_media_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-media'
    AND name ~ '^companies/[0-9a-f-]{36}/projects/[0-9a-f-]{36}/[0-9a-f-]{36}(\.jpg|\.webp|_t\.webp)$'
    AND split_part(name, '/', 2) IN (SELECT id::text FROM field.my_company_ids() AS id)
  );

CREATE POLICY field_media_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-media'
    AND split_part(name, '/', 2) IN (SELECT id::text FROM field.my_company_ids() AS id)
  );

COMMIT;
