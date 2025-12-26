-- products 테이블에 누락된 컬럼 추가
-- 테이블이 이미 존재하는 경우 컬럼만 추가

-- image_url 컬럼 추가 (없으면)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- category_1 컬럼 추가 (없으면)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_1 TEXT;

-- category_2 컬럼 추가 (없으면)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_2 TEXT;

-- barcode 컬럼 추가 (없으면)
-- UNIQUE 제약조건은 별도로 추가 필요
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique ON products(barcode) WHERE barcode IS NOT NULL;
  END IF;
END $$;

-- deleted_at 컬럼 추가 (없으면)
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

