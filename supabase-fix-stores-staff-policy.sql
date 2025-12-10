-- ============================================
-- stores 테이블에 staff 정책 추가
-- staff는 자신에게 배정된 매장을 조회할 수 있어야 함
-- ============================================

-- staff는 배정된 매장을 조회할 수 있어야 함
CREATE POLICY "Staff can view assigned stores" ON public.stores
    FOR SELECT USING (
        public.is_staff(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM public.store_assign
            WHERE user_id = auth.uid() AND store_id = stores.id
        )
    );

-- 확인
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


