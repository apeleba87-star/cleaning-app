-- ============================================
-- auth.users에 사용자가 생성될 때 자동으로 public.users에도 추가하는 트리거
-- ============================================

-- 함수 생성: 새 사용자 생성 시 public.users에 자동 추가
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, name, phone)
  VALUES (
    NEW.id,
    'staff', -- 기본 역할은 staff
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 기존 사용자들을 위한 수동 업데이트 (apeleba@naver.com)
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = 'apeleba@naver.com';
    
    IF user_uuid IS NOT NULL THEN
        INSERT INTO public.users (id, role, name, phone)
        VALUES (user_uuid, 'admin', '최고운영자', NULL)
        ON CONFLICT (id) 
        DO UPDATE SET 
            role = 'admin',
            name = '최고운영자',
            updated_at = NOW() AT TIME ZONE 'utc';
        
        RAISE NOTICE 'Admin user created/updated with ID: %', user_uuid;
    ELSE
        RAISE NOTICE 'User with email apeleba@naver.com not found in auth.users';
    END IF;
END $$;



