-- franchises 테이블 생성
CREATE TABLE IF NOT EXISTS public.franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_registration_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- users 테이블에 franchise_id 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES public.franchises(id) ON DELETE SET NULL;

-- stores 테이블에 franchise_id 컬럼 추가
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES public.franchises(id) ON DELETE SET NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_franchises_company_id ON public.franchises(company_id);
CREATE INDEX IF NOT EXISTS idx_franchises_status ON public.franchises(status);
CREATE INDEX IF NOT EXISTS idx_franchises_deleted_at ON public.franchises(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_franchise_id ON public.users(franchise_id);
CREATE INDEX IF NOT EXISTS idx_stores_franchise_id ON public.stores(franchise_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우를 위해)
DROP POLICY IF EXISTS "Business owners can view their company franchises" ON public.franchises;
DROP POLICY IF EXISTS "Business owners can create franchises for their company" ON public.franchises;
DROP POLICY IF EXISTS "Business owners can update their company franchises" ON public.franchises;
DROP POLICY IF EXISTS "Business owners can delete their company franchises" ON public.franchises;
DROP POLICY IF EXISTS "Franchise managers can view their own franchise" ON public.franchises;

-- RLS 정책: business_owner는 자신의 회사 프렌차이즈 조회/생성/수정/삭제 가능
CREATE POLICY "Business owners can view their company franchises"
  ON public.franchises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = franchises.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
    OR deleted_at IS NULL
  );

CREATE POLICY "Business owners can create franchises for their company"
  ON public.franchises
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = franchises.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can update their company franchises"
  ON public.franchises
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = franchises.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can delete their company franchises"
  ON public.franchises
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = franchises.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

-- RLS 정책: franchise_manager는 자신의 프렌차이즈 조회 가능
CREATE POLICY "Franchise managers can view their own franchise"
  ON public.franchises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.franchise_id = franchises.id
        AND u.role = 'franchise_manager'
    )
    OR deleted_at IS NULL
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_franchises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 (이미 존재하는 경우를 위해)
DROP TRIGGER IF EXISTS update_franchises_updated_at ON public.franchises;

CREATE TRIGGER update_franchises_updated_at
  BEFORE UPDATE ON public.franchises
  FOR EACH ROW
  EXECUTE FUNCTION update_franchises_updated_at();

-- 코멘트 추가
COMMENT ON TABLE public.franchises IS '프렌차이즈 정보';
COMMENT ON COLUMN public.franchises.company_id IS '소속 회사 ID';
COMMENT ON COLUMN public.franchises.status IS 'active: 활성, inactive: 비활성, suspended: 정지';

