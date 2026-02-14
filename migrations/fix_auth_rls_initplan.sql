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

-- ========== revenues INSERT/UPDATE/DELETE (add-new-revenue-fields.sql) ==========
DROP POLICY IF EXISTS "Business owners can insert their company revenues" ON public.revenues;
DROP POLICY IF EXISTS "Business owners can update their company revenues" ON public.revenues;
DROP POLICY IF EXISTS "Business owners can delete their company revenues" ON public.revenues;

CREATE POLICY "Business owners can insert their company revenues" ON public.revenues FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL))
    AND (
      (store_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = revenues.store_id AND s.company_id = revenues.company_id AND s.deleted_at IS NULL))
      OR (store_id IS NULL AND revenue_name IS NOT NULL)
    )
  );

CREATE POLICY "Business owners can update their company revenues" ON public.revenues FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)))
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));

CREATE POLICY "Business owners can delete their company revenues" ON public.revenues FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = (select auth.uid()) AND role IN ('business_owner', 'platform_admin') AND (is_active = true OR is_active IS NULL)));

-- ========== store_assign, stores (store_manager, staff, subcontract) ==========
DROP POLICY IF EXISTS "Store managers can view their own store assignments" ON public.store_assign;
DROP POLICY IF EXISTS "Subcontract users can view their own store assignments" ON public.store_assign;
DROP POLICY IF EXISTS "Staff can view their own store assignments" ON public.store_assign;

CREATE POLICY "Store managers can view their own store assignments" ON public.store_assign FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND u.id = store_assign.user_id));

CREATE POLICY "Subcontract users can view their own store assignments" ON public.store_assign FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.role IN ('subcontract_individual', 'subcontract_company') AND u.id = store_assign.user_id));

CREATE POLICY "Staff can view their own store assignments" ON public.store_assign FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.role = 'staff' AND u.id = store_assign.user_id));

DROP POLICY IF EXISTS "Store managers can view their assigned stores" ON public.stores;
DROP POLICY IF EXISTS "Subcontract users can view their assigned stores" ON public.stores;
DROP POLICY IF EXISTS "Staff can view their assigned stores" ON public.stores;

CREATE POLICY "Store managers can view their assigned stores" ON public.stores FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = stores.id)
    OR deleted_at IS NULL
  );

CREATE POLICY "Subcontract users can view their assigned stores" ON public.stores FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid()) AND u.role IN ('subcontract_individual', 'subcontract_company') AND sa.store_id = stores.id)
    AND deleted_at IS NULL
  );

CREATE POLICY "Staff can view their assigned stores" ON public.stores FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid()) AND u.role = 'staff' AND sa.store_id = stores.id)
    AND deleted_at IS NULL
  );

-- ========== problem_reports, lost_items, requests, checklist, cleaning_photos, attendance, product_photos ==========
DROP POLICY IF EXISTS "Store managers can view problem reports for their assigned stores" ON public.problem_reports;
CREATE POLICY "Store managers can view problem reports for their assigned stores" ON public.problem_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = problem_reports.store_id));

DROP POLICY IF EXISTS "Store managers can view lost items for their assigned stores" ON public.lost_items;
CREATE POLICY "Store managers can view lost items for their assigned stores" ON public.lost_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = lost_items.store_id));

DROP POLICY IF EXISTS "Store managers can view requests for their assigned stores" ON public.requests;
CREATE POLICY "Store managers can view requests for their assigned stores" ON public.requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = requests.store_id));

DROP POLICY IF EXISTS "Store managers can view checklists for their assigned stores" ON public.checklist;
CREATE POLICY "Store managers can view checklists for their assigned stores" ON public.checklist FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = checklist.store_id));

DROP POLICY IF EXISTS "Store managers can view cleaning photos for their assigned stores" ON public.cleaning_photos;
CREATE POLICY "Store managers can view cleaning photos for their assigned stores" ON public.cleaning_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = cleaning_photos.store_id));

DROP POLICY IF EXISTS "Store managers can view attendance for their assigned stores" ON public.attendance;
DROP POLICY IF EXISTS "Staff and subcontract users can manage their own attendance" ON public.attendance;

CREATE POLICY "Store managers can view attendance for their assigned stores" ON public.attendance FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = attendance.store_id));

CREATE POLICY "Staff and subcontract users can manage their own attendance" ON public.attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.role IN ('staff', 'subcontract_individual', 'subcontract_company') AND u.id = attendance.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.role IN ('staff', 'subcontract_individual', 'subcontract_company') AND u.id = attendance.user_id));

DROP POLICY IF EXISTS "Store managers can view product photos for their assigned stores" ON public.product_photos;
DROP POLICY IF EXISTS "Staff can view their own product photos" ON public.product_photos;
DROP POLICY IF EXISTS "Staff can insert their own product photos" ON public.product_photos;
DROP POLICY IF EXISTS "Business owners can view photos from their company stores" ON public.product_photos;

CREATE POLICY "Staff can view their own product photos" ON public.product_photos FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Staff can insert their own product photos" ON public.product_photos FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Business owners can view photos from their company stores" ON public.product_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.stores s JOIN public.users u ON u.company_id = s.company_id
    WHERE s.id = product_photos.store_id AND u.id = (select auth.uid()) AND u.role = 'business_owner'));
CREATE POLICY "Store managers can view product photos for their assigned stores" ON public.product_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u INNER JOIN public.store_assign sa ON sa.user_id = u.id
    WHERE u.id = (select auth.uid()) AND u.role = 'store_manager' AND sa.store_id = product_photos.store_id));

-- ========== products, store_product_locations, store_name_mappings ==========
DROP POLICY IF EXISTS "직원은 제품 조회 가능" ON public.products;
DROP POLICY IF EXISTS "관리자는 제품 관리 가능" ON public.products;
DROP POLICY IF EXISTS "관리자는 제품 생성 가능" ON public.products;
DROP POLICY IF EXISTS "관리자는 제품 수정 가능" ON public.products;
DROP POLICY IF EXISTS "관리자는 제품 삭제 가능" ON public.products;

CREATE POLICY "직원은 제품 조회 가능" ON public.products FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role = 'staff'));

CREATE POLICY "관리자는 제품 관리 가능" ON public.products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('business_owner', 'platform_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('business_owner', 'platform_admin', 'admin')));

DROP POLICY IF EXISTS "직원은 자신의 매장 제품 위치 조회 가능" ON public.store_product_locations;
DROP POLICY IF EXISTS "관리자는 위치 정보 관리 가능" ON public.store_product_locations;

CREATE POLICY "직원은 자신의 매장 제품 위치 조회 가능" ON public.store_product_locations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.store_assign WHERE store_assign.store_id = store_product_locations.store_id AND store_assign.user_id = (select auth.uid())));

CREATE POLICY "관리자는 위치 정보 관리 가능" ON public.store_product_locations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('business_owner', 'platform_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('business_owner', 'platform_admin', 'admin')));

DROP POLICY IF EXISTS "관리자는 매장명 매핑 조회 가능" ON public.store_name_mappings;
DROP POLICY IF EXISTS "관리자는 매장명 매핑 관리 가능" ON public.store_name_mappings;

CREATE POLICY "관리자는 매장명 매핑 조회 가능" ON public.store_name_mappings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('admin', 'business_owner', 'platform_admin')));

CREATE POLICY "관리자는 매장명 매핑 관리 가능" ON public.store_name_mappings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('admin', 'business_owner', 'platform_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('admin', 'business_owner', 'platform_admin')));

-- ========== announcements, announcement_reads ==========
DROP POLICY IF EXISTS "Business owners can view their company announcements" ON public.announcements;
DROP POLICY IF EXISTS "Business owners can create announcements for their company" ON public.announcements;
DROP POLICY IF EXISTS "Business owners can update their company announcements" ON public.announcements;
DROP POLICY IF EXISTS "Business owners can delete their company announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can view staff announcements from their company" ON public.announcements;
DROP POLICY IF EXISTS "Managers can view owner announcements from their company" ON public.announcements;

CREATE POLICY "Business owners can view their company announcements" ON public.announcements FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = announcements.company_id AND u.role = 'business_owner'));
CREATE POLICY "Business owners can create announcements for their company" ON public.announcements FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = announcements.company_id AND u.role = 'business_owner'));
CREATE POLICY "Business owners can update their company announcements" ON public.announcements FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = announcements.company_id AND u.role = 'business_owner'));
CREATE POLICY "Business owners can delete their company announcements" ON public.announcements FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = announcements.company_id AND u.role = 'business_owner'));
CREATE POLICY "Staff can view staff announcements from their company" ON public.announcements FOR SELECT
  USING (type = 'staff' AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = announcements.company_id AND u.role = 'staff'));
CREATE POLICY "Managers can view owner announcements from their company" ON public.announcements FOR SELECT
  USING (type = 'owner' AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = announcements.company_id AND u.role = 'manager'));

DROP POLICY IF EXISTS "Users can view their own announcement reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "Users can create their own announcement reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "Business owners can view all reads for their company announcements" ON public.announcement_reads;

CREATE POLICY "Users can view their own announcement reads" ON public.announcement_reads FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can create their own announcement reads" ON public.announcement_reads FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Business owners can view all reads for their company announcements" ON public.announcement_reads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.announcements a JOIN public.users u ON u.company_id = a.company_id
    WHERE a.id = announcement_reads.announcement_id AND u.id = (select auth.uid()) AND u.role = 'business_owner'));

-- ========== franchises, category_templates ==========
DROP POLICY IF EXISTS "Business owners can view their company franchises" ON public.franchises;
DROP POLICY IF EXISTS "Business owners can create franchises for their company" ON public.franchises;
DROP POLICY IF EXISTS "Business owners can update their company franchises" ON public.franchises;
DROP POLICY IF EXISTS "Business owners can delete their company franchises" ON public.franchises;
DROP POLICY IF EXISTS "Franchise managers can view their own franchise" ON public.franchises;

CREATE POLICY "Business owners can view their company franchises" ON public.franchises FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = franchises.company_id AND u.role IN ('business_owner', 'platform_admin')) OR deleted_at IS NULL);
CREATE POLICY "Business owners can create franchises for their company" ON public.franchises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = franchises.company_id AND u.role IN ('business_owner', 'platform_admin')));
CREATE POLICY "Business owners can update their company franchises" ON public.franchises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = franchises.company_id AND u.role IN ('business_owner', 'platform_admin')));
CREATE POLICY "Business owners can delete their company franchises" ON public.franchises FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = franchises.company_id AND u.role IN ('business_owner', 'platform_admin')));
CREATE POLICY "Franchise managers can view their own franchise" ON public.franchises FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.franchise_id = franchises.id AND u.role = 'franchise_manager') OR deleted_at IS NULL);

DROP POLICY IF EXISTS "Business owners can view their company category templates" ON public.category_templates;
DROP POLICY IF EXISTS "Business owners can create category templates for their company" ON public.category_templates;
DROP POLICY IF EXISTS "Business owners can update their company category templates" ON public.category_templates;
DROP POLICY IF EXISTS "Business owners can delete their company category templates" ON public.category_templates;

CREATE POLICY "Business owners can view their company category templates" ON public.category_templates FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = category_templates.company_id AND u.role IN ('business_owner', 'platform_admin')) OR deleted_at IS NULL);
CREATE POLICY "Business owners can create category templates for their company" ON public.category_templates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = category_templates.company_id AND u.role IN ('business_owner', 'platform_admin')));
CREATE POLICY "Business owners can update their company category templates" ON public.category_templates FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = category_templates.company_id AND u.role IN ('business_owner', 'platform_admin')));
CREATE POLICY "Business owners can delete their company category templates" ON public.category_templates FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.company_id = category_templates.company_id AND u.role IN ('business_owner', 'platform_admin')));

-- ========== unmanaged_stores_summary, user_sessions ==========
DROP POLICY IF EXISTS "Allow business owners to read their company data" ON public.unmanaged_stores_summary;
CREATE POLICY "Allow business owners to read their company data" ON public.unmanaged_stores_summary FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.company_id = unmanaged_stores_summary.company_id AND users.role = 'business_owner'));

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;

CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert their own sessions" ON public.user_sessions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own sessions" ON public.user_sessions FOR UPDATE
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== landing_page_settings, hero_images, custom_pages, feature_introductions, case_studies ==========
-- (테이블이 있을 때만 정책 적용 - 랜딩 페이지 스키마 미적용 DB 대응)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'landing_page_settings') THEN
    DROP POLICY IF EXISTS "Admins can update landing page settings" ON public.landing_page_settings;
    CREATE POLICY "Admins can update landing page settings" ON public.landing_page_settings FOR ALL
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('admin', 'platform_admin')));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hero_images') THEN
    DROP POLICY IF EXISTS "Admins can manage hero images" ON public.hero_images;
    CREATE POLICY "Admins can manage hero images" ON public.hero_images FOR ALL
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('admin', 'platform_admin')));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_pages') THEN
    DROP POLICY IF EXISTS "Admins can manage custom pages" ON public.custom_pages;
    CREATE POLICY "Admins can manage custom pages" ON public.custom_pages FOR ALL
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.role IN ('admin', 'platform_admin')));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_introductions') THEN
    DROP POLICY IF EXISTS "Admins can manage features" ON public.feature_introductions;
    CREATE POLICY "Admins can manage features" ON public.feature_introductions FOR ALL
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role IN ('admin', 'platform_admin')));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_studies') THEN
    DROP POLICY IF EXISTS "Admins can manage case studies" ON public.case_studies;
    CREATE POLICY "Admins can manage case studies" ON public.case_studies FOR ALL
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role IN ('admin', 'platform_admin')));
  END IF;
END $$;
