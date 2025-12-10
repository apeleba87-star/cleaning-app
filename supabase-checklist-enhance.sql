-- ============================================
-- Checklist 확장: 매장별 생성/배정, 전후 사진, 비고
-- ============================================

-- 1) checklist 테이블 컬럼 추가
ALTER TABLE public.checklist
    ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS before_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS after_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS note TEXT;

-- 2) 인덱스
CREATE INDEX IF NOT EXISTS idx_checklist_assigned_user_id ON public.checklist(assigned_user_id);

-- 3) RLS 정책 (business_owner / staff)
-- 기존 정책이 있다면 우선 삭제 후 재생성
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='checklist' AND policyname='Business owners manage company checklists') THEN
        EXECUTE 'DROP POLICY "Business owners manage company checklists" ON public.checklist';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='checklist' AND policyname='Staff manage assigned checklists') THEN
        EXECUTE 'DROP POLICY "Staff manage assigned checklists" ON public.checklist';
    END IF;
END$$;

-- business_owner: 자신의 회사 매장 체크리스트 생성/조회/수정 가능
CREATE POLICY "Business owners manage company checklists" ON public.checklist
    FOR ALL USING (
        public.is_business_owner(auth.uid()) AND
        store_id IN (
            SELECT id FROM public.stores WHERE company_id = public.get_user_company_id(auth.uid())
        )
    );

-- staff: 자신에게 배정된 체크리스트만 조회/수정 (완료 제출)
CREATE POLICY "Staff manage assigned checklists" ON public.checklist
    FOR ALL USING (
        public.is_staff(auth.uid()) AND
        assigned_user_id = auth.uid()
    );

-- 4) platform_admin 전역 허용 (안전망)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='checklist' AND policyname='Platform admin manage all checklists') THEN
        CREATE POLICY "Platform admin manage all checklists" ON public.checklist
            FOR ALL USING (public.is_platform_admin(auth.uid()));
    END IF;
END$$;

-- 5) 참고: staff 입력 시 review_status를 'pending'으로 유지
-- 애플리케이션 단에서 review_status 업데이트 로직을 통제하세요.




