-- product_photos: 업체(business_owner)가 자기 회사 매장의 제품 입고/보관 사진 조회 가능하도록 RLS 정책 보강
-- 업체 관리자 앱 매장 현황에서 제품 입고 및 보관 상태가 '없음'으로 나오는 RLS 원인 대응

DROP POLICY IF EXISTS "Business owners can view photos from their company stores" ON public.product_photos;

CREATE POLICY "Business owners can view photos from their company stores" ON public.product_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = product_photos.store_id
        AND (s.deleted_at IS NULL)
        AND s.company_id = (
          SELECT u.company_id FROM public.users u
          WHERE u.id = (select auth.uid())
            AND u.role = 'business_owner'
          LIMIT 1
        )
    )
  );
