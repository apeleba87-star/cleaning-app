-- O(1) 이메일 존재 여부 (auth.users). listUsers 다페이지 순회 제거용.
-- 서비스 롤(서버 API)에서만 호출 가능. anon/authenticated는 실행 권한 없음.

CREATE OR REPLACE FUNCTION public.auth_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.email IS NOT NULL
      AND lower(trim(u.email)) = lower(trim(p_email))
    LIMIT 1
  );
$$;

REVOKE ALL ON FUNCTION public.auth_email_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_email_exists(text) TO service_role;

COMMENT ON FUNCTION public.auth_email_exists(text) IS
  'Returns whether auth.users has a row for this email (case-insensitive). Callable only with service_role.';
