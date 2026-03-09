-- 신규 공개 회원가입 시 무조건 업체관리자로 처리하려면,
-- auth.users INSERT 시 public.users에 자동으로 행을 넣는 트리거가 있으면 제거해야 합니다.
-- (트리거가 있으면 role=직원, company_id=null 행이 먼저 생겨 "직원 + 회사 없음"으로 남을 수 있음)
--
-- Supabase 대시보드 → SQL Editor에서 이 스크립트를 실행하세요.
-- 트리거 이름이 다르면 대시보드 → Database → Triggers에서 확인 후 해당 이름으로 DROP 하세요.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;

-- 연관 함수도 정리하려면 (함수 이름은 Supabase 프로젝트마다 다를 수 있음):
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- DROP FUNCTION IF EXISTS auth.handle_new_user() CASCADE;
