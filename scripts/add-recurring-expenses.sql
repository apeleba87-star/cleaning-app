-- 고정비(recurring expenses) 기능을 위한 테이블 및 컬럼 추가

-- 1. recurring_expenses 테이블 생성 (고정비 템플릿)
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  memo TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_company_id ON public.recurring_expenses(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_is_active ON public.recurring_expenses(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_store_id ON public.recurring_expenses(store_id) WHERE deleted_at IS NULL;

-- 2. expenses 테이블에 recurring_expense_id 컬럼 추가
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_expense_id ON public.expenses(recurring_expense_id) WHERE deleted_at IS NULL;

-- RLS 정책 추가 (필요시)
-- recurring_expenses 테이블에 대한 RLS는 기존 expenses와 유사하게 설정
