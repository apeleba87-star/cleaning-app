-- products 테이블에 관리자용 INSERT/UPDATE/DELETE 정책 추가

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "관리자는 제품 생성 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 수정 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 삭제 가능" ON products;

-- 관리자는 제품 생성 가능
CREATE POLICY "관리자는 제품 생성 가능" ON products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  );

-- 관리자는 제품 수정 가능
CREATE POLICY "관리자는 제품 수정 가능" ON products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  );

-- 관리자는 제품 삭제 가능 (소프트 삭제를 위해 UPDATE 사용)
CREATE POLICY "관리자는 제품 삭제 가능" ON products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  );





