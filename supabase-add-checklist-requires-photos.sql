-- ============================================
-- Checklist에 필수 사진 촬영 여부 필드 추가
-- ============================================

-- requires_photos 컬럼 추가
ALTER TABLE public.checklist
    ADD COLUMN IF NOT EXISTS requires_photos BOOLEAN NOT NULL DEFAULT false;

-- 인덱스 추가 (선택사항, 필요시)
CREATE INDEX IF NOT EXISTS idx_checklist_requires_photos ON public.checklist(requires_photos) WHERE requires_photos = true;

-- 확인
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'checklist'
    AND column_name = 'requires_photos';


