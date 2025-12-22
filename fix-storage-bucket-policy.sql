-- Storage 버킷 RLS 정책 수정
-- Supabase Dashboard → Storage → Policies에서 실행하거나
-- SQL Editor에서 실행하세요

-- cleaning-photos 버킷에 대한 업로드 정책 확인 및 수정
-- 참고: Storage 버킷의 RLS 정책은 Supabase Dashboard의 Storage 섹션에서 관리됩니다.

-- 아래는 일반적인 Storage 버킷 정책 예시입니다:
-- 1. Supabase Dashboard → Storage → cleaning-photos 버킷 → Policies
-- 2. "Allow uploads" 정책이 있는지 확인
-- 3. 없으면 다음 정책 추가:

-- Policy Name: "Allow authenticated users to upload"
-- Policy Definition:
--   (bucket_id = 'cleaning-photos')
--   AND (auth.role() = 'authenticated')

-- 또는 더 구체적으로:
--   (bucket_id = 'cleaning-photos')
--   AND (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE id = auth.uid()
--       AND role IN ('business_owner', 'platform_admin', 'staff', 'manager')
--     )
--   )

-- documents 버킷이 있다면 동일한 정책 적용

