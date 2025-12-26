-- products 테이블에서 store_id 컬럼 제거
-- products는 전역 제품 마스터이므로 store_id가 필요 없습니다

-- store_id 컬럼이 있으면 제거
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'store_id'
  ) THEN
    -- 외래 키 제약조건이 있으면 먼저 제거
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_store_id_fkey;
    -- 컬럼 제거
    ALTER TABLE products DROP COLUMN store_id;
  END IF;
END $$;

