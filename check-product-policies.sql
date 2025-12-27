-- products 테이블의 현재 RLS 정책 확인

-- 모든 정책 조회
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;



