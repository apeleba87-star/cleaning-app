-- ============================================
-- 관리자 계정 생성 SQL
-- ============================================
-- 
-- 주의: 이 SQL은 Supabase 대시보드의 SQL Editor에서 실행해야 합니다.
-- 
-- 1. 먼저 Supabase 대시보드 → Authentication → Users에서
--    이메일: apeleba@naver.com
--    비밀번호: !!hsplyh0506
--    으로 사용자를 수동으로 생성하세요.
--
-- 2. 그 다음 아래 SQL을 실행하여 public.users 테이블에 역할 정보를 추가하세요.
-- ============================================

-- auth.users 테이블에서 사용자 ID 가져오기
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- auth.users에서 이메일로 사용자 ID 찾기
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = 'apeleba@naver.com';
    
    -- 사용자가 존재하면 public.users에 admin 역할로 추가/업데이트
    IF user_uuid IS NOT NULL THEN
        INSERT INTO public.users (id, role, name, phone)
        VALUES (user_uuid, 'admin', '최고운영자', NULL)
        ON CONFLICT (id) 
        DO UPDATE SET 
            role = 'admin',
            name = COALESCE(EXCLUDED.name, users.name),
            updated_at = NOW() AT TIME ZONE 'utc';
        
        RAISE NOTICE 'Admin user created/updated with ID: %', user_uuid;
    ELSE
        RAISE EXCEPTION 'User with email apeleba@naver.com not found. Please create the user in Authentication first.';
    END IF;
END $$;



