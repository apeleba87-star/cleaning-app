-- 물품 요청 테이블에 업체관리자 및 점주 RLS 정책 추가

-- 업체관리자가 자신의 회사 매장의 물품 요청을 볼 수 있도록 SELECT 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supply_requests' 
    AND policyname = 'Business owners can view supply requests for their company stores'
  ) THEN
    EXECUTE 'CREATE POLICY "Business owners can view supply requests for their company stores" ON supply_requests
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users u
        JOIN stores s ON s.id = supply_requests.store_id
        WHERE u.id = (select auth.uid())
        AND u.role = ''business_owner''
        AND u.company_id = s.company_id
        AND s.deleted_at IS NULL
      )
    )';
  END IF;
END $$;

-- 업체관리자가 물품 요청 상태를 업데이트할 수 있도록 UPDATE 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supply_requests' 
    AND policyname = 'Business owners can update supply requests for their company stores'
  ) THEN
    EXECUTE 'CREATE POLICY "Business owners can update supply requests for their company stores" ON supply_requests
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM users u
        JOIN stores s ON s.id = supply_requests.store_id
        WHERE u.id = (select auth.uid())
        AND u.role = ''business_owner''
        AND u.company_id = s.company_id
        AND s.deleted_at IS NULL
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users u
        JOIN stores s ON s.id = supply_requests.store_id
        WHERE u.id = (select auth.uid())
        AND u.role = ''business_owner''
        AND u.company_id = s.company_id
        AND s.deleted_at IS NULL
      )
    )';
  END IF;
END $$;

-- 점주가 자신의 매장 물품 요청을 볼 수 있도록 SELECT 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supply_requests' 
    AND policyname = 'Store managers can view supply requests for their stores'
  ) THEN
    EXECUTE 'CREATE POLICY "Store managers can view supply requests for their stores" ON supply_requests
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users u
        JOIN store_assign sa ON sa.user_id = u.id
        JOIN stores s ON s.id = sa.store_id
        WHERE u.id = (select auth.uid())
        AND u.role = ''store_manager''
        AND sa.store_id = supply_requests.store_id
        AND s.deleted_at IS NULL
      )
    )';
  END IF;
END $$;

-- 점주가 자신의 매장 물품 요청 상태를 업데이트할 수 있도록 UPDATE 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supply_requests' 
    AND policyname = 'Store managers can update supply requests for their stores'
  ) THEN
    EXECUTE 'CREATE POLICY "Store managers can update supply requests for their stores" ON supply_requests
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM users u
        JOIN store_assign sa ON sa.user_id = u.id
        JOIN stores s ON s.id = sa.store_id
        WHERE u.id = (select auth.uid())
        AND u.role = ''store_manager''
        AND sa.store_id = supply_requests.store_id
        AND s.deleted_at IS NULL
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users u
        JOIN store_assign sa ON sa.user_id = u.id
        JOIN stores s ON s.id = sa.store_id
        WHERE u.id = (select auth.uid())
        AND u.role = ''store_manager''
        AND sa.store_id = supply_requests.store_id
        AND s.deleted_at IS NULL
      )
    )';
  END IF;
END $$;

