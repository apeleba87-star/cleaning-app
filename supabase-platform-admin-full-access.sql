-- ============================================
-- 시스템 관리자 전체 접근 권한 추가
-- ============================================

-- 1. attendance 테이블에 platform_admin 정책 추가
DROP POLICY IF EXISTS "Platform admin can manage all attendance" ON public.attendance;
CREATE POLICY "Platform admin can manage all attendance" ON public.attendance
    FOR ALL USING (public.is_platform_admin(auth.uid()));

-- 2. cleaning_photos 테이블에 platform_admin 정책 추가
DROP POLICY IF EXISTS "Platform admin can manage all cleaning photos" ON public.cleaning_photos;
CREATE POLICY "Platform admin can manage all cleaning photos" ON public.cleaning_photos
    FOR ALL USING (public.is_platform_admin(auth.uid()));

-- 3. checklist 테이블에 platform_admin 정책 추가
DROP POLICY IF EXISTS "Platform admin can manage all checklists" ON public.checklist;
CREATE POLICY "Platform admin can manage all checklists" ON public.checklist
    FOR ALL USING (public.is_platform_admin(auth.uid()));

-- 4. issues 테이블에 platform_admin 정책 추가
DROP POLICY IF EXISTS "Platform admin can manage all issues" ON public.issues;
CREATE POLICY "Platform admin can manage all issues" ON public.issues
    FOR ALL USING (public.is_platform_admin(auth.uid()));

-- 5. supply_requests 테이블에 platform_admin 정책 추가
DROP POLICY IF EXISTS "Platform admin can manage all supply requests" ON public.supply_requests;
CREATE POLICY "Platform admin can manage all supply requests" ON public.supply_requests
    FOR ALL USING (public.is_platform_admin(auth.uid()));

-- 6. request_categories 테이블에 platform_admin 정책 추가
DROP POLICY IF EXISTS "Platform admin can manage all request categories" ON public.request_categories;
CREATE POLICY "Platform admin can manage all request categories" ON public.request_categories
    FOR ALL USING (public.is_platform_admin(auth.uid()));

-- 7. store_assign 테이블에 platform_admin 정책 추가
DROP POLICY IF EXISTS "Platform admin can manage all store assignments" ON public.store_assign;
CREATE POLICY "Platform admin can manage all store assignments" ON public.store_assign
    FOR ALL USING (public.is_platform_admin(auth.uid()));

-- 확인: 모든 테이블에 platform_admin 정책이 있는지 확인
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%platform_admin%'
ORDER BY tablename, policyname;


