-- 체크리스트 항목 타입 수정 스크립트
-- 잘못 저장된 타입을 이름 기반으로 자동 수정

-- 1. 먼저 현재 상태 확인 - 타입 불일치 항목 찾기
-- 'photo' 타입(구버전)과 잘못된 타입 모두 확인
SELECT 
  id,
  store_id,
  work_date,
  (item->>'area') as area,
  (item->>'type') as current_type,
  (item->>'before_photo_url') as before_photo_url,
  (item->>'after_photo_url') as after_photo_url
FROM checklist,
  jsonb_array_elements(items) AS item
WHERE 
  -- 구버전 'photo' 타입 또는 잘못된 타입인 항목들
  (
    item->>'type' = 'photo'  -- 구버전 타입
    OR item->>'type' = 'before_after_photo'  -- 잘못된 타입 가능성
  )
  AND (
    (item->>'area') ILIKE '%관리후%' 
    OR (item->>'area') ILIKE '%관리전%'
    OR (item->>'area') ILIKE '%관리전후%'
    OR (item->>'area') ILIKE '%출입문%'
  )
ORDER BY work_date DESC, created_at DESC
LIMIT 30;

-- 2. 템플릿 체크리스트 (work_date = '2000-01-01') 업데이트
-- 'photo' 타입(구버전)과 잘못된 타입을 이름 기반으로 자동 수정
UPDATE checklist
SET items = (
  SELECT jsonb_agg(
    CASE 
      -- 관리후 사진만: 이름에 "관리후"만 있고 "관리전"이 없으면 after_photo로 변경
      WHEN (item->>'type' = 'photo' OR item->>'type' = 'before_after_photo')
        AND (item->>'area') ILIKE '%관리후%'
        AND (item->>'area') NOT ILIKE '%관리전%'
        AND (item->>'area') NOT ILIKE '%관리전후%'
      THEN jsonb_set(item, '{type}', '"after_photo"')
      -- 관리전 사진만: 이름에 "관리전"만 있고 "관리후"가 없으면 before_photo로 변경
      WHEN (item->>'type' = 'photo' OR item->>'type' = 'before_after_photo')
        AND (item->>'area') ILIKE '%관리전%'
        AND (item->>'area') NOT ILIKE '%관리후%'
        AND (item->>'area') NOT ILIKE '%관리전후%'
      THEN jsonb_set(item, '{type}', '"before_photo"')
      -- 관리전후 사진: 이름에 "관리전후" 또는 "관리전"과 "관리후"가 모두 있으면 before_after_photo로 변경
      WHEN item->>'type' = 'photo'
        AND (
          (item->>'area') ILIKE '%관리전후%'
          OR ((item->>'area') ILIKE '%관리전%' AND (item->>'area') ILIKE '%관리후%')
        )
      THEN jsonb_set(item, '{type}', '"before_after_photo"')
      -- 특정 항목명 직접 매핑
      WHEN (item->>'area' = '출입문 잠금 상태' OR item->>'area' ILIKE '%출입문%잠금%')
        AND (item->>'type' = 'photo' OR item->>'type' = 'before_after_photo')
        AND (item->>'area') ILIKE '%관리후%'
      THEN jsonb_set(item, '{type}', '"after_photo"')
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE work_date = '2000-01-01'
  AND (
    items::text LIKE '%"type":"photo"%'
    OR items::text LIKE '%before_after_photo%'
  );

-- 3. 이미 생성된 체크리스트 (오늘 날짜 및 다른 날짜) 업데이트
-- 'photo' 타입(구버전)을 이름 기반으로 자동 수정
-- 주의: 이미 사진이 촬영된 항목은 URL 상태를 고려하여 타입 판단
UPDATE checklist
SET items = (
  SELECT jsonb_agg(
    CASE 
      -- 관리후 사진만: 이름에 "관리후"만 있고 "관리전"이 없으면 after_photo로 변경
      WHEN (item->>'type' = 'photo' OR item->>'type' = 'before_after_photo')
        AND (item->>'area') ILIKE '%관리후%'
        AND (item->>'area') NOT ILIKE '%관리전%'
        AND (item->>'area') NOT ILIKE '%관리전후%'
        -- URL 상태로 타입 확인: before_photo_url이 있으면 이미 관리전 사진 촬영됨 (before_after_photo로 유지 필요)
        -- 하지만 이름이 "관리후만"이면 타입 불일치이므로 강제로 after_photo로 변경
      THEN jsonb_set(item, '{type}', '"after_photo"')
      -- 관리전 사진만: 이름에 "관리전"만 있고 "관리후"가 없으면 before_photo로 변경
      WHEN (item->>'type' = 'photo' OR item->>'type' = 'before_after_photo')
        AND (item->>'area') ILIKE '%관리전%'
        AND (item->>'area') NOT ILIKE '%관리후%'
        AND (item->>'area') NOT ILIKE '%관리전후%'
      THEN jsonb_set(item, '{type}', '"before_photo"')
      -- 관리전후 사진: 이름에 "관리전후" 또는 "관리전"과 "관리후"가 모두 있으면 before_after_photo로 변경
      WHEN item->>'type' = 'photo'
        AND (
          (item->>'area') ILIKE '%관리전후%'
          OR ((item->>'area') ILIKE '%관리전%' AND (item->>'area') ILIKE '%관리후%')
        )
      THEN jsonb_set(item, '{type}', '"before_after_photo"')
      -- 특정 항목명 직접 매핑 (출입문 잠금 상태 등)
      WHEN (item->>'area' = '출입문 잠금 상태' OR item->>'area' ILIKE '%출입문%잠금%')
        AND (item->>'type' = 'photo' OR item->>'type' = 'before_after_photo')
        AND (item->>'area') ILIKE '%관리후%'
      THEN jsonb_set(item, '{type}', '"after_photo"')
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE work_date != '2000-01-01'
  AND (
    items::text LIKE '%"type":"photo"%'
    OR items::text LIKE '%before_after_photo%'
  );

-- 4. 업데이트 결과 확인 - 모든 타입별 통계
SELECT 
  (item->>'type') as type,
  COUNT(*) as count,
  jsonb_agg(DISTINCT item->>'area') as sample_areas
FROM checklist,
  jsonb_array_elements(items) AS item
WHERE item->>'type' IN ('before_photo', 'after_photo', 'before_after_photo')
GROUP BY item->>'type'
ORDER BY item->>'type';

-- 5. 수정된 항목 확인
SELECT 
  id,
  store_id,
  work_date,
  (item->>'area') as area,
  (item->>'type') as type,
  (item->>'before_photo_url') as before_photo_url,
  (item->>'after_photo_url') as after_photo_url
FROM checklist,
  jsonb_array_elements(items) AS item
WHERE 
  (item->>'area') ILIKE '%관리후%'
  OR (item->>'area') ILIKE '%관리전%'
  OR (item->>'area') ILIKE '%출입문 잠금%'
ORDER BY created_at DESC
LIMIT 20;

