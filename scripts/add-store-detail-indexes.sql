-- 매장 상세보기 페이지 최적화를 위한 인덱스 추가

-- checklist 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_checklist_store_work_date 
ON public.checklist(store_id, work_date DESC) 
WHERE deleted_at IS NULL;

-- product_photos 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_product_photos_store_created_at 
ON public.product_photos(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- problem_reports 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_problem_reports_store_created_at 
ON public.problem_reports(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- lost_items 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_lost_items_store_created_at 
ON public.lost_items(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- requests 테이블 인덱스 (이미 추가했을 수 있지만 중복 생성 방지)
CREATE INDEX IF NOT EXISTS idx_requests_store_created_at 
ON public.requests(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- cleaning_photos 테이블 인덱스 (관리전후 사진용)
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_store_created_at 
ON public.cleaning_photos(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cleaning_photos_area_category 
ON public.cleaning_photos(area_category) 
WHERE deleted_at IS NULL AND area_category != 'inventory';
