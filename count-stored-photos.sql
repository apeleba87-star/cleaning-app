-- 저장된 사진 수 확인 쿼리
-- 데이터베이스에 저장된 사진 URL을 기준으로 사진 수를 계산합니다.

-- 1. 전체 사진 수 (모든 테이블 합계)
WITH photo_counts AS (
  -- cleaning_photos 테이블의 사진 수
  SELECT 
    'cleaning_photos' as table_name,
    COUNT(*) as photo_count
  FROM cleaning_photos
  WHERE photo_url IS NOT NULL 
    AND photo_url != ''
    AND deleted_at IS NULL
  
  UNION ALL
  
  -- issues 테이블의 사진 수 (photo_url 단일 + photo_urls 배열)
  SELECT 
    'issues' as table_name,
    COUNT(*) as photo_count
  FROM issues
  WHERE (
    (photo_url IS NOT NULL AND photo_url != '') OR
    (photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0)
  )
    AND deleted_at IS NULL
  
  UNION ALL
  
  -- supply_requests 테이블의 사진 수 (photo_url, completion_photo_url, rejection_photo_url)
  SELECT 
    'supply_requests' as table_name,
    COUNT(*) as photo_count
  FROM supply_requests
  WHERE (
    (photo_url IS NOT NULL AND photo_url != '') OR
    (completion_photo_url IS NOT NULL AND completion_photo_url != '') OR
    (rejection_photo_url IS NOT NULL AND rejection_photo_url != '')
  )
    AND deleted_at IS NULL
  
  UNION ALL
  
  -- checklist_items 테이블의 사진 수 (before_photo_url, after_photo_url)
  SELECT 
    'checklist_items' as table_name,
    COUNT(*) as photo_count
  FROM checklist_items
  WHERE (
    (before_photo_url IS NOT NULL AND before_photo_url != '') OR
    (after_photo_url IS NOT NULL AND after_photo_url != '')
  )
    AND deleted_at IS NULL
  
  UNION ALL
  
  -- products 테이블의 사진 수 (image_url)
  SELECT 
    'products' as table_name,
    COUNT(*) as photo_count
  FROM products
  WHERE image_url IS NOT NULL 
    AND image_url != ''
    AND deleted_at IS NULL
)
SELECT 
  table_name,
  photo_count,
  ROUND(photo_count * 100.0 / SUM(photo_count) OVER (), 2) as percentage
FROM photo_counts
ORDER BY photo_count DESC;

-- 2. 전체 사진 수 합계
SELECT 
  '총 사진 수' as summary,
  (
    -- cleaning_photos
    (SELECT COUNT(*) FROM cleaning_photos WHERE photo_url IS NOT NULL AND photo_url != '' AND deleted_at IS NULL) +
    -- issues (photo_url + photo_urls 배열 길이)
    (SELECT COUNT(*) FROM issues WHERE (photo_url IS NOT NULL AND photo_url != '') AND deleted_at IS NULL) +
    (SELECT COALESCE(SUM(array_length(photo_urls, 1)), 0) FROM issues WHERE photo_urls IS NOT NULL AND deleted_at IS NULL) +
    -- supply_requests
    (SELECT COUNT(*) FROM supply_requests WHERE (photo_url IS NOT NULL AND photo_url != '' OR completion_photo_url IS NOT NULL AND completion_photo_url != '' OR rejection_photo_url IS NOT NULL AND rejection_photo_url != '') AND deleted_at IS NULL) +
    -- checklist_items (before + after)
    (SELECT COUNT(*) FROM checklist_items WHERE (before_photo_url IS NOT NULL AND before_photo_url != '') AND deleted_at IS NULL) +
    (SELECT COUNT(*) FROM checklist_items WHERE (after_photo_url IS NOT NULL AND after_photo_url != '') AND deleted_at IS NULL) +
    -- products
    (SELECT COUNT(*) FROM products WHERE image_url IS NOT NULL AND image_url != '' AND deleted_at IS NULL)
  ) as total_photos;

-- 3. 테이블별 상세 통계
SELECT 
  'cleaning_photos' as table_name,
  COUNT(*) as total_records,
  COUNT(photo_url) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '') as photos_with_url,
  ROUND(AVG(LENGTH(photo_url)) FILTER (WHERE photo_url IS NOT NULL), 0) as avg_url_length
FROM cleaning_photos
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'issues' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE (photo_url IS NOT NULL AND photo_url != '') OR (photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0)) as photos_with_url,
  ROUND(AVG(COALESCE(LENGTH(photo_url), 0) + COALESCE(array_length(photo_urls, 1) * 100, 0)) FILTER (WHERE photo_url IS NOT NULL OR photo_urls IS NOT NULL), 0) as avg_url_length
FROM issues
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'supply_requests' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE (photo_url IS NOT NULL AND photo_url != '') OR (completion_photo_url IS NOT NULL AND completion_photo_url != '') OR (rejection_photo_url IS NOT NULL AND rejection_photo_url != '')) as photos_with_url,
  ROUND(AVG(COALESCE(LENGTH(photo_url), 0) + COALESCE(LENGTH(completion_photo_url), 0) + COALESCE(LENGTH(rejection_photo_url), 0)) FILTER (WHERE photo_url IS NOT NULL OR completion_photo_url IS NOT NULL OR rejection_photo_url IS NOT NULL), 0) as avg_url_length
FROM supply_requests
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'checklist_items' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE (before_photo_url IS NOT NULL AND before_photo_url != '') OR (after_photo_url IS NOT NULL AND after_photo_url != '')) as photos_with_url,
  ROUND(AVG(COALESCE(LENGTH(before_photo_url), 0) + COALESCE(LENGTH(after_photo_url), 0)) FILTER (WHERE before_photo_url IS NOT NULL OR after_photo_url IS NOT NULL), 0) as avg_url_length
FROM checklist_items
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'products' as table_name,
  COUNT(*) as total_records,
  COUNT(image_url) FILTER (WHERE image_url IS NOT NULL AND image_url != '') as photos_with_url,
  ROUND(AVG(LENGTH(image_url)) FILTER (WHERE image_url IS NOT NULL), 0) as avg_url_length
FROM products
WHERE deleted_at IS NULL;

-- 4. 최근 업로드된 사진 (최근 30일)
SELECT 
  '최근 30일 사진 수' as period,
  (
    (SELECT COUNT(*) FROM cleaning_photos WHERE photo_url IS NOT NULL AND photo_url != '' AND created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) +
    (SELECT COUNT(*) FROM issues WHERE (photo_url IS NOT NULL AND photo_url != '') AND created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) +
    (SELECT COALESCE(SUM(array_length(photo_urls, 1)), 0) FROM issues WHERE photo_urls IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) +
    (SELECT COUNT(*) FROM supply_requests WHERE (photo_url IS NOT NULL AND photo_url != '' OR completion_photo_url IS NOT NULL AND completion_photo_url != '' OR rejection_photo_url IS NOT NULL AND rejection_photo_url != '') AND created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) +
    (SELECT COUNT(*) FROM checklist_items WHERE (before_photo_url IS NOT NULL AND before_photo_url != '' OR after_photo_url IS NOT NULL AND after_photo_url != '') AND created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) +
    (SELECT COUNT(*) FROM products WHERE image_url IS NOT NULL AND image_url != '' AND created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL)
  ) as photo_count;
