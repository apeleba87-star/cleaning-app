-- products 테이블 RLS 정책 완전 수정
-- 이 SQL을 실행하면 모든 정책이 올바르게 설정됩니다

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "직원은 제품 조회 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 생성 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 수정 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 삭제 가능" ON products;

-- 2. 직원은 제품 조회 가능
CREATE POLICY "직원은 제품 조회 가능" ON products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'staff'
    )
  );

-- 3. 관리자는 제품 생성 가능
CREATE POLICY "관리자는 제품 생성 가능" ON products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  );

-- 4. 관리자는 제품 수정 가능
CREATE POLICY "관리자는 제품 수정 가능" ON products
  FOR UPDATE
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

-- 5. 관리자는 제품 삭제 가능 (소프트 삭제를 위해 UPDATE 사용)
-- 실제로는 deleted_at을 업데이트하므로 UPDATE 정책으로 충분

