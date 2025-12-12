-- business_owner가 problem_reports를 업데이트할 수 있도록 정책 추가
CREATE POLICY "business_owner_can_update_problem_reports"
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

