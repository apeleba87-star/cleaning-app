-- 직원이 체크리스트 템플릿을 조회할 수 있도록 RLS 정책 추가
-- 출근 시 템플릿을 조회하여 오늘 날짜로 복사하기 위함

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

-- 2. 직원이 템플릿 체크리스트를 조회할 수 있는 정책 추가
-- 템플릿: assigned_user_id가 null이고 work_date가 '2000-01-01'인 것
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

-- 3. 직원이 자신에게 배정된 체크리스트를 생성할 수 있는 정책
-- (출근 시 템플릿을 복사하여 생성)
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

-- 4. 기존 "Staff manage assigned checklists" 정책 확인 및 수정
-- 조회/수정 모두 지원해야 함
DROP POLICY IF EXISTS "Staff manage assigned checklists" ON public.checklist;

CREATE POLICY "Staff manage assigned checklists" ON public.checklist
    FOR ALL USING (
        public.is_staff(auth.uid()) AND
        assigned_user_id = auth.uid()
    )
    WITH CHECK (
        public.is_staff(auth.uid()) AND
        assigned_user_id = auth.uid()
    );



