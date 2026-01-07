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

-- 인덱스 생성 확인 쿼리
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'attendance'
--   AND indexname LIKE 'idx_attendance%'
-- ORDER BY indexname;
