-- ============================================
-- store_assign 테이블에 business_owner 정책 추가
-- ============================================

-- business_owner는 자신의 회사 직원의 매장 배정을 관리할 수 있음
CREATE POLICY "Business owners can manage company user store assignments" ON public.store_assign
    FOR ALL USING (
        public.is_business_owner(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = store_assign.user_id
            AND company_id = public.get_user_company_id(auth.uid())
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
  AND tablename = 'store_assign'
ORDER BY policyname;



