-- 중복 제품 확인 쿼리

-- 1. 중복 제품명 확인 (deleted_at IS NULL인 경우만)
SELECT 
  name,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as product_ids,
  array_agg(created_at ORDER BY created_at) as created_dates
FROM products
WHERE deleted_at IS NULL
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, name;

-- 2. 중복 제품 정리 필요 여부 확인
SELECT 
  COUNT(*) as total_duplicate_names,
  SUM(duplicate_count - 1) as total_duplicate_entries
FROM (
  SELECT 
    name,
    COUNT(*) as duplicate_count
  FROM products
  WHERE deleted_at IS NULL
  GROUP BY name
  HAVING COUNT(*) > 1
) duplicates;

-- 위 쿼리를 실행하여:
-- - 1번 쿼리: 어떤 제품명이 중복되어 있는지 확인
-- - 2번 쿼리: 총 몇 개의 제품명이 중복되어 있고, 총 몇 개의 중복 항목이 있는지 확인
-- 
-- 결과가 있다면 cleanup-duplicate-products-merge.sql을 실행하여 중복을 정리하세요.

