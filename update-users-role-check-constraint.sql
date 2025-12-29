-- users 테이블의 role CHECK 제약조건 업데이트
-- 기존 제약조건 삭제
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 새로운 제약조건 추가 (franchise_manager, store_manager 포함)
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('staff', 'manager', 'business_owner', 'platform_admin', 'admin', 'franchise_manager', 'store_manager'));










