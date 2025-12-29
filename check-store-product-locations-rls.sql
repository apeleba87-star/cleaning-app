-- store_product_locations 테이블의 RLS 정책 확인

-- 현재 정책 확인
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'store_product_locations';

-- RLS가 활성화되어 있는지 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'store_product_locations';




