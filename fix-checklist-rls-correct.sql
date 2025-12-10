-- ============================================
-- 체크리스트 RLS 정책 올바르게 수정
-- 문제: 기존 정책이 store_assign.user_id를 확인하지 않음
-- ============================================

-- 기존 잘못된 staff 정책들 삭제
DROP POLICY IF EXISTS "Staff manage assigned checklists" ON public.checklist;
DROP POLICY IF EXISTS "Staff can manage own checklists" ON public.checklist;

-- 올바른 staff 정책 생성:
-- 1. assigned_user_id가 본인인 경우
-- 2. 또는 assigned_user_id가 null이면서 본인이 배정받은 매장의 체크리스트인 경우
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
                    WHERE user_id = auth.uid()  -- ⚠️ 이 조건이 필수!
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
  AND policyname LIKE '%Staff%'
ORDER BY policyname;


