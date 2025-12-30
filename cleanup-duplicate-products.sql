-- 중복 제품명 정리 스크립트
-- 제품명이 중복된 경우, 가장 오래된 제품 하나만 남기고 나머지는 deleted_at을 설정하여 소프트 삭제

-- 1. 중복 제품 확인 (실행 전 확인용)
SELECT 
  name,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as product_ids,
  array_agg(created_at ORDER BY created_at) as created_dates
FROM products
WHERE deleted_at IS NULL
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name;

-- 2. 중복 제품 정리
-- 각 제품명별로 가장 오래된 제품(created_at이 가장 빠른 것) 하나만 남기고
-- 나머지는 deleted_at을 설정하여 소프트 삭제
WITH duplicate_products AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM products
  WHERE deleted_at IS NULL
)
UPDATE products
SET 
  deleted_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  SELECT id 
  FROM duplicate_products 
  WHERE rn > 1
);

-- 3. 정리 결과 확인
SELECT 
  name,
  COUNT(*) as remaining_count
FROM products
WHERE deleted_at IS NULL
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY remaining_count DESC, name;

-- 위 쿼리 결과가 0개 행이면 정리 완료
-- 그 후 add-unique-constraint-products-name.sql의 UNIQUE 인덱스 생성 명령을 실행하세요.

