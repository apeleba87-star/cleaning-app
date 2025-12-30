-- products 테이블 RLS 정책 완전 정리 및 재생성
-- 모든 기존 정책을 삭제하고 깔끔하게 재생성

-- 1. 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Business owners can manage company products" ON products;
DROP POLICY IF EXISTS "Managers can manage products for assigned stores" ON products;
DROP POLICY IF EXISTS "Staff can create products for assigned stores" ON products;
DROP POLICY IF EXISTS "Staff can view products for assigned stores" ON products;
DROP POLICY IF EXISTS "직원은 제품 조회 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 생성 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 수정 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 삭제 가능" ON products;

-- 2. 직원은 제품 조회 가능 (SELECT)
CREATE POLICY "직원은 제품 조회 가능" ON products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'staff'
    )
  );

-- 3. 관리자는 모든 작업 가능 (INSERT, UPDATE, DELETE)
-- business_owner, platform_admin, admin 역할
CREATE POLICY "관리자는 제품 관리 가능" ON products
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





