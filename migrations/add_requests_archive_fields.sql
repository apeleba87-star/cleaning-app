-- 요청 아카이브 기능을 위한 필드 추가
-- 완료 후 30일 경과 시 자동 아카이브 처리

-- requests 테이블에 아카이브 필드 추가
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- supply_requests 테이블에도 아카이브 필드 추가
ALTER TABLE supply_requests
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_requests_archived_at ON requests(archived_at) WHERE is_archived = TRUE;
CREATE INDEX IF NOT EXISTS idx_requests_completed_at_archived ON requests(completed_at) WHERE status = 'completed' AND is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_supply_requests_archived_at ON supply_requests(archived_at) WHERE is_archived = TRUE;
CREATE INDEX IF NOT EXISTS idx_supply_requests_completed_at_archived ON supply_requests(completed_at) WHERE status = 'completed' AND is_archived = FALSE;

-- 기존 완료된 요청 중 30일 경과된 것들을 자동으로 아카이브 처리
-- requests 테이블
UPDATE requests
SET 
  archived_at = NOW(),
  is_archived = TRUE
WHERE 
  status = 'completed'
  AND completed_at IS NOT NULL
  AND completed_at < NOW() - INTERVAL '30 days'
  AND (is_archived IS NULL OR is_archived = FALSE);

-- supply_requests 테이블
UPDATE supply_requests
SET 
  archived_at = NOW(),
  is_archived = TRUE
WHERE 
  status = 'completed'
  AND completed_at IS NOT NULL
  AND completed_at < NOW() - INTERVAL '30 days'
  AND (is_archived IS NULL OR is_archived = FALSE);
