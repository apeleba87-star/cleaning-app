-- products 테이블의 name 컬럼에 UNIQUE 제약 추가
-- 중복 제품명 방지 (deleted_at이 NULL인 경우만)

-- ⚠️ 중요: 이 스크립트를 실행하기 전에 먼저 cleanup-duplicate-products.sql 또는
-- cleanup-duplicate-products-merge.sql을 실행하여 중복 데이터를 정리해야 합니다.

-- 1. 기존 중복 데이터 확인
SELECT name, COUNT(*) as duplicate_count
FROM products 
WHERE deleted_at IS NULL 
GROUP BY name 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name;

-- 위 쿼리 결과가 0개 행이어야 UNIQUE 인덱스를 생성할 수 있습니다.
-- 중복이 있으면 cleanup-duplicate-products.sql 또는 cleanup-duplicate-products-merge.sql 실행

-- 2. UNIQUE 제약 추가 (deleted_at이 NULL인 경우만)
-- PostgreSQL의 부분 인덱스를 사용하여 UNIQUE 제약 구현
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_unique 
ON products(name) 
WHERE deleted_at IS NULL;

-- 인덱스 생성 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'products' 
  AND indexname = 'idx_products_name_unique';

