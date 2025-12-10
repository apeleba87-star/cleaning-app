-- ============================================
-- store_assign 테이블에 staff 정책 추가
-- ============================================

-- staff는 자신에게 배정된 매장을 조회할 수 있어야 함
CREATE POLICY "Staff can view own store assignments" ON public.store_assign
    FOR SELECT USING (
        public.is_staff(auth.uid()) AND
        user_id = auth.uid()
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
  AND tablename = 'store_assign'
ORDER BY policyname;


