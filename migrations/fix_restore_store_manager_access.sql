-- 매장 배정 복구: 마이그레이션 이후 점주/매장관리자 매장 배정 조회 불가 문제 해결
-- fix_auth_rls_initplan_dynamic.sql 실행 시 정책 DROP 후 CREATE 실패로 정책이 사라진 경우 복구

-- ========== store_assign: 매장관리자/직원/도급 사용자 자신의 배정 조회 ==========
DROP POLICY IF EXISTS "Store managers can view their own store assignments" ON public.store_assign;
DROP POLICY IF EXISTS "Managers can view own assignments" ON public.store_assign;
DROP POLICY IF EXISTS "Staff can view their own store assignments" ON public.store_assign;
DROP POLICY IF EXISTS "Staff can view own store assignments" ON public.store_assign;
DROP POLICY IF EXISTS "Subcontract users can view their own store assignments" ON public.store_assign;

CREATE POLICY "Store managers can view their own store assignments" ON public.store_assign
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND u.id = store_assign.user_id
    )
  );

CREATE POLICY "Staff can view their own store assignments" ON public.store_assign
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (select auth.uid())
        AND u.role = 'staff'
        AND u.id = store_assign.user_id
    )
  );

CREATE POLICY "Subcontract users can view their own store assignments" ON public.store_assign
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (select auth.uid())
        AND u.role IN ('subcontract_individual', 'subcontract_company')
        AND u.id = store_assign.user_id
    )
  );

-- ========== stores: 매장관리자/직원/도급 사용자 배정된 매장 조회 ==========
DROP POLICY IF EXISTS "Store managers can view their assigned stores" ON public.stores;
DROP POLICY IF EXISTS "Managers can view assigned stores" ON public.stores;
DROP POLICY IF EXISTS "Staff can view their assigned stores" ON public.stores;
DROP POLICY IF EXISTS "Staff can view assigned stores" ON public.stores;
DROP POLICY IF EXISTS "Subcontract users can view their assigned stores" ON public.stores;

CREATE POLICY "Store managers can view their assigned stores" ON public.stores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND sa.store_id = stores.id
    )
    OR stores.deleted_at IS NULL
  );

CREATE POLICY "Staff can view their assigned stores" ON public.stores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role = 'staff'
        AND sa.store_id = stores.id
    )
    AND stores.deleted_at IS NULL
  );

CREATE POLICY "Subcontract users can view their assigned stores" ON public.stores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('subcontract_individual', 'subcontract_company')
        AND sa.store_id = stores.id
    )
    AND stores.deleted_at IS NULL
  );

-- ========== 매장 상세 데이터: checklist, cleaning_photos, product_photos, problem_reports, lost_items, requests, attendance ==========
-- 매장관리자(store_manager)가 배정된 매장의 상세 데이터를 조회할 수 있도록 RLS 정책 복구/추가
-- detail-data API (/api/store-manager/stores/[id]/detail-data) 에서 사용

DROP POLICY IF EXISTS "Store managers can view problem reports for their assigned stores" ON public.problem_reports;
CREATE POLICY "Store managers can view problem reports for their assigned stores" ON public.problem_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND sa.store_id = problem_reports.store_id
    )
  );

DROP POLICY IF EXISTS "Store managers can view lost items for their assigned stores" ON public.lost_items;
CREATE POLICY "Store managers can view lost items for their assigned stores" ON public.lost_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND sa.store_id = lost_items.store_id
    )
  );

DROP POLICY IF EXISTS "Store managers can view requests for their assigned stores" ON public.requests;
CREATE POLICY "Store managers can view requests for their assigned stores" ON public.requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND sa.store_id = requests.store_id
    )
  );

DROP POLICY IF EXISTS "Store managers can view checklists for their assigned stores" ON public.checklist;
CREATE POLICY "Store managers can view checklists for their assigned stores" ON public.checklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND sa.store_id = checklist.store_id
    )
  );

DROP POLICY IF EXISTS "Store managers can view cleaning photos for their assigned stores" ON public.cleaning_photos;
CREATE POLICY "Store managers can view cleaning photos for their assigned stores" ON public.cleaning_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND sa.store_id = cleaning_photos.store_id
    )
  );

DROP POLICY IF EXISTS "Store managers can view attendance for their assigned stores" ON public.attendance;
CREATE POLICY "Store managers can view attendance for their assigned stores" ON public.attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND sa.store_id = attendance.store_id
    )
  );

DROP POLICY IF EXISTS "Store managers can view product photos for their assigned stores" ON public.product_photos;
CREATE POLICY "Store managers can view product photos for their assigned stores" ON public.product_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = (select auth.uid())
        AND u.role IN ('store_manager', 'manager')
        AND sa.store_id = product_photos.store_id
    )
  );
