-- problem_reports 테이블의 RLS 정책 확인
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
WHERE tablename = 'problem_reports';

-- UPDATE 정책이 없으면 아래 정책 생성 (함수 사용 버전)
-- 먼저 is_business_owner와 get_user_company_id 함수가 존재하는지 확인 필요
CREATE POLICY IF NOT EXISTS "business_owner_can_update_problem_reports"
ON problem_reports
FOR UPDATE
USING (
  is_business_owner(auth.uid()) 
  AND store_id IN (
    SELECT stores.id 
    FROM stores 
    WHERE stores.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_business_owner(auth.uid()) 
  AND store_id IN (
    SELECT stores.id 
    FROM stores 
    WHERE stores.company_id = get_user_company_id(auth.uid())
  )
);

