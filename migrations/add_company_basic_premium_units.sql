-- companies 테이블에 베이직/프리미엄 결제 수(단위) 추가
-- 시스템 관리자가 수동으로 설정하며, 매장 수·직원 수·점주/현장관리자 수 한도에 사용

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS basic_units integer NOT NULL DEFAULT 0;

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS premium_units integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.companies.basic_units IS '베이직 결제 수: 매장 생성 상한 및 직원(도급 포함) 계정 상한';
COMMENT ON COLUMN public.companies.premium_units IS '프리미엄 결제 수: 점주/현장관리자 계정 상한, 1 이상이면 프리미엄 기능 오픈';
