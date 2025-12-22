-- users 테이블에 business_registration_number 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS business_registration_number TEXT NULL;

-- 컬럼 추가 확인
COMMENT ON COLUMN public.users.business_registration_number IS '도급(업체) 역할인 경우 사업자등록번호';

