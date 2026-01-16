-- ============================================================================
-- 율랑점 및 청주동남지구점 출근 기록 삭제 (출근전 상태로 복원)
-- ============================================================================
-- 실행 전에 백업을 권장합니다.
-- 주의: 이 스크립트는 오늘 날짜(한국 시간 기준)의 출근 기록만 삭제합니다.
-- 
-- 실행 방법:
-- 1단계: 확인 쿼리 실행 (8-16줄 복사)
-- 2단계: 출근 기록 확인 쿼리 실행 (25-42줄 복사)
-- 3단계: 삭제 쿼리 실행 (52-68줄 복사)
-- 4단계: 삭제 후 확인 쿼리 실행 (98-114줄 복사) - 선택사항
-- ============================================================================

-- ============================================================================
-- 1단계: 매장 ID 확인 (선택사항)
-- ============================================================================
-- 아래 쿼리를 복사 붙여넣기하여 실행하세요.
-- 매장 ID를 확인하려면 실행하고, 바로 진행하려면 생략하세요.
-- ============================================================================

SELECT 
    id, 
    name, 
    company_id,
    management_days
FROM stores 
WHERE name LIKE '%율랑%' OR name LIKE '%동남지구%' OR name LIKE '%청주동남지구%'
    AND deleted_at IS NULL
ORDER BY name;

-- ============================================================================
-- 2단계: 오늘 날짜의 출근 기록 확인 (필수)
-- ============================================================================
-- 아래 쿼리를 복사 붙여넣기하여 실행하세요.
-- 실행 결과로 삭제될 출근 기록을 확인한 후, 3단계로 진행하세요.
-- ============================================================================

SELECT 
    a.id,
    a.store_id,
    s.name AS store_name,
    a.user_id,
    u.name AS user_name,
    a.work_date,
    a.clock_in_at,
    a.clock_out_at,
    a.attendance_type,
    a.created_at
FROM attendance a
LEFT JOIN stores s ON a.store_id = s.id
LEFT JOIN users u ON a.user_id = u.id
WHERE s.name LIKE '%율랑%' OR s.name LIKE '%동남지구%' OR s.name LIKE '%청주동남지구%'
    AND s.deleted_at IS NULL
    AND a.work_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date
ORDER BY a.clock_in_at DESC;

-- ============================================================================
-- 3단계: 출근 기록 삭제 (필수)
-- ============================================================================
-- 주의: 2단계 결과를 확인한 후, 삭제할 데이터가 맞는지 확인하세요!
-- 
-- 실행 방법:
-- ① 아래 3줄(BEGIN; + DELETE; + COMMIT;)을 모두 복사하여 한 번에 실행
-- ② 또는 BEGIN;과 DELETE;를 먼저 실행하고, 확인 후 COMMIT; 실행
-- ============================================================================

BEGIN;

DELETE FROM attendance
WHERE store_id IN (
    SELECT id FROM stores 
    WHERE name LIKE '%율랑%' OR name LIKE '%동남지구%' OR name LIKE '%청주동남지구%'
        AND deleted_at IS NULL
)
AND work_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date;

-- 삭제가 정상적으로 되었다면 아래 COMMIT 실행:
COMMIT;

-- 삭제를 취소하려면 (위 COMMIT 대신) 아래 ROLLBACK 실행:
-- ROLLBACK;

-- ============================================================================
-- 4단계: 삭제 후 상태 확인 (선택사항)
-- ============================================================================
-- 아래 쿼리를 복사 붙여넣기하여 실행하세요.
-- 삭제 후 매장 상태가 "출근전"으로 변경되었는지 확인합니다.
-- ============================================================================

SELECT 
    s.id AS store_id,
    s.name AS store_name,
    COUNT(a.id) AS attendance_count,
    MAX(a.work_date) AS latest_work_date,
    CASE 
        WHEN COUNT(a.id) = 0 THEN '출근전'
        WHEN COUNT(a.id) > 0 AND COUNT(CASE WHEN a.clock_out_at IS NULL THEN 1 END) > 0 THEN '출근중'
        ELSE '퇴근완료'
    END AS status
FROM stores s
LEFT JOIN attendance a ON s.id = a.store_id 
    AND a.work_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date
WHERE s.name LIKE '%율랑%' OR s.name LIKE '%동남지구%' OR s.name LIKE '%청주동남지구%'
    AND s.deleted_at IS NULL
GROUP BY s.id, s.name
ORDER BY s.name;

-- ============================================================================
-- 추가: 청주동남지구 어제(2026-01-15) 완료 기록 삭제
-- ============================================================================
-- 청주동남지구점의 어제 완료된 출근 기록을 삭제하여 "출근전" 상태로 복원합니다.
-- 아래 쿼리를 복사 붙여넣기하여 실행하세요.
-- ============================================================================

BEGIN;

DELETE FROM attendance
WHERE store_id IN (
    SELECT id FROM stores 
    WHERE name LIKE '%동남지구%' OR name LIKE '%청주동남지구%'
        AND deleted_at IS NULL
)
AND work_date = '2026-01-15';  -- 어제 날짜 (2026-01-15)

-- 삭제가 정상적으로 되었다면 아래 COMMIT 실행:
COMMIT;

-- 삭제를 취소하려면 (위 COMMIT 대신) 아래 ROLLBACK 실행:
-- ROLLBACK;

-- ============================================================================
-- 대안: 특정 날짜 지정하여 삭제 (더 안전한 방법)
-- ============================================================================
-- 오늘 날짜가 아닌 특정 날짜를 지정하여 삭제하려면 아래 쿼리를 사용하세요.
-- 날짜 부분('2026-01-16')을 실제 삭제할 날짜로 변경하세요.
-- ============================================================================
/*
BEGIN;

DELETE FROM attendance
WHERE store_id IN (
    SELECT id FROM stores 
    WHERE name LIKE '%율랑%' OR name LIKE '%동남지구%' OR name LIKE '%청주동남지구%'
        AND deleted_at IS NULL
)
AND work_date = '2026-01-16';  -- 여기를 실제 날짜로 변경 (YYYY-MM-DD 형식)

COMMIT;
*/
