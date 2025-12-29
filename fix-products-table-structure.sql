-- products 테이블 구조 정리
-- 제품 마스터는 전역 정보만 저장하므로 매장/자판기 관련 컬럼 제거

-- 불필요한 컬럼들 제거
DO $$ 
BEGIN
  -- store_id 컬럼 제거
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_store_id_fkey;
    ALTER TABLE products DROP COLUMN store_id;
  END IF;

  -- vending_machine_number 컬럼 제거
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'vending_machine_number'
  ) THEN
    ALTER TABLE products DROP COLUMN vending_machine_number;
  END IF;

  -- position_number 컬럼 제거
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'position_number'
  ) THEN
    ALTER TABLE products DROP COLUMN position_number;
  END IF;

  -- stock_quantity 컬럼 제거
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE products DROP COLUMN stock_quantity;
  END IF;

  -- is_available 컬럼 제거
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE products DROP COLUMN is_available;
  END IF;

  -- last_updated_at 컬럼 제거 (products에는 updated_at이 있음)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'last_updated_at'
  ) THEN
    ALTER TABLE products DROP COLUMN last_updated_at;
  END IF;
END $$;

-- 필수 컬럼들 확인 및 추가
DO $$ 
BEGIN
  -- name 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'name'
  ) THEN
    ALTER TABLE products ADD COLUMN name TEXT NOT NULL;
  END IF;

  -- barcode 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode TEXT;
  END IF;

  -- image_url 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url TEXT;
  END IF;

  -- category_1 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_1'
  ) THEN
    ALTER TABLE products ADD COLUMN category_1 TEXT;
  END IF;

  -- category_2 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_2'
  ) THEN
    ALTER TABLE products ADD COLUMN category_2 TEXT;
  END IF;

  -- deleted_at 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;




