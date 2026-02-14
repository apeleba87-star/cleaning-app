-- Supabase Performance Advisor: auth_rls_initplan 대응
-- RLS 정책에서 auth.uid()를 (select auth.uid())로 변경하여 행별 재평가 방지
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ========== subcontracts, subcontract_payments, recurring_expenses ==========
-- (add_subcontracts_recurring_expenses_rls.sql에서 수정된 정책 적용)

DROP POLICY IF EXISTS "Business owners can view their company subcontracts" ON public.subcontracts;
DROP POLICY IF EXISTS "Business owners can create subcontracts for their company" ON public.subcontracts;
DROP POLICY IF EXISTS "Business owners can update their company subcontracts" ON public.subcontracts;
DROP POLICY IF EXISTS "Business owners can delete their company subcontracts" ON public.subcontracts;

CREATE POLICY "Business owners can view their company subcontracts"
  ON public.subcontracts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontracts.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can create subcontracts for their company"
  ON public.subcontracts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontracts.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can update their company subcontracts"
  ON public.subcontracts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontracts.company_id AND u.role IN ('business_owner', 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontracts.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can delete their company subcontracts"
  ON public.subcontracts FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontracts.company_id AND u.role IN ('business_owner', 'platform_admin')));

-- subcontract_payments
DROP POLICY IF EXISTS "Business owners can view their company subcontract payments" ON public.subcontract_payments;
DROP POLICY IF EXISTS "Business owners can create subcontract payments for their company" ON public.subcontract_payments;
DROP POLICY IF EXISTS "Business owners can update their company subcontract payments" ON public.subcontract_payments;
DROP POLICY IF EXISTS "Business owners can delete their company subcontract payments" ON public.subcontract_payments;

CREATE POLICY "Business owners can view their company subcontract payments"
  ON public.subcontract_payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontract_payments.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can create subcontract payments for their company"
  ON public.subcontract_payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontract_payments.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can update their company subcontract payments"
  ON public.subcontract_payments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontract_payments.company_id AND u.role IN ('business_owner', 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontract_payments.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can delete their company subcontract payments"
  ON public.subcontract_payments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = subcontract_payments.company_id AND u.role IN ('business_owner', 'platform_admin')));

-- recurring_expenses
DROP POLICY IF EXISTS "Business owners can view their company recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Business owners can create recurring expenses for their company" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Business owners can update their company recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Business owners can delete their company recurring expenses" ON public.recurring_expenses;

CREATE POLICY "Business owners can view their company recurring expenses"
  ON public.recurring_expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = recurring_expenses.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can create recurring expenses for their company"
  ON public.recurring_expenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = recurring_expenses.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can update their company recurring expenses"
  ON public.recurring_expenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = recurring_expenses.company_id AND u.role IN ('business_owner', 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = recurring_expenses.company_id AND u.role IN ('business_owner', 'platform_admin')));

CREATE POLICY "Business owners can delete their company recurring expenses"
  ON public.recurring_expenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = recurring_expenses.company_id AND u.role IN ('business_owner', 'platform_admin')));

-- ========== supply_requests (IF NOT EXISTS로 생성된 정책 수정용 DROP) ==========
DROP POLICY IF EXISTS "Staff can view supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Staff can insert supply requests" ON public.supply_requests;
DROP POLICY IF EXISTS "Business owners can view supply requests for their company stores" ON public.supply_requests;
DROP POLICY IF EXISTS "Business owners can update supply requests for their company stores" ON public.supply_requests;
DROP POLICY IF EXISTS "Store managers can view supply requests for their stores" ON public.supply_requests;
DROP POLICY IF EXISTS "Store managers can update supply requests for their stores" ON public.supply_requests;

-- supply_requests 정책 재생성 (auth_rls_initplan 수정 적용)
CREATE POLICY "Staff can view supply requests" ON public.supply_requests
  FOR SELECT USING ((select auth.uid())::text = user_id::text);

CREATE POLICY "Staff can insert supply requests" ON public.supply_requests
  FOR INSERT WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Business owners can view supply requests for their company stores" ON public.supply_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.stores s ON s.id = supply_requests.store_id
      WHERE u.id = (select auth.uid()) AND u.role = 'business_owner' AND u.company_id = s.company_id AND s.deleted_at IS NULL)
  );

CREATE POLICY "Business owners can update supply requests for their company stores" ON public.supply_requests
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.stores s ON s.id = supply_requests.store_id
    WHERE u.id = (select auth.uid()) AND u.role = 'business_owner' AND u.company_id = s.company_id AND s.deleted_at IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u JOIN public.stores s ON s.id = supply_requests.store_id
    WHERE u.id = (select auth.uid()) AND u.role = 'business_owner' AND u.company_id = s.company_id AND s.deleted_at IS NULL));

CREATE POLICY "Store managers can view supply requests for their stores" ON public.supply_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.store_assign sa ON sa.user_id = u.id JOIN public.stores s ON s.id = sa.store_id
      WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = supply_requests.store_id AND s.deleted_at IS NULL)
  );

CREATE POLICY "Store managers can update supply requests for their stores" ON public.supply_requests
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.store_assign sa ON sa.user_id = u.id JOIN public.stores s ON s.id = sa.store_id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = supply_requests.store_id AND s.deleted_at IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u JOIN public.store_assign sa ON sa.user_id = u.id JOIN public.stores s ON s.id = sa.store_id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = supply_requests.store_id AND s.deleted_at IS NULL));

-- ========== user_sensitive, revenues, receipts, expenses, payrolls, store_files, store_contacts, user_files ==========
-- (add-financial-management-schema.sql에서 정의된 정책 수정)

DROP POLICY IF EXISTS "Only admins can access sensitive data" ON public.user_sensitive;
CREATE POLICY "Only admins can access sensitive data" ON public.user_sensitive FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('admin', 'business_owner', 'platform_admin')));

DROP POLICY IF EXISTS "Business owners can view their company revenues" ON public.revenues;
CREATE POLICY "Business owners can view their company revenues" ON public.revenues FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.stores s JOIN public.users u ON u.company_id = s.company_id
      WHERE s.id = revenues.store_id AND u.id = (select auth.uid()) AND u.role IN ('business_owner', 'platform_admin')
        AND s.deleted_at IS NULL AND (u.is_active = true OR u.is_active IS NULL))
    OR company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL))
  );

DROP POLICY IF EXISTS "Business owners can view their company receipts" ON public.receipts;
CREATE POLICY "Business owners can view their company receipts" ON public.receipts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));

DROP POLICY IF EXISTS "Business owners can view their company expenses" ON public.expenses;
CREATE POLICY "Business owners can view their company expenses" ON public.expenses FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));

DROP POLICY IF EXISTS "Business owners can view their company payrolls" ON public.payrolls;
CREATE POLICY "Business owners can view their company payrolls" ON public.payrolls FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));

DROP POLICY IF EXISTS "Business owners can view their company store files" ON public.store_files;
DROP POLICY IF EXISTS "Business owners can insert their company store files" ON public.store_files;
DROP POLICY IF EXISTS "Business owners can delete their company store files" ON public.store_files;
CREATE POLICY "Business owners can view their company store files" ON public.store_files FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));
CREATE POLICY "Business owners can insert their company store files" ON public.store_files FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));
CREATE POLICY "Business owners can delete their company store files" ON public.store_files FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));

DROP POLICY IF EXISTS "Business owners can view their company store contacts" ON public.store_contacts;
CREATE POLICY "Business owners can view their company store contacts" ON public.store_contacts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));

DROP POLICY IF EXISTS "Business owners can view their company user files" ON public.user_files;
CREATE POLICY "Business owners can view their company user files" ON public.user_files FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));
