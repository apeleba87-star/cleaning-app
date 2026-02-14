-- ============================================
-- 체크리스트 사진 업로드를 위한 Storage Bucket 생성
-- ============================================

-- checklist-photos 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-photos', 'checklist-photos', false)
ON CONFLICT (id) DO NOTHING;

-- checklist-photos 버킷 정책
-- 사용자는 자신의 체크리스트 사진을 업로드할 수 있음
CREATE POLICY "Users can upload own checklist photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'checklist-photos' AND
        (select auth.uid())::text = (storage.foldername(name))[1]
    );

-- 사용자는 자신의 체크리스트 사진을 읽을 수 있음
CREATE POLICY "Users can read own checklist photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'checklist-photos' AND
        (select auth.uid())::text = (storage.foldername(name))[1]
    );

-- 사용자는 자신의 체크리스트 사진을 업데이트할 수 있음
CREATE POLICY "Users can update own checklist photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'checklist-photos' AND
        (select auth.uid())::text = (storage.foldername(name))[1]
    );

-- 사용자는 자신의 체크리스트 사진을 삭제할 수 있음
CREATE POLICY "Users can delete own checklist photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'checklist-photos' AND
        (select auth.uid())::text = (storage.foldername(name))[1]
    );

-- 매니저/관리자는 배정된 매장의 체크리스트 사진을 읽을 수 있음
CREATE POLICY "Managers can read assigned store checklist photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'checklist-photos' AND
        (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = (select auth.uid()) 
                AND role IN ('manager', 'admin', 'business_owner', 'platform_admin')
            )
        )
    );

-- 확인
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'checklist-photos';

