-- 업체 관리자 앱 최적화를 위한 데이터베이스 인덱스 추가
-- 실행 전에 백업을 권장합니다.

-- 1. revenues 테이블 인덱스
-- Financial Summary API에서 자주 사용되는 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_revenues_company_period 
  ON revenues(company_id, service_period) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_revenues_store_id 
  ON revenues(store_id) 
  WHERE deleted_at IS NULL;

-- 2. receipts 테이블 인덱스
-- revenue_id로 조회하는 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_receipts_revenue_id 
  ON receipts(revenue_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_company_received_at 
  ON receipts(company_id, received_at) 
  WHERE deleted_at IS NULL;

-- 3. attendance 테이블 인덱스
-- Stores Status API에서 자주 사용되는 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_attendance_store_date 
  ON attendance(store_id, work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date 
  ON attendance(user_id, work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_store_clock_in 
  ON attendance(store_id, clock_in_at);

-- 4. problem_reports 테이블 인덱스
-- 매장별, 날짜별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_problem_reports_store_created 
  ON problem_reports(store_id, created_at);

-- 5. lost_items 테이블 인덱스
-- 매장별, 날짜별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_lost_items_store_created 
  ON lost_items(store_id, created_at);

CREATE INDEX IF NOT EXISTS idx_lost_items_store_updated 
  ON lost_items(store_id, updated_at);

-- 6. requests 테이블 인덱스
-- 매장별, 날짜별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_requests_store_created 
  ON requests(store_id, created_at);

-- 7. supply_requests 테이블 인덱스
-- 매장별, 상태별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_supply_requests_store_status 
  ON supply_requests(store_id, status);

-- 8. checklist 테이블 인덱스
-- 매장별, 날짜별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_checklist_store_date 
  ON checklist(store_id, work_date);

-- 9. cleaning_photos 테이블 인덱스
-- 매장별, 날짜별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_store_created 
  ON cleaning_photos(store_id, created_at);

-- 10. store_assign 테이블 인덱스
-- 매장별 배정 조회 최적화
CREATE INDEX IF NOT EXISTS idx_store_assign_store_id 
  ON store_assign(store_id);

CREATE INDEX IF NOT EXISTS idx_store_assign_user_id 
  ON store_assign(user_id);

-- 11. payrolls 테이블 인덱스
-- 사용자별, 기간별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_payrolls_user_period 
  ON payrolls(user_id, pay_period) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payrolls_company_period 
  ON payrolls(company_id, pay_period) 
  WHERE deleted_at IS NULL;

-- 12. subcontracts 테이블 인덱스
-- 회사별, 상태별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subcontracts_company_status 
  ON subcontracts(company_id, status) 
  WHERE deleted_at IS NULL;

-- 13. subcontract_payments 테이블 인덱스
-- 도급별, 기간별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subcontract_payments_subcontract_period 
  ON subcontract_payments(subcontract_id, pay_period) 
  WHERE deleted_at IS NULL;

-- 14. stores 테이블 인덱스
-- 회사별, 미수금 추적 활성화 매장 조회 최적화
CREATE INDEX IF NOT EXISTS idx_stores_company_unpaid_tracking 
  ON stores(company_id, unpaid_tracking_enabled) 
  WHERE deleted_at IS NULL;

-- 인덱스 생성 확인 쿼리
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename IN (
--   'revenues', 'receipts', 'attendance', 'problem_reports', 
--   'lost_items', 'requests', 'supply_requests', 'checklist', 
--   'cleaning_photos', 'store_assign', 'payrolls', 'subcontracts', 
--   'subcontract_payments', 'stores'
-- )
-- ORDER BY tablename, indexname;
