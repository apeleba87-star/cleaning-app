-- 도급(개인/업체) 사용자가 자신이 배정된 매장을 조회할 수 있도록 RLS 정책 추가
-- 야간 매장 포함 모든 배정된 매장 조회 가능

-- store_assign 테이블에 대한 RLS 정책
-- 도급 사용자는 자신의 user_id로 조회 가능
DROP POLICY IF EXISTS "Subcontract users can view their own store assignments" ON public.store_assign;

CREATE POLICY "Subcontract users can view their own store assignments"
  ON public.store_assign
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('subcontract_individual', 'subcontract_company')
        AND u.id = store_assign.user_id
    )
  );

-- stores 테이블에 대한 RLS 정책
-- 도급 사용자는 자신이 배정된 매장만 조회 가능 (야간 매장 포함)
DROP POLICY IF EXISTS "Subcontract users can view their assigned stores" ON public.stores;

CREATE POLICY "Subcontract users can view their assigned stores"
  ON public.stores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role IN ('subcontract_individual', 'subcontract_company')
        AND sa.store_id = stores.id
    )
    AND deleted_at IS NULL
  );

-- attendance 테이블에 대한 RLS 정책
-- staff와 도급 사용자는 자신의 출근 기록을 생성/조회/수정 가능
DROP POLICY IF EXISTS "Staff and subcontract users can manage their own attendance" ON public.attendance;

CREATE POLICY "Staff and subcontract users can manage their own attendance"
  ON public.attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('staff', 'subcontract_individual', 'subcontract_company')
        AND u.id = attendance.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('staff', 'subcontract_individual', 'subcontract_company')
        AND u.id = attendance.user_id
    )
  );

COMMENT ON POLICY "Subcontract users can view their own store assignments" ON public.store_assign IS '도급(개인/업체) 사용자는 자신의 매장 배정 정보를 조회할 수 있습니다.';
COMMENT ON POLICY "Subcontract users can view their assigned stores" ON public.stores IS '도급(개인/업체) 사용자는 자신이 배정된 매장 정보를 조회할 수 있습니다. (야간 매장 포함)';
COMMENT ON POLICY "Staff and subcontract users can manage their own attendance" ON public.attendance IS '직원 및 도급(개인/업체) 사용자는 자신의 출근 기록을 생성, 조회, 수정할 수 있습니다.';
