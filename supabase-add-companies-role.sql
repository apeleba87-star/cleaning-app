-- ============================================
-- 회사 및 역할 확장 마이그레이션
-- ============================================

-- 1. companies 테이블 생성
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    business_registration_number TEXT, -- 사업자등록번호
    subscription_plan TEXT DEFAULT 'free', -- free, basic, premium
    subscription_status TEXT DEFAULT 'active', -- active, suspended, cancelled
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    deleted_at TIMESTAMPTZ
);

-- 2. users 테이블에 company_id 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- 3. stores 테이블에 company_id 추가
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 4. role 타입 확장 (기존 enum에 'business_owner', 'platform_admin' 추가)
-- PostgreSQL에서는 ENUM에 값을 추가할 수 있으므로:
DO $$ 
BEGIN
    -- user_role enum에 새 값 추가 시도
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'business_owner' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'business_owner';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'platform_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'platform_admin';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- 이미 존재하거나 다른 오류는 무시
        NULL;
END $$;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON public.stores(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON public.companies(subscription_status);

-- 6. updated_at 트리거
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS 활성화
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 8. Helper 함수 추가
CREATE OR REPLACE FUNCTION public.is_platform_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = uid AND role = 'platform_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_business_owner(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = uid AND role = 'business_owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_company_id(uid UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT company_id FROM public.users WHERE id = uid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS 정책 생성
-- companies 테이블
CREATE POLICY "Platform admin can manage all companies" ON public.companies
    FOR ALL USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Business owners can view own company" ON public.companies
    FOR SELECT USING (
        public.is_business_owner(auth.uid()) AND
        id = public.get_user_company_id(auth.uid())
    );

CREATE POLICY "Business owners can update own company" ON public.companies
    FOR UPDATE USING (
        public.is_business_owner(auth.uid()) AND
        id = public.get_user_company_id(auth.uid())
    );

-- users 테이블 정책 업데이트 (company_id 기반)
DROP POLICY IF EXISTS "Admin can manage all users" ON public.users;
CREATE POLICY "Platform admin can manage all users" ON public.users
    FOR ALL USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Business owners can manage company users" ON public.users
    FOR ALL USING (
        public.is_business_owner(auth.uid()) AND
        company_id = public.get_user_company_id(auth.uid())
    );

-- stores 테이블 정책 업데이트
DROP POLICY IF EXISTS "Admin can manage all stores" ON public.stores;
CREATE POLICY "Platform admin can manage all stores" ON public.stores
    FOR ALL USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Business owners can manage company stores" ON public.stores
    FOR ALL USING (
        public.is_business_owner(auth.uid()) AND
        company_id = public.get_user_company_id(auth.uid())
    );

-- 기존 admin 역할을 platform_admin으로 변경 (선택사항)
-- UPDATE public.users SET role = 'platform_admin' WHERE role = 'admin';



