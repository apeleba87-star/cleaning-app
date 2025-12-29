-- products 테이블에 누락된 컬럼 추가 (간단 버전)
-- Supabase SQL Editor에서 실행하세요

-- image_url 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- category_1 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_1'
  ) THEN
    ALTER TABLE products ADD COLUMN category_1 TEXT;
  END IF;
END $$;

-- category_2 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_2'
  ) THEN
    ALTER TABLE products ADD COLUMN category_2 TEXT;
  END IF;
END $$;

-- barcode 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode TEXT;
    -- UNIQUE 인덱스 생성
    CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique 
    ON products(barcode) WHERE barcode IS NOT NULL;
  END IF;
END $$;

-- deleted_at 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;




