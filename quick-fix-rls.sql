-- 빠른 RLS 정책 수정 (store_files 테이블)
-- Supabase SQL Editor에서 실행하세요

-- INSERT 정책 추가
CREATE POLICY IF NOT EXISTS "Business owners can insert their company store files"
  ON public.store_files
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- DELETE 정책 추가
CREATE POLICY IF NOT EXISTS "Business owners can delete their company store files"
  ON public.store_files
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

