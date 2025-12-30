-- products 테이블에서 불필요한 컬럼 제거
-- 제품 마스터는 전역 정보만 저장해야 합니다

-- vending_position 컬럼 제거 (위치 정보는 store_product_locations에만 있어야 함)
ALTER TABLE products DROP COLUMN IF EXISTS vending_position;

-- photo_url 컬럼 제거 (image_url로 통일)
-- photo_url에 데이터가 있으면 image_url로 이동 후 제거
DO $$ 
BEGIN
  -- photo_url에 데이터가 있고 image_url이 비어있으면 이동
  UPDATE products 
  SET image_url = photo_url 
  WHERE photo_url IS NOT NULL 
  AND (image_url IS NULL OR image_url = '');
  
  -- photo_url 컬럼 제거
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE products DROP COLUMN photo_url;
  END IF;
END $$;

-- 다른 불필요한 컬럼들도 확인 및 제거
ALTER TABLE products DROP COLUMN IF EXISTS store_id;
ALTER TABLE products DROP COLUMN IF EXISTS vending_machine_number;
ALTER TABLE products DROP COLUMN IF EXISTS position_number;
ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity;
ALTER TABLE products DROP COLUMN IF EXISTS is_available;
ALTER TABLE products DROP COLUMN IF EXISTS last_updated_at;





