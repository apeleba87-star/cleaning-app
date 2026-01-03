-- 매장 관리 현황 페이지 최적화를 위한 인덱스 추가

-- attendance 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_attendance_store_work_date 
ON public.attendance(store_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_store_clock_in 
ON public.attendance(store_id, clock_in_at DESC) 
WHERE clock_in_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_user_work_date 
ON public.attendance(user_id, work_date DESC);

-- checklist 테이블 인덱스 (deleted_at 컬럼이 없을 수 있으므로 조건 제거)
CREATE INDEX IF NOT EXISTS idx_checklist_store_work_date 
ON public.checklist(store_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_assigned_user 
ON public.checklist(assigned_user_id) 
WHERE assigned_user_id IS NOT NULL;

-- problem_reports 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_problem_reports_store_created_at 
ON public.problem_reports(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_problem_reports_status 
ON public.problem_reports(status);

-- lost_items 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_lost_items_store_created_at 
ON public.lost_items(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lost_items_status 
ON public.lost_items(status);

-- requests 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_requests_store_status_created_at 
ON public.requests(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_store_created_at 
ON public.requests(store_id, created_at DESC);

-- supply_requests 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_supply_requests_store_status 
ON public.supply_requests(store_id, status);

-- cleaning_photos 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_store_created_at 
ON public.cleaning_photos(store_id, created_at DESC) 
WHERE area_category != 'inventory';

-- product_photos 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_product_photos_store_type_created_at 
ON public.product_photos(store_id, type, created_at DESC);

-- store_assign 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_store_assign_store_id 
ON public.store_assign(store_id);

CREATE INDEX IF NOT EXISTS idx_store_assign_user_id 
ON public.store_assign(user_id);

-- stores 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_stores_company_id 
ON public.stores(company_id) 
WHERE deleted_at IS NULL;
