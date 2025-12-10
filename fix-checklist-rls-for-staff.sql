-- ============================================
-- 체크리스트 RLS 정책 수정: 매장 배정된 staff가 체크리스트 조회 가능하도록
-- ============================================

-- 기존 staff 정책 삭제
DROP POLICY IF EXISTS "Staff manage assigned checklists" ON public.checklist;

-- 새로운 staff 정책: 매장에 배정된 staff는 해당 매장의 체크리스트 조회/수정 가능
-- assigned_user_id가 본인이거나, 또는 assigned_user_id가 null이면서 본인이 배정받은 매장의 체크리스트인 경우
CREATE POLICY "Staff manage assigned checklists" ON public.checklist
    FOR ALL USING (
        public.is_staff(auth.uid()) AND (
            -- 직접 배정된 체크리스트
            assigned_user_id = auth.uid()
            OR
            -- 배정되지 않은 체크리스트이지만, 본인이 배정받은 매장의 체크리스트
            (
                assigned_user_id IS NULL
                AND store_id IN (
                    SELECT store_id 
                    FROM public.store_assign 
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

-- 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'checklist'
ORDER BY policyname;


