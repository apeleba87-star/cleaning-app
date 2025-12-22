-- store_files RLS 정책 수정
-- INSERT 및 DELETE 정책 추가

ALTER TABLE public.store_files ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Business owners can view their company store files" ON public.store_files;
DROP POLICY IF EXISTS "Business owners can insert their company store files" ON public.store_files;
DROP POLICY IF EXISTS "Business owners can delete their company store files" ON public.store_files;

-- SELECT 정책 (조회) - 이미 있다면 건너뛰기
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'store_files' 
    AND policyname = 'Business owners can view their company store files'
  ) THEN
    EXECUTE 'CREATE POLICY "Business owners can view their company store files"
      ON public.store_files
      FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM public.users
          WHERE id = auth.uid()
            AND role IN (''business_owner'', ''platform_admin'')
            AND (is_active = true OR is_active IS NULL)
        )
      )';
  END IF;
END $$;

-- INSERT 정책 (생성)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'store_files' 
    AND policyname = 'Business owners can insert their company store files'
  ) THEN
    EXECUTE 'CREATE POLICY "Business owners can insert their company store files"
      ON public.store_files
      FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM public.users
          WHERE id = auth.uid()
            AND role IN (''business_owner'', ''platform_admin'')
            AND (is_active = true OR is_active IS NULL)
        )
      )';
  END IF;
END $$;

-- DELETE 정책 (삭제)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'store_files' 
    AND policyname = 'Business owners can delete their company store files'
  ) THEN
    EXECUTE 'CREATE POLICY "Business owners can delete their company store files"
      ON public.store_files
      FOR DELETE
      USING (
        company_id IN (
          SELECT company_id FROM public.users
          WHERE id = auth.uid()
            AND role IN (''business_owner'', ''platform_admin'')
            AND (is_active = true OR is_active IS NULL)
        )
      )';
  END IF;
END $$;

