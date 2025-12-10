-- 1. 먼저 user_role enum에 값이 제대로 추가되었는지 확인
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- 2. users 테이블의 CHECK 제약조건 확인
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND contype = 'c'
  AND conname LIKE '%role%';

-- 3. 기존 role CHECK 제약조건 삭제
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- 4. 새로운 role CHECK 제약조건 생성 (모든 역할 포함)
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('staff', 'manager', 'admin', 'business_owner', 'platform_admin'));

-- 5. 이제 admin을 platform_admin으로 변경
UPDATE public.users 
SET role = 'platform_admin' 
WHERE role = 'admin';

-- 6. 확인
SELECT 
    u.id, 
    u.role, 
    u.name,
    au.email
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.role = 'platform_admin';


