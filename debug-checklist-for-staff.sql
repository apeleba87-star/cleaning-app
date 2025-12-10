-- 직원이 체크리스트를 조회할 수 없는 문제 디버깅

-- 1. 현재 로그인한 직원의 ID 확인 (실제 사용자 ID로 변경 필요)
-- SELECT id, name, role, email FROM public.users WHERE role = 'staff' LIMIT 5;

-- 2. 직원이 배정받은 매장 확인
-- SELECT 
--     sa.user_id,
--     u.name as user_name,
--     sa.store_id,
--     s.name as store_name
-- FROM public.store_assign sa
-- JOIN public.users u ON u.id = sa.user_id
-- JOIN public.stores s ON s.id = sa.store_id
-- WHERE u.role = 'staff';

-- 3. 템플릿 체크리스트 확인 (업체 관리자가 생성한 것)
SELECT 
    c.id,
    c.store_id,
    s.name as store_name,
    c.user_id,
    u.name as creator_name,
    c.work_date,
    c.assigned_user_id,
    c.created_at
FROM public.checklist c
LEFT JOIN public.stores s ON s.id = c.store_id
LEFT JOIN public.users u ON u.id = c.user_id
WHERE c.work_date = '2000-01-01'
  AND c.assigned_user_id IS NULL
ORDER BY c.created_at DESC;

-- 4. 오늘 날짜의 직원 배정 체크리스트 확인
SELECT 
    c.id,
    c.store_id,
    s.name as store_name,
    c.assigned_user_id,
    u.name as assigned_user_name,
    c.work_date,
    c.review_status,
    c.created_at
FROM public.checklist c
LEFT JOIN public.stores s ON s.id = c.store_id
LEFT JOIN public.users u ON u.id = c.assigned_user_id
WHERE c.work_date = CURRENT_DATE
  AND c.assigned_user_id IS NOT NULL
ORDER BY c.created_at DESC;

-- 5. 특정 직원의 오늘 날짜 체크리스트 확인 (직원 ID로 변경 필요)
-- SELECT 
--     c.*,
--     s.name as store_name
-- FROM public.checklist c
-- LEFT JOIN public.stores s ON s.id = c.store_id
-- WHERE c.work_date = CURRENT_DATE
--   AND c.assigned_user_id = 'YOUR_STAFF_USER_ID_HERE';

-- 6. RLS 정책 확인
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'checklist'
ORDER BY policyname;

-- 7. 직원이 배정받은 매장의 템플릿 체크리스트가 있는지 확인
-- SELECT 
--     c.id,
--     c.store_id,
--     s.name as store_name,
--     sa.user_id,
--     u.name as staff_name
-- FROM public.checklist c
-- JOIN public.stores s ON s.id = c.store_id
-- JOIN public.store_assign sa ON sa.store_id = c.store_id
-- JOIN public.users u ON u.id = sa.user_id
-- WHERE c.work_date = '2000-01-01'
--   AND c.assigned_user_id IS NULL
--   AND u.role = 'staff'
-- ORDER BY c.created_at DESC;


