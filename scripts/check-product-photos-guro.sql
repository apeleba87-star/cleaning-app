-- 구로디지털단지역점 제품 입고/보관 사진 DB 확인
-- store_id: 41b73bda-9a68-4559-9e99-6598faba76fd
-- Supabase SQL Editor에서 실행 후 결과 확인

-- 1) 해당 매장 정보 확인
SELECT id AS store_id, name, address
FROM public.stores
WHERE id = '41b73bda-9a68-4559-9e99-6598faba76fd' AND deleted_at IS NULL;

-- 2) 해당 매장의 오늘(한국날짜) 제품 입고/보관 사진 건수
--    created_at은 UTC 저장 → 한국날짜 오늘 구간으로 필터
WITH today_kst AS (
  SELECT
    (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')::timestamptz AS start_utc,
    ((date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') + interval '1 day') AT TIME ZONE 'Asia/Seoul')::timestamptz AS end_utc
)
SELECT
  pp.id,
  pp.store_id,
  pp.type,
  pp.photo_type,
  jsonb_array_length(COALESCE(pp.photo_urls, '[]'::jsonb)) AS url_count,
  pp.created_at,
  pp.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS created_at_kst
FROM public.product_photos pp
CROSS JOIN today_kst t
WHERE pp.store_id = '41b73bda-9a68-4559-9e99-6598faba76fd'
  AND pp.type IN ('receipt', 'storage')
  AND pp.created_at >= t.start_utc
  AND pp.created_at <  t.end_utc
ORDER BY pp.created_at DESC;

-- 3) 해당 매장의 최근 7일 제품 입고/보관 사진 요약 (오늘 포함)
SELECT
  pp.type,
  date(pp.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') AS work_date_kst,
  count(*) AS photo_rows,
  sum(jsonb_array_length(COALESCE(pp.photo_urls, '[]'::jsonb))) AS total_urls
FROM public.product_photos pp
WHERE pp.store_id = '41b73bda-9a68-4559-9e99-6598faba76fd'
  AND pp.created_at >= now() - interval '7 days'
GROUP BY 1, 2
ORDER BY 2 DESC, 1;
