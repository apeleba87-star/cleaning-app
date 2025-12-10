-- 기존 체크리스트를 템플릿 형식으로 변환
-- work_date를 '2000-01-01'로 설정하고 assigned_user_id를 null로 설정

-- 1. 기존 체크리스트 중 템플릿으로 변환할 것들 확인
SELECT 
    id,
    store_id,
    user_id,
    work_date,
    assigned_user_id,
    created_at
FROM public.checklist
WHERE assigned_user_id IS NOT NULL
   OR work_date != '2000-01-01'
ORDER BY created_at DESC
LIMIT 10;

-- 2. 업체 관리자가 생성한 체크리스트를 템플릿으로 변환
-- (assigned_user_id가 null이고 user_id가 business_owner인 것들)
UPDATE public.checklist
SET 
    work_date = '2000-01-01',
    assigned_user_id = NULL
WHERE assigned_user_id IS NOT NULL
  AND user_id IN (
    SELECT id FROM public.users WHERE role = 'business_owner'
  );

-- 3. 업체 관리자가 생성했지만 work_date가 다른 것들도 템플릿으로 변환
UPDATE public.checklist
SET work_date = '2000-01-01'
WHERE work_date != '2000-01-01'
  AND assigned_user_id IS NULL
  AND user_id IN (
    SELECT id FROM public.users WHERE role = 'business_owner'
  );

-- 4. 확인: 템플릿 체크리스트 목록
SELECT 
    id,
    store_id,
    user_id,
    work_date,
    assigned_user_id,
    (SELECT name FROM public.stores WHERE id = checklist.store_id) as store_name,
    created_at
FROM public.checklist
WHERE work_date = '2000-01-01'
  AND assigned_user_id IS NULL
ORDER BY created_at DESC;

-- 5. 직원에게 배정된 오늘 날짜의 체크리스트 확인
SELECT 
    id,
    store_id,
    user_id,
    assigned_user_id,
    work_date,
    (SELECT name FROM public.stores WHERE id = checklist.store_id) as store_name,
    (SELECT name FROM public.users WHERE id = checklist.assigned_user_id) as assigned_user_name,
    created_at
FROM public.checklist
WHERE work_date = CURRENT_DATE
  AND assigned_user_id IS NOT NULL
ORDER BY created_at DESC;



