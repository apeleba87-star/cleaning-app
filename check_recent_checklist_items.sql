-- 최근 저장된 체크리스트 항목의 타입 확인
-- 방금 저장한 체크리스트가 올바른 타입으로 저장되었는지 확인하는 쿼리

SELECT 
  id,
  store_id,
  work_date,
  created_at,
  (item->>'area') as area,
  (item->>'type') as type,
  CASE 
    WHEN (item->>'area') ILIKE '%관리전%' AND (item->>'area') NOT ILIKE '%관리후%' AND (item->>'area') NOT ILIKE '%관리전후%'
    THEN '예상: before_photo'
    WHEN (item->>'area') ILIKE '%관리후%' AND (item->>'area') NOT ILIKE '%관리전%' AND (item->>'area') NOT ILIKE '%관리전후%'
    THEN '예상: after_photo'
    WHEN (item->>'area') ILIKE '%관리전후%' OR ((item->>'area') ILIKE '%관리전%' AND (item->>'area') ILIKE '%관리후%')
    THEN '예상: before_after_photo'
    ELSE '기타'
  END as expected_type,
  CASE 
    WHEN (item->>'area') ILIKE '%관리전%' AND (item->>'area') NOT ILIKE '%관리후%' AND (item->>'area') NOT ILIKE '%관리전후%'
      AND item->>'type' = 'before_photo'
    THEN '✅ 정확'
    WHEN (item->>'area') ILIKE '%관리후%' AND (item->>'area') NOT ILIKE '%관리전%' AND (item->>'area') NOT ILIKE '%관리전후%'
      AND item->>'type' = 'after_photo'
    THEN '✅ 정확'
    WHEN (item->>'area') ILIKE '%관리전후%' OR ((item->>'area') ILIKE '%관리전%' AND (item->>'area') ILIKE '%관리후%')
      AND item->>'type' = 'before_after_photo'
    THEN '✅ 정확'
    ELSE '⚠️ 불일치'
  END as status
FROM checklist,
  jsonb_array_elements(items) AS item
WHERE 
  (item->>'area') ILIKE '%관리전%' 
  OR (item->>'area') ILIKE '%관리후%'
ORDER BY created_at DESC
LIMIT 30;

