-- store_manager가 자신이 배정된 매장을 조회할 수 있도록 RLS 정책 추가

-- store_assign 테이블에 대한 RLS 정책
-- store_manager는 자신의 user_id로 조회 가능
DROP POLICY IF EXISTS "Store managers can view their own store assignments" ON public.store_assign;

CREATE POLICY "Store managers can view their own store assignments"
  ON public.store_assign
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND u.id = store_assign.user_id
    )
  );

-- stores 테이블에 대한 RLS 정책
-- store_manager는 자신이 배정된 매장만 조회 가능
DROP POLICY IF EXISTS "Store managers can view their assigned stores" ON public.stores;

CREATE POLICY "Store managers can view their assigned stores"
  ON public.stores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND sa.store_id = stores.id
    )
    OR deleted_at IS NULL
  );

-- problem_reports 테이블에 대한 RLS 정책
-- store_manager는 자신이 배정된 매장의 문제보고만 조회 가능
DROP POLICY IF EXISTS "Store managers can view problem reports for their assigned stores" ON public.problem_reports;

CREATE POLICY "Store managers can view problem reports for their assigned stores"
  ON public.problem_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND sa.store_id = problem_reports.store_id
    )
  );

-- lost_items 테이블에 대한 RLS 정책
-- store_manager는 자신이 배정된 매장의 분실물만 조회 가능
DROP POLICY IF EXISTS "Store managers can view lost items for their assigned stores" ON public.lost_items;

CREATE POLICY "Store managers can view lost items for their assigned stores"
  ON public.lost_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND sa.store_id = lost_items.store_id
    )
  );

-- requests 테이블에 대한 RLS 정책
-- store_manager는 자신이 배정된 매장의 요청만 조회 가능
DROP POLICY IF EXISTS "Store managers can view requests for their assigned stores" ON public.requests;

CREATE POLICY "Store managers can view requests for their assigned stores"
  ON public.requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND sa.store_id = requests.store_id
    )
  );

-- checklist 테이블에 대한 RLS 정책
-- store_manager는 자신이 배정된 매장의 체크리스트만 조회 가능
DROP POLICY IF EXISTS "Store managers can view checklists for their assigned stores" ON public.checklist;

CREATE POLICY "Store managers can view checklists for their assigned stores"
  ON public.checklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND sa.store_id = checklist.store_id
    )
  );

-- cleaning_photos 테이블에 대한 RLS 정책
-- store_manager는 자신이 배정된 매장의 사진만 조회 가능
DROP POLICY IF EXISTS "Store managers can view cleaning photos for their assigned stores" ON public.cleaning_photos;

CREATE POLICY "Store managers can view cleaning photos for their assigned stores"
  ON public.cleaning_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND sa.store_id = cleaning_photos.store_id
    )
  );

-- attendance 테이블에 대한 RLS 정책
-- store_manager는 자신이 배정된 매장의 출근 기록만 조회 가능
DROP POLICY IF EXISTS "Store managers can view attendance for their assigned stores" ON public.attendance;

CREATE POLICY "Store managers can view attendance for their assigned stores"
  ON public.attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND sa.store_id = attendance.store_id
    )
  );

-- product_photos 테이블에 대한 RLS 정책
-- store_manager는 자신이 배정된 매장의 제품 사진만 조회 가능
DROP POLICY IF EXISTS "Store managers can view product photos for their assigned stores" ON public.product_photos;

CREATE POLICY "Store managers can view product photos for their assigned stores"
  ON public.product_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.store_assign sa ON sa.user_id = u.id
      WHERE u.id = auth.uid()
        AND u.role = 'store_manager'
        AND sa.store_id = product_photos.store_id
    )
  );

COMMENT ON POLICY "Store managers can view their own store assignments" ON public.store_assign IS '매장관리자는 자신의 매장 배정 정보를 조회할 수 있습니다.';
COMMENT ON POLICY "Store managers can view their assigned stores" ON public.stores IS '매장관리자는 자신이 배정된 매장 정보를 조회할 수 있습니다.';
COMMENT ON POLICY "Store managers can view product photos for their assigned stores" ON public.product_photos IS '매장관리자는 자신이 배정된 매장의 제품 사진을 조회할 수 있습니다.';

