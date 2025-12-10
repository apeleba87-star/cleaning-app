-- 기존 admin 사용자를 platform_admin으로 변경
-- (선택사항: 모든 admin을 platform_admin으로 변경하려면 아래 주석을 해제하세요)

-- 특정 사용자만 변경하려면:
-- UPDATE public.users 
-- SET role = 'platform_admin' 
-- WHERE id = '사용자_ID' AND role = 'admin';

-- 모든 admin을 platform_admin으로 변경:
UPDATE public.users 
SET role = 'platform_admin' 
WHERE role = 'admin';

-- 확인용 쿼리
SELECT id, email, role, name 
FROM auth.users 
WHERE id IN (SELECT id FROM public.users WHERE role = 'platform_admin');



