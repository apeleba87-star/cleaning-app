-- 성능 최적화: 기간/시간 조건 조회용 복합 인덱스
-- 5년치 데이터가 쌓여도 "최근/기간만" 조회 시 스캔 범위를 줄이기 위함 (RLS 변경 없음)

-- payrolls: 회사별 + 급여기간
CREATE INDEX IF NOT EXISTS idx_payrolls_company_period
  ON payrolls(company_id, pay_period)
  WHERE deleted_at IS NULL;

-- revenues: 회사별 + 서비스기간
CREATE INDEX IF NOT EXISTS idx_revenues_company_period
  ON revenues(company_id, service_period)
  WHERE deleted_at IS NULL;

-- expenses: 회사별 + 지출일
CREATE INDEX IF NOT EXISTS idx_expenses_company_date
  ON expenses(company_id, date)
  WHERE deleted_at IS NULL;

-- subcontract_payments: 회사별 + 급여기간
CREATE INDEX IF NOT EXISTS idx_subcontract_payments_company_period
  ON subcontract_payments(company_id, pay_period)
  WHERE deleted_at IS NULL;

-- requests: 매장별 + 생성일 (목록/아카이브 필터용)
CREATE INDEX IF NOT EXISTS idx_requests_store_created
  ON requests(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_store_archived_completed
  ON requests(store_id, is_archived, completed_at)
  WHERE status = 'completed';

-- attendance (출근): 매장별 + 근무일
CREATE INDEX IF NOT EXISTS idx_attendance_store_work_date
  ON attendance(store_id, work_date);
