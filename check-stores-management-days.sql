-- 매장의 근무일 설정 확인 쿼리
-- 어제 날짜의 요일과 매장의 management_days를 비교하여 확인

-- 1. 모든 매장의 근무일 설정 확인
SELECT 
  id,
  name,
  is_night_shift,
  management_days,
  work_start_hour,
  work_end_hour,
  company_id
FROM stores
WHERE deleted_at IS NULL
ORDER BY company_id, name;

-- 2. 어제 요일 확인 (수동으로 실행)
-- 예: 어제가 화요일이면 '화'를 확인

-- 3. 특정 회사의 매장 중 어제 근무일인 매장 확인
-- (어제가 화요일인 경우 예시)
SELECT 
  id,
  name,
  is_night_shift,
  management_days,
  CASE 
    WHEN management_days LIKE '%화%' THEN '근무일'
    ELSE '비근무일'
  END as work_status
FROM stores
WHERE deleted_at IS NULL
  AND company_id = 'YOUR_COMPANY_ID' -- 실제 company_id로 변경
ORDER BY name;
