-- 업로드된 데이터 상세 확인

-- 1. 전체 위치 정보 개수
SELECT COUNT(*) as total_locations FROM store_product_locations;

-- 2. 매장별 위치 정보 개수
SELECT 
  s.name as store_name,
  COUNT(spl.id) as location_count
FROM stores s
LEFT JOIN store_product_locations spl ON s.id = spl.store_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.name
ORDER BY location_count DESC;

-- 3. 제품별 위치 정보 개수
SELECT 
  p.name as product_name,
  COUNT(spl.id) as location_count
FROM products p
LEFT JOIN store_product_locations spl ON p.id = spl.product_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name
ORDER BY location_count DESC
LIMIT 10;

-- 4. 실제 위치 정보 샘플 (최근 20개)
SELECT 
  s.name as store_name,
  p.name as product_name,
  spl.vending_machine_number,
  spl.position_number,
  spl.stock_quantity,
  spl.created_at
FROM store_product_locations spl
JOIN stores s ON spl.store_id = s.id
JOIN products p ON spl.product_id = p.id
WHERE s.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY spl.created_at DESC
LIMIT 20;
