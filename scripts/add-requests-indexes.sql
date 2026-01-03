-- requests 테이블 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_requests_store_id_created_at 
ON public.requests(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requests_status 
ON public.requests(status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requests_created_by 
ON public.requests(created_by) 
WHERE deleted_at IS NULL;

-- supply_requests 테이블 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_supply_requests_store_id_created_at 
ON public.supply_requests(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supply_requests_status 
ON public.supply_requests(status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supply_requests_user_id 
ON public.supply_requests(user_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supply_requests_completed_at 
ON public.supply_requests(completed_at) 
WHERE status = 'completed' AND deleted_at IS NULL;

-- stores 테이블 인덱스 (company_id 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_stores_company_id 
ON public.stores(company_id) 
WHERE deleted_at IS NULL;
