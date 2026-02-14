-- 물품 요청 기능 확장을 위한 필드 추가

-- supply_requests 테이블에 새로운 필드 추가
ALTER TABLE supply_requests
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS completion_photo_url TEXT,
ADD COLUMN IF NOT EXISTS completion_description TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 기존 데이터가 있으면 title을 item_name으로 설정
UPDATE supply_requests
SET title = COALESCE(item_name, '물품 요청')
WHERE title IS NULL;

-- title을 NOT NULL로 변경
ALTER TABLE supply_requests
ALTER COLUMN title SET NOT NULL;

-- RLS 정책 제거 (status 컬럼을 사용하는 모든 정책)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'supply_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON supply_requests', policy_record.policyname);
  END LOOP;
END $$;

-- 기존 CHECK 제약 조건 제거
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'supply_requests'::regclass
    AND conname = 'supply_requests_status_check'
  ) THEN
    ALTER TABLE supply_requests DROP CONSTRAINT supply_requests_status_check;
  END IF;
END $$;

-- status 컬럼을 VARCHAR로 변경 (enum 타입인 경우)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_attribute a
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'supply_requests'
    AND a.attname = 'status'
    AND t.typtype = 'e'
  ) THEN
    ALTER TABLE supply_requests 
    ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
  END IF;
END $$;

-- 기존 status 값을 새로운 상태로 변환
UPDATE supply_requests
SET status = CASE
  WHEN status::text = 'requested' THEN 'received'
  WHEN status::text = 'received' THEN 'received'
  WHEN status::text = 'completed' THEN 'completed'
  WHEN status::text = 'rejected' THEN 'received'
  ELSE 'received'
END;

-- 새로운 CHECK 제약 조건 추가
ALTER TABLE supply_requests
ADD CONSTRAINT supply_requests_status_check 
CHECK (status IN ('received', 'in_progress', 'manager_in_progress', 'completed'));

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_supply_requests_status ON supply_requests(status);
CREATE INDEX IF NOT EXISTS idx_supply_requests_store_status ON supply_requests(store_id, status);
CREATE INDEX IF NOT EXISTS idx_supply_requests_created_at ON supply_requests(created_at DESC);

-- RLS 정책 재생성 (VARCHAR 타입으로 처리)
-- Staff가 자신의 요청을 볼 수 있도록 SELECT 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supply_requests' 
    AND policyname = 'Staff can view supply requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Staff can view supply requests" ON supply_requests
    FOR SELECT
    USING ((select auth.uid())::text = user_id::text)';
  END IF;
END $$;

-- Staff가 자신의 요청을 생성할 수 있도록 INSERT 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supply_requests' 
    AND policyname = 'Staff can insert supply requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Staff can insert supply requests" ON supply_requests
    FOR INSERT
    WITH CHECK ((select auth.uid())::text = user_id::text)';
  END IF;
END $$;
