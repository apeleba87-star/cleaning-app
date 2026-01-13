-- 신분증 및 분실물 처리용 보관장소 컬럼 추가
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS storage_location TEXT;

-- 컬럼 설명 추가 (선택사항)
COMMENT ON COLUMN requests.storage_location IS '신분증 및 분실물 처리 시 보관장소 정보';
