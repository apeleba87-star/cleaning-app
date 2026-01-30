-- Supabase Security Advisor 대응: subcontracts, subcontract_payments, recurring_expenses RLS 활성화
-- 회사(company_id) 단위로만 접근 가능하도록 정책 추가

-- ========== public.subcontracts ==========
ALTER TABLE public.subcontracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company subcontracts" ON public.subcontracts;
DROP POLICY IF EXISTS "Business owners can create subcontracts for their company" ON public.subcontracts;
DROP POLICY IF EXISTS "Business owners can update their company subcontracts" ON public.subcontracts;
DROP POLICY IF EXISTS "Business owners can delete their company subcontracts" ON public.subcontracts;

CREATE POLICY "Business owners can view their company subcontracts"
  ON public.subcontracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontracts.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can create subcontracts for their company"
  ON public.subcontracts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontracts.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can update their company subcontracts"
  ON public.subcontracts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontracts.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontracts.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can delete their company subcontracts"
  ON public.subcontracts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontracts.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

-- ========== public.subcontract_payments ==========
ALTER TABLE public.subcontract_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company subcontract payments" ON public.subcontract_payments;
DROP POLICY IF EXISTS "Business owners can create subcontract payments for their company" ON public.subcontract_payments;
DROP POLICY IF EXISTS "Business owners can update their company subcontract payments" ON public.subcontract_payments;
DROP POLICY IF EXISTS "Business owners can delete their company subcontract payments" ON public.subcontract_payments;

CREATE POLICY "Business owners can view their company subcontract payments"
  ON public.subcontract_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontract_payments.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can create subcontract payments for their company"
  ON public.subcontract_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontract_payments.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can update their company subcontract payments"
  ON public.subcontract_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontract_payments.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontract_payments.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can delete their company subcontract payments"
  ON public.subcontract_payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = subcontract_payments.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

-- ========== public.recurring_expenses ==========
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their company recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Business owners can create recurring expenses for their company" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Business owners can update their company recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Business owners can delete their company recurring expenses" ON public.recurring_expenses;

CREATE POLICY "Business owners can view their company recurring expenses"
  ON public.recurring_expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = recurring_expenses.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can create recurring expenses for their company"
  ON public.recurring_expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = recurring_expenses.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can update their company recurring expenses"
  ON public.recurring_expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = recurring_expenses.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = recurring_expenses.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can delete their company recurring expenses"
  ON public.recurring_expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = recurring_expenses.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );
