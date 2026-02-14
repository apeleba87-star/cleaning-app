-- ============================================
-- 관리 사례(블로그 링크)를 위한 스키마
-- ============================================

-- 관리 사례 테이블
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  blog_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

-- 모든 사용자는 활성화된 관리 사례 읽기 가능
CREATE POLICY "Anyone can read active case studies"
  ON case_studies
  FOR SELECT
  USING (is_active = true);

-- 관리자만 수정 가능
CREATE POLICY "Admins can manage case studies"
  ON case_studies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'platform_admin')
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_case_studies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE ON case_studies
  FOR EACH ROW
  EXECUTE FUNCTION update_case_studies_updated_at();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_case_studies_display_order ON case_studies(display_order);
CREATE INDEX IF NOT EXISTS idx_case_studies_is_active ON case_studies(is_active);
