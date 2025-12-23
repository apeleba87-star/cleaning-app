-- users 테이블에 승인 상태 관련 필드 추가

-- approval_status: 승인 상태 (pending, approved, rejected)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';

-- 기존 사용자는 모두 approved로 설정
UPDATE users 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;

-- approved_at: 승인일시
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- approved_by: 승인자 ID
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- rejection_reason: 거절 사유
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 인덱스 추가 (승인 대기 사용자 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status, company_id) 
WHERE approval_status = 'pending';

