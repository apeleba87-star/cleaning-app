-- ============================================
-- stores 테이블의 staff 정책 확인 및 재생성
-- ============================================

-- 1. 기존 정책이 있는지 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'stores'
  AND policyname LIKE '%staff%'
ORDER BY policyname;

-- 2. 기존 정책이 있으면 삭제
DROP POLICY IF EXISTS "Staff can view assigned stores" ON public.stores;

-- 3. 정책 재생성
CREATE POLICY "Staff can view assigned stores" ON public.stores
    FOR SELECT USING (
        public.is_staff(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM public.store_assign
            WHERE user_id = auth.uid() AND store_id = stores.id
        )
    );

-- 4. 생성된 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'stores'
ORDER BY policyname;


