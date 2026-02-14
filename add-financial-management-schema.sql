-- ============================================================
-- 재무 관리 스키마 추가 마이그레이션
-- 기존 앱과 충돌 없이 안전하게 적용
-- ============================================================

-- ============================================================
-- 1. stores 테이블 확장
-- ============================================================

ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS settlement_cycle TEXT,
ADD COLUMN IF NOT EXISTS payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 31),
ADD COLUMN IF NOT EXISTS tax_invoice_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unpaid_tracking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_memo TEXT,
ADD COLUMN IF NOT EXISTS special_notes TEXT,
ADD COLUMN IF NOT EXISTS access_info TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. users 테이블 확장
-- ============================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pay_type TEXT,
ADD COLUMN IF NOT EXISTS pay_amount NUMERIC,
ADD COLUMN IF NOT EXISTS salary_payment_method TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS resignation_date DATE,
ADD COLUMN IF NOT EXISTS employment_type TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active) WHERE is_active = true;

-- ============================================================
-- 3. store_files 테이블 생성 (매장 문서 통합 관리)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_store_files_store_id ON public.store_files(store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_files_company_id ON public.store_files(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_files_doc_type ON public.store_files(doc_type) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. store_contacts 테이블 생성 (매장 담당자)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  contact_role TEXT NOT NULL CHECK (contact_role IN ('main', 'payment', 'extra')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_store_contacts_store_id ON public.store_contacts(store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_contacts_company_id ON public.store_contacts(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_contacts_role ON public.store_contacts(contact_role) WHERE deleted_at IS NULL;

-- 매장당 main 담당자는 최대 1명
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_contacts_unique_main 
  ON public.store_contacts(store_id, contact_role) 
  WHERE contact_role = 'main' AND deleted_at IS NULL;

-- ============================================================
-- 5. user_files 테이블 생성 (직원 문서)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('employment_contract', 'subcontract_contract')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON public.user_files(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_files_company_id ON public.user_files(company_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 6. user_sensitive 테이블 생성 (민감 정보 분리)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_sensitive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  resident_registration_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sensitive_user_id ON public.user_sensitive(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sensitive_company_id ON public.user_sensitive(company_id);

-- RLS 활성화
ALTER TABLE public.user_sensitive ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Only admins can access sensitive data" ON public.user_sensitive;

-- RLS 정책: 관리자만 접근 가능
CREATE POLICY "Only admins can access sensitive data"
  ON public.user_sensitive
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'business_owner', 'platform_admin')
    )
  );

-- ============================================================
-- 7. revenues 테이블 생성 (매출/청구)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  service_period TEXT NOT NULL CHECK (service_period ~ '^(\d{4})-(0[1-9]|1[0-2])$'),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  billing_memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_revenues_store_id ON public.revenues(store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revenues_company_id ON public.revenues(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revenues_service_period ON public.revenues(service_period) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revenues_status ON public.revenues(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revenues_due_date ON public.revenues(due_date) WHERE deleted_at IS NULL;

-- ============================================================
-- 8. receipts 테이블 생성 (수금 히스토리)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_id UUID NOT NULL REFERENCES public.revenues(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_receipts_revenue_id ON public.receipts(revenue_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_company_id ON public.receipts(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_received_at ON public.receipts(received_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 9. receipts 초과검증 함수 및 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION validate_receipt_amount()
RETURNS TRIGGER AS $$
DECLARE
  revenue_amount NUMERIC;
  total_received NUMERIC;
BEGIN
  -- revenue의 총 청구액 조회
  SELECT amount INTO revenue_amount
  FROM public.revenues
  WHERE id = NEW.revenue_id
    AND deleted_at IS NULL;
  
  IF revenue_amount IS NULL THEN
    RAISE EXCEPTION 'Revenue not found or deleted';
  END IF;
  
  -- INSERT: 전체 SUM + NEW.amount 검증
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_received
    FROM public.receipts
    WHERE revenue_id = NEW.revenue_id
      AND deleted_at IS NULL;
    
    IF (total_received + NEW.amount) > revenue_amount THEN
      RAISE EXCEPTION 'Receipt amount exceeds revenue amount. Revenue: %, Total received: %, New amount: %',
        revenue_amount, total_received, NEW.amount;
    END IF;
  
  -- UPDATE: 자기 자신 제외하고 검증
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_received
    FROM public.receipts
    WHERE revenue_id = NEW.revenue_id
      AND deleted_at IS NULL
      AND id != NEW.id;
    
    IF (total_received + NEW.amount) > revenue_amount THEN
      RAISE EXCEPTION 'Receipt amount exceeds revenue amount. Revenue: %, Total received (excluding self): %, New amount: %',
        revenue_amount, total_received, NEW.amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_receipt_amount ON public.receipts;

CREATE TRIGGER trigger_validate_receipt_amount
  BEFORE INSERT OR UPDATE ON public.receipts
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION validate_receipt_amount();

-- ============================================================
-- 10. revenues.status 자동 업데이트 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_revenue_status()
RETURNS TRIGGER AS $$
DECLARE
  total_received NUMERIC;
  revenue_amount NUMERIC;
BEGIN
  -- revenue_id에 해당하는 총 수금액 계산 (Soft Delete 고려)
  SELECT COALESCE(SUM(amount), 0) INTO total_received
  FROM public.receipts
  WHERE revenue_id = COALESCE(NEW.revenue_id, OLD.revenue_id)
    AND deleted_at IS NULL;
  
  -- revenue의 총 청구액 조회
  SELECT amount INTO revenue_amount
  FROM public.revenues
  WHERE id = COALESCE(NEW.revenue_id, OLD.revenue_id)
    AND deleted_at IS NULL;
  
  IF revenue_amount IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- status 업데이트
  UPDATE public.revenues
  SET 
    status = CASE
      WHEN total_received = 0 THEN 'unpaid'
      WHEN total_received >= revenue_amount THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.revenue_id, OLD.revenue_id)
    AND deleted_at IS NULL;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_revenue_status ON public.receipts;

CREATE TRIGGER trigger_update_revenue_status
  AFTER INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_revenue_status();

-- ============================================================
-- 11. expenses 테이블 생성 (비용 통합 관리)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('purchase', 'operating', 'vehicle', 'chemical', 'supplies', 'other')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  memo TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_store_id ON public.expenses(store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON public.expenses(company_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 12. payrolls 테이블 생성 (인건비)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  pay_period TEXT NOT NULL CHECK (pay_period ~ '^(\d{4})-(0[1-9]|1[0-2])$'),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  paid_at DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paid')),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payrolls_user_id ON public.payrolls(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payrolls_company_id ON public.payrolls(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payrolls_pay_period ON public.payrolls(pay_period) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payrolls_status ON public.payrolls(status) WHERE deleted_at IS NULL;

-- 같은 user_id와 pay_period 조합은 중복 불가
CREATE UNIQUE INDEX IF NOT EXISTS idx_payrolls_unique_period
  ON public.payrolls(user_id, pay_period)
  WHERE deleted_at IS NULL;

-- ============================================================
-- 13. company_id 자동 설정 트리거 함수들
-- ============================================================

-- store_files의 company_id 자동 설정
CREATE OR REPLACE FUNCTION set_store_files_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT company_id INTO v_company_id
  FROM public.stores
  WHERE id = NEW.store_id
    AND deleted_at IS NULL;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine company_id for store_id: %. Store may not exist or has no company_id.', NEW.store_id;
  END IF;
  
  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_store_files_company_id ON public.store_files;

CREATE TRIGGER trigger_set_store_files_company_id
  BEFORE INSERT ON public.store_files
  FOR EACH ROW
  EXECUTE FUNCTION set_store_files_company_id();

-- store_contacts의 company_id 자동 설정
CREATE OR REPLACE FUNCTION set_store_contacts_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT company_id INTO v_company_id
  FROM public.stores
  WHERE id = NEW.store_id
    AND deleted_at IS NULL;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine company_id for store_id: %. Store may not exist or has no company_id.', NEW.store_id;
  END IF;
  
  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_store_contacts_company_id ON public.store_contacts;

CREATE TRIGGER trigger_set_store_contacts_company_id
  BEFORE INSERT ON public.store_contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_store_contacts_company_id();

-- user_files의 company_id 자동 설정
CREATE OR REPLACE FUNCTION set_user_files_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT company_id INTO v_company_id
  FROM public.users
  WHERE id = NEW.user_id
    AND (is_active = true OR is_active IS NULL);
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine company_id for user_id: %. User may not exist or has no company_id.', NEW.user_id;
  END IF;
  
  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_user_files_company_id ON public.user_files;

CREATE TRIGGER trigger_set_user_files_company_id
  BEFORE INSERT ON public.user_files
  FOR EACH ROW
  EXECUTE FUNCTION set_user_files_company_id();

-- revenues의 company_id 자동 설정
CREATE OR REPLACE FUNCTION set_revenues_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT company_id INTO v_company_id
  FROM public.stores
  WHERE id = NEW.store_id
    AND deleted_at IS NULL;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine company_id for store_id: %. Store may not exist or has no company_id.', NEW.store_id;
  END IF;
  
  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_revenues_company_id ON public.revenues;

CREATE TRIGGER trigger_set_revenues_company_id
  BEFORE INSERT ON public.revenues
  FOR EACH ROW
  EXECUTE FUNCTION set_revenues_company_id();

-- receipts의 company_id 자동 설정
CREATE OR REPLACE FUNCTION set_receipts_company_id()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT rev.company_id INTO v_company_id
  FROM public.revenues rev
  WHERE rev.id = NEW.revenue_id
    AND rev.deleted_at IS NULL;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine company_id for revenue_id: %. Revenue may not exist or has no company_id.', NEW.revenue_id;
  END IF;
  
  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_receipts_company_id ON public.receipts;

CREATE TRIGGER trigger_set_receipts_company_id
  BEFORE INSERT ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_receipts_company_id();

-- payrolls의 company_id 자동 설정 (일당 근로자 지원)
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

DROP TRIGGER IF EXISTS trigger_set_payrolls_company_id ON public.payrolls;

CREATE TRIGGER trigger_set_payrolls_company_id
  BEFORE INSERT ON public.payrolls
  FOR EACH ROW
  EXECUTE FUNCTION set_payrolls_company_id();

-- ============================================================
-- 14. 미수금 계산 함수들
-- ============================================================

-- 특정 매장의 미수금 계산 (store_id 필수)
CREATE OR REPLACE FUNCTION calculate_unpaid_amount(
  p_store_id UUID,
  p_period TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  total_revenue NUMERIC;
  total_received NUMERIC;
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required for calculate_unpaid_amount()';
  END IF;
  
  -- 특정 매장의 총 청구액
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue
  FROM public.revenues
  WHERE store_id = p_store_id
    AND deleted_at IS NULL
    AND (p_period IS NULL OR service_period = p_period);
  
  -- 특정 매장의 총 수금액
  SELECT COALESCE(SUM(rec.amount), 0) INTO total_received
  FROM public.receipts rec
  JOIN public.revenues rev ON rec.revenue_id = rev.id
  WHERE rev.store_id = p_store_id
    AND rec.deleted_at IS NULL
    AND rev.deleted_at IS NULL
    AND (p_period IS NULL OR rev.service_period = p_period);
  
  RETURN total_revenue - total_received;
END;
$$ LANGUAGE plpgsql;

-- 전체/기간별 미수금 계산
CREATE OR REPLACE FUNCTION calculate_total_unpaid_amount(
  p_company_id UUID DEFAULT NULL,
  p_period TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  total_revenue NUMERIC;
  total_received NUMERIC;
BEGIN
  -- 전체 또는 특정 회사의 총 청구액
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue
  FROM public.revenues
  WHERE deleted_at IS NULL
    AND (p_company_id IS NULL OR company_id = p_company_id)
    AND (p_period IS NULL OR service_period = p_period);
  
  -- 전체 또는 특정 회사의 총 수금액
  SELECT COALESCE(SUM(rec.amount), 0) INTO total_received
  FROM public.receipts rec
  JOIN public.revenues rev ON rec.revenue_id = rev.id
  WHERE rec.deleted_at IS NULL
    AND rev.deleted_at IS NULL
    AND (p_company_id IS NULL OR rev.company_id = p_company_id)
    AND (p_period IS NULL OR rev.service_period = p_period);
  
  RETURN total_revenue - total_received;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 15. RLS 정책 설정
-- ============================================================

-- revenues RLS
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company revenues" ON public.revenues;

CREATE POLICY "Business owners can view their company revenues"
  ON public.revenues
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.users u ON u.company_id = s.company_id
      WHERE s.id = revenues.store_id
        AND u.id = (select auth.uid())
        AND u.role IN ('business_owner', 'platform_admin')
        AND s.deleted_at IS NULL
        AND (u.is_active = true OR u.is_active IS NULL)
    )
    OR company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- receipts RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company receipts" ON public.receipts;

CREATE POLICY "Business owners can view their company receipts"
  ON public.receipts
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- expenses RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company expenses" ON public.expenses;

CREATE POLICY "Business owners can view their company expenses"
  ON public.expenses
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- payrolls RLS
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company payrolls" ON public.payrolls;

CREATE POLICY "Business owners can view their company payrolls"
  ON public.payrolls
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- store_files RLS
ALTER TABLE public.store_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company store files" ON public.store_files;
DROP POLICY IF EXISTS "Business owners can insert their company store files" ON public.store_files;
DROP POLICY IF EXISTS "Business owners can delete their company store files" ON public.store_files;

CREATE POLICY "Business owners can view their company store files"
  ON public.store_files
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

CREATE POLICY "Business owners can insert their company store files"
  ON public.store_files
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

CREATE POLICY "Business owners can delete their company store files"
  ON public.store_files
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- store_contacts RLS
ALTER TABLE public.store_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company store contacts" ON public.store_contacts;

CREATE POLICY "Business owners can view their company store contacts"
  ON public.store_contacts
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- user_files RLS
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company user files" ON public.user_files;

CREATE POLICY "Business owners can view their company user files"
  ON public.user_files
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

-- ============================================================
-- 16. updated_at 자동 업데이트 트리거
-- ============================================================

-- store_files updated_at
CREATE OR REPLACE FUNCTION update_store_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_store_files_updated_at ON public.store_files;

CREATE TRIGGER trigger_update_store_files_updated_at
  BEFORE UPDATE ON public.store_files
  FOR EACH ROW
  EXECUTE FUNCTION update_store_files_updated_at();

-- store_contacts updated_at
CREATE OR REPLACE FUNCTION update_store_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_store_contacts_updated_at ON public.store_contacts;

CREATE TRIGGER trigger_update_store_contacts_updated_at
  BEFORE UPDATE ON public.store_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_store_contacts_updated_at();

-- user_files updated_at
CREATE OR REPLACE FUNCTION update_user_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_files_updated_at ON public.user_files;

CREATE TRIGGER trigger_update_user_files_updated_at
  BEFORE UPDATE ON public.user_files
  FOR EACH ROW
  EXECUTE FUNCTION update_user_files_updated_at();

-- revenues updated_at
CREATE OR REPLACE FUNCTION update_revenues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_revenues_updated_at ON public.revenues;

CREATE TRIGGER trigger_update_revenues_updated_at
  BEFORE UPDATE ON public.revenues
  FOR EACH ROW
  EXECUTE FUNCTION update_revenues_updated_at();

-- receipts updated_at
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_receipts_updated_at ON public.receipts;

CREATE TRIGGER trigger_update_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_receipts_updated_at();

-- expenses updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_expenses_updated_at ON public.expenses;

CREATE TRIGGER trigger_update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- payrolls updated_at
CREATE OR REPLACE FUNCTION update_payrolls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payrolls_updated_at ON public.payrolls;

CREATE TRIGGER trigger_update_payrolls_updated_at
  BEFORE UPDATE ON public.payrolls
  FOR EACH ROW
  EXECUTE FUNCTION update_payrolls_updated_at();

-- ============================================================
-- 마이그레이션 완료
-- ============================================================

