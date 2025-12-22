-- ============================================================
-- payrolls 테이블 수정: 일당 근로자 지원
-- ============================================================

-- 기존 제약조건 확인 및 제거
ALTER TABLE public.payrolls 
  DROP CONSTRAINT IF EXISTS payrolls_user_id_fkey;

-- user_id를 nullable로 변경 (일당 근로자는 user_id 없음)
ALTER TABLE public.payrolls 
  ALTER COLUMN user_id DROP NOT NULL;

-- 일당 근로자 정보 컬럼 추가
ALTER TABLE public.payrolls 
  ADD COLUMN IF NOT EXISTS worker_name TEXT,
  ADD COLUMN IF NOT EXISTS resident_registration_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS work_days INTEGER,
  ADD COLUMN IF NOT EXISTS daily_wage NUMERIC;

-- 제약조건: 정규 직원(user_id 있음) 또는 일당 근로자(worker_name 있음) 중 하나만 있어야 함
ALTER TABLE public.payrolls 
  DROP CONSTRAINT IF EXISTS check_worker_info;

ALTER TABLE public.payrolls 
  ADD CONSTRAINT check_worker_info CHECK (
    (user_id IS NOT NULL AND worker_name IS NULL) OR  -- 정규 직원
    (user_id IS NULL AND worker_name IS NOT NULL)     -- 일당 근로자
  );

-- user_id FK 제약조건 재생성 (nullable이므로)
ALTER TABLE public.payrolls 
  ADD CONSTRAINT payrolls_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE RESTRICT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_payrolls_worker_name ON public.payrolls(worker_name) WHERE deleted_at IS NULL;

-- 주석 추가
COMMENT ON COLUMN public.payrolls.worker_name IS '일당 근로자 이름 (user_id가 없을 때 사용)';
COMMENT ON COLUMN public.payrolls.resident_registration_number_encrypted IS '주민등록번호 (암호화된 값, 일당 근로자 세금 처리용)';
COMMENT ON COLUMN public.payrolls.work_days IS '근무 일수 (일당 근로자)';
COMMENT ON COLUMN public.payrolls.daily_wage IS '일당 금액 (일당 근로자)';

-- ============================================================
-- payrolls의 company_id 자동 설정 트리거 수정
-- ============================================================

-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS trigger_set_payrolls_company_id ON public.payrolls;

-- 수정된 함수: user_id가 없으면 company_id를 직접 설정해야 함
CREATE OR REPLACE FUNCTION set_payrolls_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- user_id가 있으면 users 테이블에서 company_id 가져오기
  IF NEW.user_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.users
    WHERE id = NEW.user_id
      AND (is_active = true OR is_active IS NULL);
    
    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine company_id for user_id: %. User may not exist or has no company_id.', NEW.user_id;
    END IF;
    
    NEW.company_id := v_company_id;
  ELSE
    -- 일당 근로자인 경우 company_id는 필수 (애플리케이션에서 설정해야 함)
    IF NEW.company_id IS NULL THEN
      RAISE EXCEPTION 'company_id is required for daily workers (when user_id is NULL)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 재생성
CREATE TRIGGER trigger_set_payrolls_company_id
  BEFORE INSERT ON public.payrolls
  FOR EACH ROW
  EXECUTE FUNCTION set_payrolls_company_id();

