-- 기존 매출 데이터의 납기일을 서비스 기간과 동일한 달로 업데이트
-- service_period의 년도와 월을 사용하고, payment_day를 일자로 설정
-- 예: service_period가 '2026-01'이고 payment_day가 28이면 → due_date를 '2026-01-28'로 설정

UPDATE revenues r
SET due_date = (
  SELECT 
    -- 서비스 기간의 년도-월에 payment_day를 일자로 설정
    -- payment_day가 해당 월의 말일보다 크면 말일로 조정
    LEAST(
      (r.service_period || '-' || LPAD(s.payment_day::text, 2, '0'))::date,
      (DATE_TRUNC('month', (r.service_period || '-01')::date) + INTERVAL '1 month' - INTERVAL '1 day')::date
    )
  FROM stores s
  WHERE s.id = r.store_id
    AND s.payment_day IS NOT NULL
)
WHERE r.deleted_at IS NULL
  AND r.service_period IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM stores s 
    WHERE s.id = r.store_id 
    AND s.payment_day IS NOT NULL
  );

-- 업데이트 결과 확인 쿼리
-- SELECT 
--   r.service_period,
--   r.due_date,
--   s.payment_day,
--   CASE 
--     WHEN EXTRACT(YEAR FROM r.due_date) = EXTRACT(YEAR FROM (r.service_period || '-01')::date)
--      AND EXTRACT(MONTH FROM r.due_date) = EXTRACT(MONTH FROM (r.service_period || '-01')::date)
--     THEN '같은 달 ✓'
--     ELSE '다른 달 ✗'
--   END as check_result
-- FROM revenues r
-- JOIN stores s ON s.id = r.store_id
-- WHERE r.deleted_at IS NULL
--   AND r.service_period IS NOT NULL
--   AND s.payment_day IS NOT NULL
-- ORDER BY r.service_period, r.due_date;
