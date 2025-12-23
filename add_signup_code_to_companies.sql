-- companies 테이블에 가입 코드 관련 필드 추가

-- signup_code: 회사 가입 코드 (고유)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS signup_code VARCHAR(50) UNIQUE;

-- signup_code_active: 코드 활성 상태
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS signup_code_active BOOLEAN DEFAULT true;

-- requires_approval: 가입 승인 필요 여부
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true;

-- default_role: 가입 시 기본 역할
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS default_role user_role DEFAULT 'staff';

-- 인덱스 추가 (코드 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_companies_signup_code ON companies(signup_code) 
WHERE signup_code_active = true AND signup_code IS NOT NULL;

-- 기존 회사에 기본 코드 생성 (ID의 앞 8자 사용)
UPDATE companies 
SET signup_code = 'COMPANY-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE signup_code IS NULL;


