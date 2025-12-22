-- store_files RLS 정책 수정 (간단 버전)
-- Supabase SQL Editor에서 실행하세요

ALTER TABLE public.store_files ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Business owners can insert their company store files" ON public.store_files;
DROP POLICY IF EXISTS "Business owners can delete their company store files" ON public.store_files;

-- INSERT 정책 (생성)
CREATE POLICY "Business owners can insert their company store files"
  ON public.store_files
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = auth.uid()
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- DELETE 정책 (삭제)
CREATE POLICY "Business owners can delete their company store files"
  ON public.store_files
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = auth.uid()
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

