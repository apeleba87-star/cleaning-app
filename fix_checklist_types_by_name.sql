-- 체크리스트 항목 타입을 항목 이름 기준으로 수정
-- "관리전 사진" → before_photo
-- "관리후 사진" → after_photo
-- "관리전후 사진" → before_after_photo (그대로 유지)

-- 1. 템플릿 체크리스트 (work_date = '2000-01-01') 수정
-- 'photo' 타입(구버전)을 항목 이름 기준으로 올바른 타입으로 변환
UPDATE checklist
SET items = (
  SELECT jsonb_agg(
    CASE 
      -- "관리전 사진" → before_photo
      WHEN (item->>'area') = '관리전 사진'
        AND (item->>'type') IN ('photo', 'before_after_photo')
      THEN jsonb_set(item, '{type}', '"before_photo"')
      
      -- "관리후 사진" → after_photo
      WHEN (item->>'area') = '관리후 사진'
        AND (item->>'type') IN ('photo', 'before_after_photo')
      THEN jsonb_set(item, '{type}', '"after_photo"')
      
      -- "관리전후 사진" → before_after_photo
      WHEN (item->>'area') = '관리전후 사진'
        AND (item->>'type') IN ('photo', 'before_after_photo')
      THEN jsonb_set(item, '{type}', '"before_after_photo"')
      
      -- 이미 올바른 타입이거나 다른 타입은 그대로 유지
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

-- 2. 실제 체크리스트 (work_date != '2000-01-01') 수정
-- 'photo' 타입(구버전)을 항목 이름 기준으로 올바른 타입으로 변환
UPDATE checklist
SET items = (
  SELECT jsonb_agg(
    CASE 
      -- "관리전 사진" → before_photo
      WHEN (item->>'area') = '관리전 사진'
        AND (item->>'type') IN ('photo', 'before_after_photo')
      THEN jsonb_set(item, '{type}', '"before_photo"')
      
      -- "관리후 사진" → after_photo
      WHEN (item->>'area') = '관리후 사진'
        AND (item->>'type') IN ('photo', 'before_after_photo')
      THEN jsonb_set(item, '{type}', '"after_photo"')
      
      -- "관리전후 사진" → before_after_photo
      WHEN (item->>'area') = '관리전후 사진'
        AND (item->>'type') IN ('photo', 'before_after_photo')
      THEN jsonb_set(item, '{type}', '"before_after_photo"')
      
      -- 이미 올바른 타입이거나 다른 타입은 그대로 유지
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

-- 3. 수정 결과 확인
SELECT 
  id,
  store_id,
  work_date,
  (item->>'area') as area,
  (item->>'type') as type,
  created_at
FROM checklist,
  jsonb_array_elements(items) AS item
WHERE 
  (item->>'area') IN ('관리전 사진', '관리후 사진', '관리전후 사진')
ORDER BY created_at DESC
LIMIT 20;
