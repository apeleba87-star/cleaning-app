-- users 테이블 필드 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS employment_contract_date DATE,
ADD COLUMN IF NOT EXISTS salary_date INTEGER, -- 1-31 (월 급여일)
ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS employment_active BOOLEAN DEFAULT true;

-- 기존 데이터에 기본값 설정
UPDATE public.users
SET employment_active = COALESCE(employment_active, true)
WHERE employment_active IS NULL;



