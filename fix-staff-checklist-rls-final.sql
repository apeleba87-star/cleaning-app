-- 직원이 배정된 체크리스트를 조회/수정할 수 있도록 RLS 정책 수정

-- 1. 기존 정책 확인
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'checklist'
ORDER BY policyname;

-- 2. 기존 staff 관련 정책 삭제
DROP POLICY IF EXISTS "Staff can manage own checklists" ON public.checklist;
DROP POLICY IF EXISTS "Staff manage assigned checklists" ON public.checklist;

-- 3. 직원이 템플릿 체크리스트를 조회할 수 있는 정책 (출근 시 자동 생성용)
DROP POLICY IF EXISTS "Staff can read template checklists" ON public.checklist;

CREATE POLICY "Staff can read template checklists" ON public.checklist
    FOR SELECT USING (
        public.is_staff(auth.uid()) AND
        assigned_user_id IS NULL AND
        work_date = '2000-01-01' AND
        store_id IN (
            SELECT store_id 
            FROM public.store_assign 
            WHERE user_id = auth.uid()
        )
    );

-- 4. 직원이 자신에게 배정된 체크리스트를 생성할 수 있는 정책 (출근 시)
DROP POLICY IF EXISTS "Staff can create assigned checklists" ON public.checklist;

CREATE POLICY "Staff can create assigned checklists" ON public.checklist
    FOR INSERT WITH CHECK (
        public.is_staff(auth.uid()) AND
        assigned_user_id = auth.uid() AND
        store_id IN (
            SELECT store_id 
            FROM public.store_assign 
            WHERE user_id = auth.uid()
        )
    );

-- 5. 직원이 자신에게 배정된 체크리스트를 조회/수정할 수 있는 정책
CREATE POLICY "Staff manage assigned checklists" ON public.checklist
    FOR ALL USING (
        public.is_staff(auth.uid()) AND
        assigned_user_id = auth.uid()
    )
    WITH CHECK (
        public.is_staff(auth.uid()) AND
        assigned_user_id = auth.uid()
    );

-- 6. 확인: 정책 목록
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'checklist'
ORDER BY policyname;


