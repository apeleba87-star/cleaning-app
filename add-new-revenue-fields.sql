-- revenues 테이블에 신규 매출 지원을 위한 컬럼 추가 및 수정
-- 1. store_id를 nullable로 변경
-- 2. revenue_name, revenue_memo 컬럼 추가

-- store_id를 nullable로 변경
ALTER TABLE public.revenues
  ALTER COLUMN store_id DROP NOT NULL;

-- revenue_name 컬럼 추가 (신규 매출명/설명)
ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS revenue_name TEXT;

-- revenue_memo 컬럼 추가 (신규 매출 메모)
ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS revenue_memo TEXT;

-- RLS 정책 수정: store_id가 null인 경우도 처리
DROP POLICY IF EXISTS "Business owners can view their company revenues" ON public.revenues;

CREATE POLICY "Business owners can view their company revenues"
  ON public.revenues
  FOR SELECT
  USING (
    -- store_id가 있는 경우: 기존 로직
    (store_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.users u ON u.company_id = s.company_id
      WHERE s.id = revenues.store_id
        AND u.id = (select auth.uid())
        AND u.role IN ('business_owner', 'platform_admin')
        AND s.deleted_at IS NULL
        AND (u.is_active = true OR u.is_active IS NULL)
    ))
    -- store_id가 null인 경우: company_id로만 확인
    OR (store_id IS NULL AND company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    ))
  );

-- INSERT 정책 추가
DROP POLICY IF EXISTS "Business owners can insert their company revenues" ON public.revenues;

CREATE POLICY "Business owners can insert their company revenues"
  ON public.revenues
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
    AND (
      -- store_id가 있는 경우: 매장이 회사에 속해있는지 확인
      (store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = revenues.store_id
          AND s.company_id = revenues.company_id
          AND s.deleted_at IS NULL
      ))
      -- store_id가 null인 경우: revenue_name이 필수
      OR (store_id IS NULL AND revenue_name IS NOT NULL)
    )
  );

-- UPDATE 정책 추가
DROP POLICY IF EXISTS "Business owners can update their company revenues" ON public.revenues;

CREATE POLICY "Business owners can update their company revenues"
  ON public.revenues
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- DELETE 정책 추가
DROP POLICY IF EXISTS "Business owners can delete their company revenues" ON public.revenues;

CREATE POLICY "Business owners can delete their company revenues"
  ON public.revenues
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );
