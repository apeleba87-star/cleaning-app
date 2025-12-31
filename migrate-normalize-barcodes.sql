-- 바코드 정규화 마이그레이션 스크립트
-- 기존 바코드에서 모든 공백, 작은따옴표, 큰따옴표, 특수문자를 제거하고 숫자만 남기기

-- ⚠️ 중요: 이 스크립트를 실행하기 전에 반드시 데이터베이스를 백업하세요!

-- 1. 마이그레이션 전 중복 확인
-- 정규화 후 중복되는 바코드가 있는지 확인
SELECT 
  normalized_barcode,
  COUNT(*) as duplicate_count,
  array_agg(id) as product_ids,
  array_agg(name) as product_names
FROM (
  SELECT 
    id,
    name,
    barcode,
    -- 정규화 함수: 모든 공백, 작은따옴표, 큰따옴표, 특수문자 제거, 숫자만 남기기
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(barcode, '\s+', '', 'g'),
          '''', '', 'g'
        ),
        '"', '', 'g'
      ),
      '[^\d]', '', 'g'
    ) as normalized_barcode
  FROM products
  WHERE barcode IS NOT NULL 
    AND barcode != ''
    AND deleted_at IS NULL
) normalized
WHERE normalized_barcode != ''
GROUP BY normalized_barcode
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_barcode;

-- 위 쿼리 결과가 있으면 중복 바코드가 있는 것이므로, 
-- 먼저 중복을 해결한 후 마이그레이션을 진행해야 합니다.

-- 2. 마이그레이션 실행 (트랜잭션으로 안전하게)
BEGIN;

-- 바코드 정규화 업데이트
-- 모든 바코드를 업데이트 (정규화 전후가 같으면 값이 그대로 유지됨)
-- ⚠️ 주의: 이 쿼리는 모든 바코드를 업데이트하므로 실행 시간이 걸릴 수 있습니다.

-- 먼저 업데이트 전 샘플 확인
SELECT 
  id,
  name,
  barcode as before_barcode,
  NULLIF(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(COALESCE(barcode, ''), '\s+', '', 'g'),
          '''', '', 'g'
        ),
        '"', '', 'g'
      ),
      '[^\d]', '', 'g'
    ),
    ''
  ) as after_barcode
FROM products
WHERE barcode IS NOT NULL 
  AND barcode != ''
  AND deleted_at IS NULL
  AND (
    barcode ~ '\s' OR
    barcode ~ '''' OR
    barcode ~ '"' OR
    barcode ~ '[^\d]'
  )
LIMIT 5;

-- 실제 UPDATE 실행
-- 방법 1: REPLACE 함수를 사용하여 더 직접적으로 처리
UPDATE products
SET 
  barcode = NULLIF(
    REGEXP_REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(COALESCE(barcode, ''), '''', ''),  -- 작은따옴표 제거
          '"', ''                                     -- 큰따옴표 제거
        ),
        ' ', ''                                       -- 공백 제거
      ),
      '[^\d]', '', 'g'                               -- 숫자가 아닌 모든 문자 제거
    ),
    ''
  ),
  updated_at = NOW()
WHERE barcode IS NOT NULL 
  AND barcode != ''
  AND deleted_at IS NULL
  -- 작은따옴표로 시작하거나 특수문자가 있는 경우만 업데이트
  AND (
    barcode LIKE '''%' OR           -- 작은따옴표로 시작
    barcode ~ '\s' OR               -- 공백이 있는 경우
    barcode ~ '"' OR                -- 큰따옴표가 있는 경우
    barcode ~ '[^\d]'               -- 숫자가 아닌 문자가 있는 경우
  );

-- 방법 2: 만약 방법 1이 작동하지 않으면, 이 방법을 시도 (모든 바코드 업데이트)
-- UPDATE products
-- SET 
--   barcode = NULLIF(
--     REGEXP_REPLACE(
--       REPLACE(
--         REPLACE(
--           REPLACE(COALESCE(barcode, ''), '''', ''),
--           '"', ''
--         ),
--         ' ', ''
--       ),
--       '[^\d]', '', 'g'
--     ),
--     ''
--   ),
--   updated_at = NOW()
-- WHERE barcode IS NOT NULL 
--   AND barcode != ''
--   AND deleted_at IS NULL;

-- 실제로 업데이트된 행 수 확인
-- PostgreSQL의 경우 GET DIAGNOSTICS를 사용하거나, 
-- 아래 쿼리로 업데이트 전후 비교 가능
SELECT 
  '업데이트 전 상태 확인' as status,
  COUNT(*) as total_barcodes,
  COUNT(CASE WHEN barcode != REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(barcode, '\s+', '', 'g'),
        '''', '', 'g'
      ),
      '"', '', 'g'
    ),
    '[^\d]', '', 'g'
  ) THEN 1 END) as need_normalization
FROM products
WHERE barcode IS NOT NULL 
  AND barcode != ''
  AND deleted_at IS NULL;

-- UPDATE 쿼리 실행 후 검증
-- 정규화가 필요한 행이 남아있는지 확인
SELECT COUNT(*) as rows_need_normalization
FROM products
WHERE barcode IS NOT NULL 
  AND barcode != ''
  AND deleted_at IS NULL
  -- 정규화가 필요한 경우: 공백, 작은따옴표, 큰따옴표, 또는 숫자가 아닌 문자가 있는 경우
  AND (
    barcode ~ '\s' OR           -- 공백이 있는 경우
    barcode ~ '''' OR           -- 작은따옴표가 있는 경우
    barcode ~ '"' OR            -- 큰따옴표가 있는 경우
    barcode ~ '[^\d]'           -- 숫자가 아닌 문자가 있는 경우
  );

-- 3. 마이그레이션 후 검증
-- 정규화된 바코드에 공백이나 특수문자가 남아있는지 확인
SELECT 
  id,
  name,
  barcode,
  LENGTH(barcode) as barcode_length,
  -- 공백이 있는지 확인
  CASE WHEN barcode ~ '\s' THEN '공백 있음' ELSE '정상' END as has_space,
  -- 작은따옴표가 있는지 확인
  CASE WHEN barcode ~ '''' THEN '작은따옴표 있음' ELSE '정상' END as has_single_quote,
  -- 큰따옴표가 있는지 확인
  CASE WHEN barcode ~ '"' THEN '큰따옴표 있음' ELSE '정상' END as has_double_quote,
  -- 숫자가 아닌 문자가 있는지 확인
  CASE WHEN barcode ~ '[^\d]' THEN '특수문자 있음' ELSE '정상' END as has_special_char
FROM products
WHERE barcode IS NOT NULL 
  AND barcode != ''
  AND deleted_at IS NULL
  AND (
    barcode ~ '\s' OR
    barcode ~ '''' OR
    barcode ~ '"' OR
    barcode ~ '[^\d]'
  )
LIMIT 100;

-- 위 쿼리 결과가 없으면 정규화가 성공적으로 완료된 것입니다.

-- 4. 커밋 (검증이 완료되면)
-- COMMIT;

-- 롤백이 필요한 경우:
-- ROLLBACK;
