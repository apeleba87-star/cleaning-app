-- 중복 제품명 정리 스크립트 (병합 방식)
-- 제품명이 중복된 경우, 가장 완전한 데이터를 가진 제품 하나만 남기고
-- 나머지는 deleted_at을 설정하여 소프트 삭제
-- store_product_locations와 연결된 제품을 우선적으로 유지

-- 1. 중복 제품 확인 및 유지할 제품 선정
-- 우선순위: 1) store_product_locations와 연결된 제품, 2) 더 많은 정보가 있는 제품, 3) 더 오래된 제품
WITH ranked_products AS (
  SELECT 
    p.id,
    p.name,
    p.barcode,
    p.category_1,
    p.category_2,
    p.image_url,
    p.created_at,
    -- 우선순위 점수 계산
    ROW_NUMBER() OVER (
      PARTITION BY p.name 
      ORDER BY 
        CASE WHEN EXISTS (
          SELECT 1 FROM store_product_locations spl 
          WHERE spl.product_id = p.id AND spl.store_id IS NOT NULL
        ) THEN 0 ELSE 1 END, -- 연결된 위치 정보가 있으면 우선
        CASE WHEN p.barcode IS NOT NULL THEN 0 ELSE 1 END, -- 바코드가 있으면 우선
        CASE WHEN p.category_1 IS NOT NULL OR p.category_2 IS NOT NULL THEN 0 ELSE 1 END, -- 카테고리가 있으면 우선
        CASE WHEN p.image_url IS NOT NULL THEN 0 ELSE 1 END, -- 이미지가 있으면 우선
        p.created_at ASC -- 더 오래된 제품 우선
    ) as rn
  FROM products p
  WHERE p.deleted_at IS NULL
),
-- 유지할 제품 ID 수집
keep_products AS (
  SELECT id, name FROM ranked_products WHERE rn = 1
),
-- 삭제할 제품 ID 수집 (유지할 제품이 아닌 모든 중복 제품)
delete_products AS (
  SELECT rp.id, rp.name, kp.id as keep_id
  FROM ranked_products rp
  LEFT JOIN keep_products kp ON rp.name = kp.name AND rp.rn = 1
  WHERE rp.rn > 1
)
-- 중복 제품들을 소프트 삭제
UPDATE products
SET 
  deleted_at = NOW(),
  updated_at = NOW()
WHERE id IN (SELECT id FROM delete_products);

-- 2. 정리 결과 확인
SELECT 
  name,
  COUNT(*) as remaining_count
FROM products
WHERE deleted_at IS NULL
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY remaining_count DESC, name;

-- 위 쿼리 결과가 0개 행이면 정리 완료
-- 그 후 add-unique-constraint-products-name.sql의 UNIQUE 인덱스 생성 명령을 실행하세요.

