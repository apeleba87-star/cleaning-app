-- store_product_locations: 슬롯당 1제품만 허용하도록 UNIQUE 제약 변경
-- 기존: UNIQUE(store_id, product_id, vending_machine_number, position_number) → 같은 슬롯에 여러 제품 행 허용
-- 변경: UNIQUE(store_id, vending_machine_number, position_number) → 슬롯당 1제품 (제품 교체 시 UPDATE 가능)

-- 1. 같은 슬롯(store_id, vending_machine_number, position_number)에 여러 행이 있으면 최신 1개만 유지
DELETE FROM store_product_locations
WHERE id NOT IN (
  SELECT DISTINCT ON (store_id, vending_machine_number, position_number) id
  FROM store_product_locations
  ORDER BY store_id, vending_machine_number, position_number, last_updated_at DESC NULLS LAST, id DESC
);

-- 2. 기존 UNIQUE 제약 삭제 (제약명 동적 조회)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'store_product_locations'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 4  -- 4개 컬럼 UNIQUE
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE store_product_locations DROP CONSTRAINT %I', conname);
  END IF;
END $$;

-- 3. 새로운 UNIQUE 인덱스 추가 (슬롯당 1제품)
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_product_locations_slot_unique
  ON store_product_locations(store_id, vending_machine_number, position_number);
