-- ============================================================
-- users 테이블에 position (직급) 컬럼 추가
-- ============================================================

ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS position TEXT;

-- 주석 추가
COMMENT ON COLUMN public.users.position IS '직급 (예: 대리, 과장, 차장 등)';

