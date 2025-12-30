-- UNIQUE 인덱스 확인 쿼리

-- 1. 인덱스 전체 정의 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'products' 
  AND indexname = 'idx_products_name_unique';

-- 2. 인덱스의 상세 정보 확인 (WHERE 절 포함)
-- pg_indexes의 indexdef에 WHERE 절이 이미 포함되어 있으므로 간단하게 조회
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'products' 
  AND indexname = 'idx_products_name_unique';

-- 3. 인덱스가 UNIQUE인지 확인
SELECT 
  i.relname AS index_name,
  idx.indisunique AS is_unique,
  pg_get_indexdef(i.oid) AS index_definition
FROM pg_class i
JOIN pg_index idx ON idx.indexrelid = i.oid
JOIN pg_class t ON t.oid = idx.indrelid
WHERE t.relname = 'products'
  AND i.relname = 'idx_products_name_unique';

-- 4. 중복 데이터가 여전히 있는지 확인 (deleted_at IS NULL인 경우만)
SELECT 
  name,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as product_ids
FROM products
WHERE deleted_at IS NULL
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, name
LIMIT 20;

-- 5. 인덱스 정의 전체 확인 (WHERE 절 포함 여부 확인)
SELECT 
  pg_get_indexdef(i.oid) AS full_index_definition
FROM pg_class i
JOIN pg_index idx ON idx.indexrelid = i.oid
JOIN pg_class t ON t.oid = idx.indrelid
WHERE t.relname = 'products'
  AND i.relname = 'idx_products_name_unique';

-- 위 쿼리 결과 설명:
-- - 1번, 2번 쿼리: 인덱스 정의 확인 (indexdef 컬럼에 WHERE deleted_at IS NULL이 포함되어야 함)
-- - 3번 쿼리: 인덱스가 UNIQUE인지 확인 (is_unique가 true여야 함)
-- - 5번 쿼리: 인덱스 정의 전체 확인 (WHERE 절 포함 여부를 명확히 확인)
-- - 4번 쿼리: 여전히 중복 제품명이 있는지 확인 (결과가 0개 행이어야 함, 중복 정리 완료)

