-- 저장된 데이터 상세 확인 및 디버깅

-- 1. store_product_locations 테이블의 모든 컬럼 확인
SELECT 
  spl.*,
  s.name as actual_store_name,
  p.name as actual_product_name
FROM store_product_locations spl
LEFT JOIN stores s ON spl.store_id = s.id
LEFT JOIN products p ON spl.product_id = p.id
ORDER BY spl.created_at DESC
LIMIT 10;

-- 2. 제품 ID와 매장 ID 확인
SELECT 
  spl.id,
  spl.store_id,
  spl.product_id,
  s.name as store_name,
  p.name as product_name,
  spl.vending_machine_number,
  spl.position_number,
  spl.stock_quantity
FROM store_product_locations spl
LEFT JOIN stores s ON spl.store_id = s.id
LEFT JOIN products p ON spl.product_id = p.id
ORDER BY spl.created_at DESC;

-- 3. 제품 테이블 확인
SELECT id, name, barcode FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10;

-- 4. 매장 테이블 확인
SELECT id, name FROM stores WHERE deleted_at IS NULL ORDER BY name LIMIT 10;




