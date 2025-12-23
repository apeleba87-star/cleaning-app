-- users 테이블의 role check constraint 수정
-- 기존 제약 조건 확인
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';

-- 기존 제약 조건 삭제
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 새로운 제약 조건 추가 (도급 역할 포함)
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN (
  'staff', 
  'manager', 
  'business_owner', 
  'platform_admin', 
  'admin', 
  'franchise_manager', 
  'store_manager',
  'subcontract_individual',
  'subcontract_company'
));



