-- 미관리 매장 집계 결과 저장 테이블
CREATE TABLE IF NOT EXISTS public.unmanaged_stores_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_date DATE NOT NULL, -- 집계 날짜 (어제 날짜)
  store_type TEXT NOT NULL CHECK (store_type IN ('general', 'night')), -- 'general' or 'night'
  aggregated_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 집계 시각
  total_stores INT NOT NULL DEFAULT 0,
  managed_count INT NOT NULL DEFAULT 0,
  unmanaged_count INT NOT NULL DEFAULT 0,
  unmanaged_store_ids UUID[] DEFAULT '{}', -- 미관리 매장 ID 배열
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 회사별, 날짜별, 매장 타입별로 중복 방지
  UNIQUE(company_id, report_date, store_type)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_unmanaged_stores_summary_company_date 
  ON public.unmanaged_stores_summary(company_id, report_date DESC, store_type);

CREATE INDEX IF NOT EXISTS idx_unmanaged_stores_summary_report_date 
  ON public.unmanaged_stores_summary(report_date DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.unmanaged_stores_summary ENABLE ROW LEVEL SECURITY;

-- Policy: 업체관리자는 자신의 회사 데이터만 조회 가능
DROP POLICY IF EXISTS "Allow business owners to read their company data" ON public.unmanaged_stores_summary;
CREATE POLICY "Allow business owners to read their company data"
ON public.unmanaged_stores_summary FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (select auth.uid())
    AND users.company_id = unmanaged_stores_summary.company_id
    AND users.role = 'business_owner'
  )
);

-- Policy: Service role은 모든 작업 가능 (크론잡용)
DROP POLICY IF EXISTS "Allow service role to manage all summaries" ON public.unmanaged_stores_summary;
CREATE POLICY "Allow service role to manage all summaries"
ON public.unmanaged_stores_summary FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
