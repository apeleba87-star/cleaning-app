-- 반려처리 관련 컬럼 추가
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS rejection_photo_url TEXT,
ADD COLUMN IF NOT EXISTS rejection_description TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID;

-- 컬럼 설명 추가 (선택사항)
COMMENT ON COLUMN requests.rejection_photo_url IS '반려 처리 시 업로드된 사진 URL';
COMMENT ON COLUMN requests.rejection_description IS '반려 처리 사유';
COMMENT ON COLUMN requests.rejected_at IS '반려 처리 일시';
COMMENT ON COLUMN requests.rejected_by IS '반려 처리한 사용자 ID';















