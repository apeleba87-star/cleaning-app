-- ============================================
-- 체크리스트 템플릿 변환 및 RLS 정책 수정
-- ============================================

-- 1. 기존 체크리스트를 템플릿 형식으로 변환
-- 업체 관리자가 생성한 체크리스트를 템플릿(work_date='2000-01-01', assigned_user_id=NULL)으로 변환

UPDATE public.checklist
SET 
    work_date = '2000-01-01',
    assigned_user_id = NULL
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'business_owner'
)
AND (
    work_date != '2000-01-01' 
    OR assigned_user_id IS NOT NULL
);

-- 2. 직원이 템플릿 체크리스트를 조회할 수 있는 RLS 정책 추가
-- 템플릿 조회는 출근 시 체크리스트를 생성하기 위해 필요

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

-- 4. 기존 "Staff manage assigned checklists" 정책 확인 및 유지
-- (이미 존재하면 유지, 없으면 생성)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'checklist' 
        AND policyname = 'Staff manage assigned checklists'
    ) THEN
        CREATE POLICY "Staff manage assigned checklists" ON public.checklist
            FOR ALL USING (
                public.is_staff(auth.uid()) AND
                assigned_user_id = auth.uid()
            )
            WITH CHECK (
                public.is_staff(auth.uid()) AND
                assigned_user_id = auth.uid()
            );
    END IF;
END$$;

-- 5. 확인 쿼리
-- 템플릿 체크리스트 목록
SELECT 
    c.id,
    c.store_id,
    s.name as store_name,
    c.user_id,
    u.name as creator_name,
    c.work_date,
    c.assigned_user_id,
    c.created_at
FROM public.checklist c
LEFT JOIN public.stores s ON s.id = c.store_id
LEFT JOIN public.users u ON u.id = c.user_id
WHERE c.work_date = '2000-01-01'
  AND c.assigned_user_id IS NULL
ORDER BY c.created_at DESC;

-- 오늘 날짜의 직원 배정 체크리스트
SELECT 
    c.id,
    c.store_id,
    s.name as store_name,
    c.assigned_user_id,
    u.name as assigned_user_name,
    c.work_date,
    c.created_at
FROM public.checklist c
LEFT JOIN public.stores s ON s.id = c.store_id
LEFT JOIN public.users u ON u.id = c.assigned_user_id
WHERE c.work_date = CURRENT_DATE
  AND c.assigned_user_id IS NOT NULL
ORDER BY c.created_at DESC;


