-- 사용자 확인 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. auth.users에서 사용자 확인
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'apeleba@naver.com';

-- 2. public.users에서 사용자 확인
SELECT id, email, role, name, created_at 
FROM public.users 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'apeleba@naver.com'
);

-- 3. 만약 public.users에 없다면 수동 추가
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = 'apeleba@naver.com';
    
    IF user_uuid IS NOT NULL THEN
        -- 기존 데이터 확인
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_uuid) THEN
            INSERT INTO public.users (id, role, name, phone)
            VALUES (user_uuid, 'admin', '최고운영자', NULL);
            RAISE NOTICE 'User inserted with ID: %', user_uuid;
        ELSE
            UPDATE public.users 
            SET role = 'admin', 
                name = '최고운영자',
                updated_at = NOW() AT TIME ZONE 'utc'
            WHERE id = user_uuid;
            RAISE NOTICE 'User updated with ID: %', user_uuid;
        END IF;
    ELSE
        RAISE NOTICE 'User not found in auth.users';
    END IF;
END $$;



