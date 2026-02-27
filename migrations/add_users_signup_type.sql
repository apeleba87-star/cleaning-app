-- 공개 회원가입 정책 변경:
-- - 업체관리자(owner) 셀프가입: owner_self_signup
-- - 관리자(업체/플랫폼)가 내부에서 만든 계정: admin_created

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS signup_type text;

UPDATE public.users
SET signup_type = 'admin_created'
WHERE signup_type IS NULL;

ALTER TABLE public.users
ALTER COLUMN signup_type SET DEFAULT 'admin_created';

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_signup_type_check;

ALTER TABLE public.users
ADD CONSTRAINT users_signup_type_check
CHECK (signup_type IN ('owner_self_signup', 'admin_created'));
