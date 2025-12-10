-- ============================================
-- 체크리스트 조회 문제 디버깅
-- 사용자 ID: 46057a60-fb64-4dc3-8307-91e5b2045b5d
-- ============================================

-- 1. 사용자가 배정받은 매장 확인
SELECT 
    sa.id AS assignment_id,
    sa.store_id,
    sa.user_id,
    s.name AS store_name,
    s.company_id,
    s.management_days
FROM public.store_assign sa
LEFT JOIN public.stores s ON sa.store_id = s.id
WHERE sa.user_id = '46057a60-fb64-4dc3-8307-91e5b2045b5d'
  AND s.deleted_at IS NULL;

-- 2. 해당 매장들의 모든 체크리스트 확인
SELECT 
    c.id,
    c.store_id,
    c.assigned_user_id,
    c.user_id AS created_by,
    c.work_date,
    c.items,
    c.note,
    c.requires_photos,
    c.review_status,
    c.created_at,
    s.name AS store_name,
    CASE 
        WHEN c.assigned_user_id IS NULL THEN '배정 없음'
        ELSE (SELECT name FROM public.users WHERE id = c.assigned_user_id)
    END AS assigned_user_name
FROM public.checklist c
LEFT JOIN public.stores s ON c.store_id = s.id
WHERE c.store_id IN (
    SELECT store_id 
    FROM public.store_assign 
    WHERE user_id = '46057a60-fb64-4dc3-8307-91e5b2045b5d'
)
  AND s.deleted_at IS NULL
ORDER BY c.created_at DESC;

-- 3. 오늘 날짜 기준 체크리스트 확인
SELECT 
    c.id,
    c.store_id,
    c.assigned_user_id,
    c.work_date,
    s.name AS store_name,
    CURRENT_DATE AS today_date,
    c.work_date >= CURRENT_DATE AS is_today_or_future
FROM public.checklist c
LEFT JOIN public.stores s ON c.store_id = s.id
WHERE c.store_id IN (
    SELECT store_id 
    FROM public.store_assign 
    WHERE user_id = '46057a60-fb64-4dc3-8307-91e5b2045b5d'
)
  AND s.deleted_at IS NULL
ORDER BY c.work_date DESC, c.created_at DESC;

-- 4. "전담이지 송파가락점" 매장 정보 확인
SELECT 
    id,
    name,
    company_id,
    management_days,
    deleted_at
FROM public.stores
WHERE name LIKE '%송파가락%'
  OR name LIKE '%전담이지%'
ORDER BY created_at DESC;

-- 5. 현재 RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'checklist'
ORDER BY policyname;


