-- franchise_manager가 stores, store_assign을 조회할 수 있도록 RLS 정책 추가
-- 프렌차이즈 매장 상태 API(/api/franchise/stores/status)에서 매장 목록 및 배정 직원 확인 시 사용

-- ========== stores: franchise_manager 자신의 프렌차이즈 매장 조회 ==========
DROP POLICY IF EXISTS "Franchise managers can view stores in their franchise" ON public.stores;
CREATE POLICY "Franchise managers can view stores in their franchise" ON public.stores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (select auth.uid())
        AND u.role = 'franchise_manager'
        AND u.franchise_id IS NOT NULL
        AND stores.franchise_id = u.franchise_id
    )
    AND stores.deleted_at IS NULL
  );

-- ========== store_assign: franchise_manager 자신의 프렌차이즈 매장 배정 조회 ==========
DROP POLICY IF EXISTS "Franchise managers can view store assignments for their franchise" ON public.store_assign;
CREATE POLICY "Franchise managers can view store assignments for their franchise" ON public.store_assign
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.stores s ON s.id = store_assign.store_id
      WHERE u.id = (select auth.uid())
        AND u.role = 'franchise_manager'
        AND u.franchise_id IS NOT NULL
        AND u.franchise_id = s.franchise_id
    )
  );
