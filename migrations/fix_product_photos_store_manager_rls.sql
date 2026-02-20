-- product_photos: 점주(store_manager, manager)가 배정된 매장의 제품 입고/보관 사진 조회 가능하도록 RLS 정책 수정
-- fix_auth_rls_initplan에서 store_manager만 허용되어 있어, manager 역할 점주가 조회 불가했음

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
