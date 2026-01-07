-- 야간 매장 관리 시작/종료 속도 최적화를 위한 인덱스 추가
-- 기존 인덱스와 충돌하지 않도록 IF NOT EXISTS 사용
-- 실행 전에 백업을 권장합니다.

-- 1. 출근 중인 매장 확인 최적화 (clock_out_at IS NULL인 경우)
-- 기존: idx_attendance_user_date (user_id, work_date)
-- 추가: clock_out_at 조건 포함 인덱스
CREATE INDEX IF NOT EXISTS idx_attendance_active_user_work_date 
ON attendance(user_id, work_date, clock_out_at) 
WHERE clock_out_at IS NULL;

-- 2. 특정 매장 출근 기록 조회 최적화
-- 기존: idx_attendance_store_date (store_id, work_date)
-- 추가: user_id와 clock_out_at 포함
CREATE INDEX IF NOT EXISTS idx_attendance_store_user_work_date 
ON attendance(user_id, store_id, work_date, clock_out_at);

-- 3. 미퇴근 기록 조회 최적화 (work_date 범위 조회)
-- 야간 매장의 경우 여러 work_date를 조회하므로 범위 인덱스
CREATE INDEX IF NOT EXISTS idx_attendance_user_clock_out_work_date 
ON attendance(user_id, clock_out_at, work_date) 
WHERE clock_out_at IS NULL;

-- 4. 최신 출근 기록 조회 최적화 (clock_in_at 기준)
CREATE INDEX IF NOT EXISTS idx_attendance_user_store_clock_in 
ON attendance(user_id, store_id, clock_in_at DESC) 
WHERE clock_out_at IS NULL;

-- 5. supply_requests 테이블 인덱스 (물품 요청 페이지 최적화)
-- 사용자별, 상태별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_supply_requests_user_status 
ON supply_requests(user_id, status, created_at DESC);

-- 매장별, 상태별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_supply_requests_store_status 
ON supply_requests(store_id, status, created_at DESC);

-- 완료된 요청 조회 최적화 (completed_at 기준)
CREATE INDEX IF NOT EXISTS idx_supply_requests_user_completed_at 
ON supply_requests(user_id, completed_at DESC) 
WHERE status = 'completed';

-- 사용자별, 매장별 조회 최적화 (출근한 매장의 요청만 조회할 때)
CREATE INDEX IF NOT EXISTS idx_supply_requests_user_store_status 
ON supply_requests(user_id, store_id, status, created_at DESC);

-- 인덱스 생성 확인 쿼리
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('attendance', 'supply_requests')
--   AND (indexname LIKE 'idx_attendance%' OR indexname LIKE 'idx_supply_requests%')
-- ORDER BY tablename, indexname;
