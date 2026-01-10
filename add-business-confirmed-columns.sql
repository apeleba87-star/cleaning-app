-- 업체관리자 확인 처리 컬럼 추가
-- requests, problem_reports, lost_items 테이블에 business_confirmed_at, business_confirmed_by 추가

-- requests 테이블에 확인 처리 컬럼 추가
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS business_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS business_confirmed_by UUID;

-- problem_reports 테이블에 확인 처리 컬럼 추가 (store_problems와 vending_problems는 problem_reports로 통합)
ALTER TABLE problem_reports 
ADD COLUMN IF NOT EXISTS business_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS business_confirmed_by UUID;

-- lost_items 테이블에 확인 처리 컬럼 추가
ALTER TABLE lost_items 
ADD COLUMN IF NOT EXISTS business_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS business_confirmed_by UUID;

-- 외래키 제약조건 추가 (business_confirmed_by -> users.id)
-- 기존 제약조건이 있을 수 있으므로 IF NOT EXISTS는 사용 불가, 대신 제약조건 이름 확인 후 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_requests_business_confirmed_by'
  ) THEN
    ALTER TABLE requests 
    ADD CONSTRAINT fk_requests_business_confirmed_by 
    FOREIGN KEY (business_confirmed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_problem_reports_business_confirmed_by'
  ) THEN
    ALTER TABLE problem_reports 
    ADD CONSTRAINT fk_problem_reports_business_confirmed_by 
    FOREIGN KEY (business_confirmed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_lost_items_business_confirmed_by'
  ) THEN
    ALTER TABLE lost_items 
    ADD CONSTRAINT fk_lost_items_business_confirmed_by 
    FOREIGN KEY (business_confirmed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 컬럼 설명 추가
COMMENT ON COLUMN requests.business_confirmed_at IS '업체관리자가 확인 처리한 일시';
COMMENT ON COLUMN requests.business_confirmed_by IS '확인 처리한 업체관리자 ID';
COMMENT ON COLUMN problem_reports.business_confirmed_at IS '업체관리자가 확인 처리한 일시';
COMMENT ON COLUMN problem_reports.business_confirmed_by IS '확인 처리한 업체관리자 ID';
COMMENT ON COLUMN lost_items.business_confirmed_at IS '업체관리자가 확인 처리한 일시';
COMMENT ON COLUMN lost_items.business_confirmed_by IS '확인 처리한 업체관리자 ID';
