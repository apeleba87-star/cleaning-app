-- ============================================
-- 매장 배정 문제 디버깅 쿼리
-- ============================================

-- 1. store_assign 테이블의 모든 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'store_assign'
ORDER BY policyname;

-- 2. 실제 store_assign 데이터 확인 (Service Role로 실행)
SELECT 
    sa.id,
    sa.user_id,
    u.name as user_name,
    u.role as user_role,
    sa.store_id,
    s.name as store_name,
    sa.created_at
FROM public.store_assign sa
LEFT JOIN public.users u ON sa.user_id = u.id
LEFT JOIN public.stores s ON sa.store_id = s.id
ORDER BY sa.created_at DESC;

-- 3. 특정 사용자의 매장 배정 확인 (예: 직원 사용자 ID로 변경 필요)
-- SELECT 
--     sa.id,
--     sa.user_id,
--     u.name as user_name,
--     u.role as user_role,
--     sa.store_id,
--     s.name as store_name
-- FROM public.store_assign sa
-- LEFT JOIN public.users u ON sa.user_id = u.id
-- LEFT JOIN public.stores s ON sa.store_id = s.id
-- WHERE u.role = 'staff'
-- ORDER BY u.name;

-- 4. stores 테이블의 RLS 정책 확인
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

-- 5. staff 역할이 stores를 조회할 수 있는 정책이 있는지 확인
-- (없으면 추가 필요)



