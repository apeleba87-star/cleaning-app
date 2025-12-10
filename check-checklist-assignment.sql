-- ============================================
-- 체크리스트 배정 확인 쿼리
-- ============================================

-- 특정 사용자에게 배정된 체크리스트 확인
-- 아래 user_id를 실제 사용자 ID로 변경하세요
SELECT 
    c.id,
    c.store_id,
    c.assigned_user_id,
    c.work_date,
    c.items,
    c.note,
    c.requires_photos,
    c.review_status,
    c.created_at,
    s.name AS store_name,
    u.name AS assigned_user_name
FROM public.checklist c
LEFT JOIN public.stores s ON c.store_id = s.id
LEFT JOIN public.users u ON c.assigned_user_id = u.id
WHERE c.assigned_user_id = '46057a60-fb64-4dc3-8307-91e5b2045b5d'  -- 여기를 실제 사용자 ID로 변경
  AND s.deleted_at IS NULL
ORDER BY c.work_date DESC, c.created_at DESC;

-- 사용자가 배정받은 매장 확인
SELECT 
    sa.id,
    sa.user_id,
    sa.store_id,
    s.name AS store_name,
    s.company_id,
    s.management_days,
    sa.created_at
FROM public.store_assign sa
LEFT JOIN public.stores s ON sa.store_id = s.id
WHERE sa.user_id = '46057a60-fb64-4dc3-8307-91e5b2045b5d'  -- 여기를 실제 사용자 ID로 변경
  AND s.deleted_at IS NULL;

-- 매장별 체크리스트 확인 (배정 여부와 관계없이)
SELECT 
    c.id,
    c.store_id,
    c.assigned_user_id,
    c.work_date,
    c.created_at,
    s.name AS store_name,
    CASE 
        WHEN c.assigned_user_id IS NULL THEN '배정 없음'
        ELSE (SELECT name FROM public.users WHERE id = c.assigned_user_id)
    END AS assigned_user_name
FROM public.checklist c
LEFT JOIN public.stores s ON c.store_id = s.id
WHERE s.deleted_at IS NULL
ORDER BY c.created_at DESC
LIMIT 20;

-- 오늘 날짜 기준 체크리스트 확인
SELECT 
    c.id,
    c.store_id,
    c.assigned_user_id,
    c.work_date,
    c.created_at,
    s.name AS store_name
FROM public.checklist c
LEFT JOIN public.stores s ON c.store_id = s.id
WHERE c.work_date >= CURRENT_DATE - INTERVAL '7 days'
  AND s.deleted_at IS NULL
ORDER BY c.work_date DESC, c.created_at DESC;


