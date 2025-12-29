-- 위치 정보 데이터 확인 SQL

-- 1. store_product_locations 테이블에 데이터가 있는지 확인
SELECT 
  COUNT(*) as total_locations,
  COUNT(DISTINCT store_id) as stores_with_locations,
  COUNT(DISTINCT product_id) as products_with_locations
FROM store_product_locations;

-- 2. 매장별 위치 정보 확인
SELECT 
  s.name as store_name,
  COUNT(spl.id) as location_count
FROM stores s
LEFT JOIN store_product_locations spl ON s.id = spl.store_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.name
ORDER BY location_count DESC;

-- 3. 제품별 위치 정보 확인
SELECT 
  p.name as product_name,
  COUNT(spl.id) as location_count
FROM products p
LEFT JOIN store_product_locations spl ON p.id = spl.product_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name
ORDER BY location_count DESC
LIMIT 10;

-- 4. 특정 매장의 위치 정보 샘플 확인
SELECT 
  s.name as store_name,
  p.name as product_name,
  spl.vending_machine_number,
  spl.position_number,
  spl.stock_quantity,
  spl.is_available
FROM store_product_locations spl
JOIN stores s ON spl.store_id = s.id
JOIN products p ON spl.product_id = p.id
WHERE s.deleted_at IS NULL
  AND p.deleted_at IS NULL
LIMIT 10;




