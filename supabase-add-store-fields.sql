-- 매장 테이블 필드 추가
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS head_office_name TEXT DEFAULT '개인',
ADD COLUMN IF NOT EXISTS parent_store_name TEXT,
ADD COLUMN IF NOT EXISTS management_days TEXT, -- 예: "월,수,금" 또는 JSONB 배열
ADD COLUMN IF NOT EXISTS service_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS service_active BOOLEAN DEFAULT true;

-- 기존 데이터에 기본값 설정
UPDATE public.stores
SET head_office_name = COALESCE(head_office_name, '개인'),
    service_active = COALESCE(service_active, true)
WHERE head_office_name IS NULL OR service_active IS NULL;


