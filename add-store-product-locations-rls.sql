-- store_product_locations 테이블에 관리자용 INSERT 정책 추가

-- 기존 정책 확인
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'store_product_locations';

-- 관리자는 위치 정보 생성/수정/삭제 가능
DROP POLICY IF EXISTS "관리자는 위치 정보 관리 가능" ON store_product_locations;

CREATE POLICY "관리자는 위치 정보 관리 가능" ON store_product_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  );




