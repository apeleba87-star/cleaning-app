-- ============================================
-- Supabase 마이그레이션: 청소 관리 앱
-- Postgres 15, UTC 타임스탬프
-- ============================================

-- 1. 타입 및 Enum 생성
-- ============================================

CREATE TYPE user_role AS ENUM ('staff', 'manager', 'admin');
CREATE TYPE cleaning_photo_kind AS ENUM ('before', 'after');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'reshoot_requested');
CREATE TYPE checklist_item_status AS ENUM ('good', 'bad');
CREATE TYPE issue_status AS ENUM ('submitted', 'in_progress', 'completed', 'rejected');
CREATE TYPE supply_request_status AS ENUM ('requested', 'received', 'completed', 'rejected');
CREATE TYPE request_category_type AS ENUM ('issue', 'supply');

-- 2. 테이블 DDL
-- ============================================

-- users 테이블 (auth.users 확장)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'staff',
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CHECK (role IN ('staff', 'manager', 'admin'))
);

-- stores 테이블
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    deleted_at TIMESTAMPTZ
);

-- store_assign 테이블 (매니저-매장 배정)
CREATE TABLE IF NOT EXISTS public.store_assign (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    UNIQUE(user_id, store_id)
);

-- attendance 테이블 (GPS 출퇴근)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    work_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'utc')::DATE),
    clock_in_at TIMESTAMPTZ NOT NULL,
    clock_in_latitude DECIMAL(10, 8),
    clock_in_longitude DECIMAL(11, 8),
    clock_out_at TIMESTAMPTZ,
    clock_out_latitude DECIMAL(10, 8),
    clock_out_longitude DECIMAL(11, 8),
    selfie_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    UNIQUE(user_id, work_date)
);

-- cleaning_photos 테이블
CREATE TABLE IF NOT EXISTS public.cleaning_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT,
    checklist_id UUID,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    area_category TEXT NOT NULL,
    kind cleaning_photo_kind NOT NULL,
    photo_url TEXT NOT NULL,
    review_status review_status NOT NULL DEFAULT 'pending',
    manager_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- checklist 테이블
CREATE TABLE IF NOT EXISTS public.checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'utc')::DATE),
    items JSONB NOT NULL,
    review_status review_status NOT NULL DEFAULT 'pending',
    manager_comment TEXT,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- issues 테이블
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    status issue_status NOT NULL DEFAULT 'submitted',
    photo_url TEXT,
    manager_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- supply_requests 테이블
CREATE TABLE IF NOT EXISTS public.supply_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID,
    item_name TEXT NOT NULL,
    quantity INTEGER,
    status supply_request_status NOT NULL DEFAULT 'requested',
    photo_url TEXT,
    manager_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- request_categories 테이블 (매장별 카테고리)
CREATE TABLE IF NOT EXISTS public.request_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type request_category_type NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    deleted_at TIMESTAMPTZ
);

-- issues와 supply_requests의 category_id 외래키 추가
ALTER TABLE public.issues 
ADD CONSTRAINT fk_issues_category 
FOREIGN KEY (category_id) REFERENCES public.request_categories(id) ON DELETE SET NULL;

ALTER TABLE public.supply_requests 
ADD CONSTRAINT fk_supply_requests_category 
FOREIGN KEY (category_id) REFERENCES public.request_categories(id) ON DELETE SET NULL;

-- 3. 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_store_assign_user_id ON public.store_assign(user_id);
CREATE INDEX IF NOT EXISTS idx_store_assign_store_id ON public.store_assign(store_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_store_id ON public.attendance(store_id);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON public.attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_store_id ON public.cleaning_photos(store_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_user_id ON public.cleaning_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_review_status ON public.cleaning_photos(review_status);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_kind ON public.cleaning_photos(kind);
CREATE INDEX IF NOT EXISTS idx_checklist_store_id ON public.checklist(store_id);
CREATE INDEX IF NOT EXISTS idx_checklist_user_id ON public.checklist(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_work_date ON public.checklist(work_date);
CREATE INDEX IF NOT EXISTS idx_checklist_review_status ON public.checklist(review_status);
CREATE INDEX IF NOT EXISTS idx_issues_store_id ON public.issues(store_id);
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON public.issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category_id ON public.issues(category_id);
CREATE INDEX IF NOT EXISTS idx_supply_requests_store_id ON public.supply_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_supply_requests_user_id ON public.supply_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_supply_requests_status ON public.supply_requests(status);
CREATE INDEX IF NOT EXISTS idx_supply_requests_category_id ON public.supply_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_request_categories_store_id ON public.request_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_request_categories_type ON public.request_categories(type);

-- 4. updated_at 자동 업데이트 함수 및 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW() AT TIME ZONE 'utc';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cleaning_photos_updated_at BEFORE UPDATE ON public.cleaning_photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_updated_at BEFORE UPDATE ON public.checklist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supply_requests_updated_at BEFORE UPDATE ON public.supply_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_request_categories_updated_at BEFORE UPDATE ON public.request_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Helper 함수 생성
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = uid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = uid AND role = 'manager'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = uid AND role = 'staff'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_assigned(uid UUID, sid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.store_assign
        WHERE user_id = uid AND store_id = sid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS 활성화
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_assign ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_categories ENABLE ROW LEVEL SECURITY;

-- 7. RLS 정책 생성
-- ============================================

-- users 테이블
CREATE POLICY "Admin can manage all users" ON public.users
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can view all users" ON public.users
    FOR SELECT USING (public.is_manager(auth.uid()));

-- stores 테이블
CREATE POLICY "Admin can manage all stores" ON public.stores
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Managers can view assigned stores" ON public.stores
    FOR SELECT USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), id)
    );

-- store_assign 테이블
CREATE POLICY "Admin can manage all assignments" ON public.store_assign
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Managers can view own assignments" ON public.store_assign
    FOR SELECT USING (user_id = auth.uid());

-- attendance 테이블
CREATE POLICY "Admin can manage all attendance" ON public.attendance
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can manage own attendance" ON public.attendance
    FOR ALL USING (
        public.is_staff(auth.uid()) AND
        user_id = auth.uid()
    );

CREATE POLICY "Managers can view assigned store attendance" ON public.attendance
    FOR SELECT USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    );

-- cleaning_photos 테이블
CREATE POLICY "Admin can manage all cleaning photos" ON public.cleaning_photos
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can manage own cleaning photos" ON public.cleaning_photos
    FOR ALL USING (
        public.is_staff(auth.uid()) AND
        user_id = auth.uid()
    );

CREATE POLICY "Managers can view assigned store cleaning photos" ON public.cleaning_photos
    FOR SELECT USING (
        public.is_manager(auth.uid()) AND
        (store_id IS NULL OR public.is_assigned(auth.uid(), store_id))
    );

CREATE POLICY "Managers can review cleaning photos" ON public.cleaning_photos
    FOR UPDATE USING (
        public.is_manager(auth.uid()) AND
        (store_id IS NULL OR public.is_assigned(auth.uid(), store_id))
    )
    WITH CHECK (
        public.is_manager(auth.uid()) AND
        (store_id IS NULL OR public.is_assigned(auth.uid(), store_id))
    );

-- checklist 테이블
CREATE POLICY "Admin can manage all checklists" ON public.checklist
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can manage own checklists" ON public.checklist
    FOR ALL USING (
        public.is_staff(auth.uid()) AND
        user_id = auth.uid()
    );

CREATE POLICY "Managers can view assigned store checklists" ON public.checklist
    FOR SELECT USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    );

CREATE POLICY "Managers can review checklists" ON public.checklist
    FOR UPDATE USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    )
    WITH CHECK (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    );

-- issues 테이블
CREATE POLICY "Admin can manage all issues" ON public.issues
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view in_progress or completed issues" ON public.issues
    FOR SELECT USING (
        public.is_staff(auth.uid()) AND
        status IN ('in_progress', 'completed')
    );

CREATE POLICY "Staff can create own issues" ON public.issues
    FOR INSERT WITH CHECK (
        public.is_staff(auth.uid()) AND
        user_id = auth.uid()
    );

CREATE POLICY "Staff can update own issues" ON public.issues
    FOR UPDATE USING (
        public.is_staff(auth.uid()) AND
        user_id = auth.uid()
    );

CREATE POLICY "Managers can view assigned store issues" ON public.issues
    FOR SELECT USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    );

CREATE POLICY "Managers can comment on issues" ON public.issues
    FOR UPDATE USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    )
    WITH CHECK (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    );

-- supply_requests 테이블
CREATE POLICY "Admin can manage all supply requests" ON public.supply_requests
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can create own supply requests" ON public.supply_requests
    FOR INSERT WITH CHECK (
        public.is_staff(auth.uid()) AND
        user_id = auth.uid()
    );

CREATE POLICY "Staff can view received/completed/rejected requests" ON public.supply_requests
    FOR SELECT USING (
        public.is_staff(auth.uid()) AND
        (user_id = auth.uid() OR status IN ('received', 'completed', 'rejected'))
    );

CREATE POLICY "Staff can update received to completed" ON public.supply_requests
    FOR UPDATE USING (
        public.is_staff(auth.uid()) AND
        status = 'received' AND
        (user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
    WITH CHECK (
        public.is_staff(auth.uid()) AND
        status IN ('received', 'completed') AND
        (user_id = auth.uid() OR public.is_admin(auth.uid()))
    );

CREATE POLICY "Managers can view assigned store supply requests" ON public.supply_requests
    FOR SELECT USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    );

CREATE POLICY "Managers can update requested to received" ON public.supply_requests
    FOR UPDATE USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id) AND
        status = 'requested'
    )
    WITH CHECK (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id) AND
        status = 'received'
    );

-- request_categories 테이블
CREATE POLICY "Admin can manage all categories" ON public.request_categories
    FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Managers can view assigned store categories" ON public.request_categories
    FOR SELECT USING (
        public.is_manager(auth.uid()) AND
        public.is_assigned(auth.uid(), store_id)
    );

CREATE POLICY "Staff can view categories for accessible stores" ON public.request_categories
    FOR SELECT USING (
        public.is_staff(auth.uid())
    );

-- 8. 스토리지 버킷 생성 및 정책
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('cleaning-photos', 'cleaning-photos', false),
    ('issue-photos', 'issue-photos', false),
    ('supply-photos', 'supply-photos', false),
    ('selfies', 'selfies', false)
ON CONFLICT (id) DO NOTHING;

-- cleaning-photos 버킷 정책
CREATE POLICY "Users can upload own cleaning photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'cleaning-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own cleaning photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'cleaning-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own cleaning photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'cleaning-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own cleaning photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'cleaning-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Managers can read assigned store cleaning photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'cleaning-photos' AND
        (
            public.is_manager(auth.uid()) OR
            public.is_admin(auth.uid())
        )
    );

-- issue-photos 버킷 정책
CREATE POLICY "Users can upload own issue photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'issue-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own issue photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'issue-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own issue photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'issue-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own issue photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'issue-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Managers can read assigned store issue photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'issue-photos' AND
        (
            public.is_manager(auth.uid()) OR
            public.is_admin(auth.uid())
        )
    );

-- supply-photos 버킷 정책
CREATE POLICY "Users can upload own supply photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'supply-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own supply photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'supply-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own supply photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'supply-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own supply photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'supply-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Managers can read assigned store supply photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'supply-photos' AND
        (
            public.is_manager(auth.uid()) OR
            public.is_admin(auth.uid())
        )
    );

-- selfies 버킷 정책
CREATE POLICY "Users can upload own selfies" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'selfies' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own selfies" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'selfies' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own selfies" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'selfies' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own selfies" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'selfies' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Managers can read assigned store selfies" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'selfies' AND
        (
            public.is_manager(auth.uid()) OR
            public.is_admin(auth.uid())
        )
    );



