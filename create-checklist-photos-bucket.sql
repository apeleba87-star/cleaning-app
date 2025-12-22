-- ============================================
-- checklist-photos 버킷 생성 및 RLS 정책
-- ============================================

-- 1. checklist-photos 버킷 생성 (private)
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('checklist-photos', 'checklist-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. checklist-photos 버킷 정책
-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Staff can upload own checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can read own checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update own checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete own checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Managers can read assigned store checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can read company checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Platform admins can manage all checklist photos" ON storage.objects;

-- Staff: 본인이 업로드한 체크리스트 사진 조회/업로드 가능
CREATE POLICY "Staff can upload own checklist photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'checklist-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Staff can read own checklist photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'checklist-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Staff can update own checklist photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'checklist-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Staff can delete own checklist photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'checklist-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Managers: 배정받은 매장의 체크리스트 사진 조회 가능
CREATE POLICY "Managers can read assigned store checklist photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'checklist-photos' AND
        (
            public.is_manager(auth.uid()) OR
            public.is_admin(auth.uid()) OR
            public.is_platform_admin(auth.uid())
        )
    );

-- Business owners: 본인 회사의 체크리스트 사진 조회 가능
CREATE POLICY "Business owners can read company checklist photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'checklist-photos' AND
        public.is_business_owner(auth.uid())
    );

-- Platform admins: 모든 체크리스트 사진 조회 가능
CREATE POLICY "Platform admins can manage all checklist photos" ON storage.objects
    FOR ALL USING (
        bucket_id = 'checklist-photos' AND
        public.is_platform_admin(auth.uid())
    );

-- 버킷 및 정책 확인
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'checklist-photos';

SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%checklist%'
ORDER BY policyname;

