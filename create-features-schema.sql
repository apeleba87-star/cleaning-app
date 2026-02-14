-- ============================================
-- 기능 소개 페이지를 위한 스키마
-- ============================================

-- 기능 소개 테이블
CREATE TABLE IF NOT EXISTS feature_introductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT,
  icon_color TEXT DEFAULT '#3B82F6',
  display_order INTEGER NOT NULL,
  category TEXT,
  benefits TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE feature_introductions ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자는 읽기 가능
CREATE POLICY "Anyone can read active features"
  ON feature_introductions
  FOR SELECT
  USING (is_active = true);

-- 관리자만 수정 가능
CREATE POLICY "Admins can manage features"
  ON feature_introductions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'platform_admin')
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_feature_introductions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_introductions_updated_at
  BEFORE UPDATE ON feature_introductions
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_introductions_updated_at();

-- 기본 기능 데이터 삽입
INSERT INTO feature_introductions (title, description, icon_name, icon_color, display_order, category, benefits) VALUES
('실시간 매장 상태 관리', '전체 매장의 출근 상태, 문제 발생 여부, 체크리스트 진행률을 한눈에 확인할 수 있습니다. 문제가 있는 매장은 즉시 파악하여 대응할 수 있습니다.', '📊', '#3B82F6', 1, 'management', ARRAY['전체 매장 상태 실시간 모니터링', '문제 발생 매장 즉시 파악', '출근/휴무 상태 자동 확인', '체크리스트 진행률 시각화']),
('스마트 요청란 시스템', '업체관리자가 매장에 요청을 보내고, 직원이 처리하는 효율적인 소통 구조입니다. 접수 → 처리중 → 완료 상태를 명확히 추적할 수 있습니다.', '📋', '#10B981', 2, 'communication', ARRAY['요청 상태 자동 추적', '매장별 요청 현황 관리', '처리 완료 알림', '요청 이력 자동 저장']),
('체크리스트 자동화', '매장별 맞춤 체크리스트를 생성하고, 직원이 수행한 항목을 실시간으로 확인할 수 있습니다. 수행률을 자동으로 계산하여 관리합니다.', '✅', '#8B5CF6', 3, 'operation', ARRAY['매장별 맞춤 체크리스트', '실시간 수행률 확인', '사진 첨부로 증빙', '자동 완료율 계산']),
('문제 보고 및 추적', '매장에서 발생한 문제를 즉시 보고하고, 해결 과정을 추적할 수 있습니다. 사진과 함께 상세한 문제 상황을 기록합니다.', '⚠️', '#EF4444', 4, 'operation', ARRAY['즉시 문제 보고', '사진 첨부로 명확한 기록', '해결 과정 추적', '문제 이력 관리']),
('제품 입고/보관 관리', '제품 입고 시 사진을 촬영하여 기록하고, 보관 제품 현황을 관리합니다. 바코드로 제품을 빠르게 찾을 수 있습니다.', '📦', '#F59E0B', 5, 'inventory', ARRAY['입고 사진 자동 기록', '보관 제품 현황 관리', '바코드 제품 검색', '제품 위치 정보 저장']),
('바코드 제품 검색', '바코드를 스캔하여 제품 정보와 위치를 즉시 확인할 수 있습니다. 제품 찾기 시간을 대폭 단축합니다.', '🔍', '#06B6D4', 6, 'inventory', ARRAY['바코드 스캔으로 즉시 검색', '제품 위치 정보 확인', '제품 상세 정보 조회', '검색 이력 저장']),
('사진 기반 기록 관리', '청소 전후 사진, 문제 사진, 제품 사진을 체계적으로 관리합니다. 시간순으로 정리되어 필요할 때 쉽게 찾을 수 있습니다.', '📸', '#EC4899', 7, 'operation', ARRAY['청소 전후 사진 비교', '문제 사진 체계적 관리', '시간순 자동 정리', '사진 검색 및 필터링']),
('재무 통합 관리', '인건비, 수금, 미수금, 지출을 한 곳에서 통합 관리합니다. 매장별 재무 현황을 한눈에 파악할 수 있습니다.', '💰', '#14B8A6', 8, 'financial', ARRAY['인건비 자동 계산', '수금/미수금 추적', '지출 내역 관리', '재무 현황 대시보드']),
('리포트 및 분석', '월간/주간 리포트를 자동으로 생성하여 매장 운영 현황을 분석합니다. 데이터를 기반으로 의사결정을 할 수 있습니다.', '📈', '#6366F1', 9, 'analytics', ARRAY['월간/주간 리포트 자동 생성', '매장 운영 현황 분석', '트렌드 파악', '데이터 기반 의사결정']),
('모바일 최적화', '직원용 앱으로 현장에서 바로 작업할 수 있습니다. 간단하고 직관적인 인터페이스로 누구나 쉽게 사용할 수 있습니다.', '📱', '#84CC16', 10, 'mobile', ARRAY['현장에서 즉시 사용', '직관적인 인터페이스', '오프라인 모드 지원', '빠른 사진 촬영 및 업로드'])
ON CONFLICT DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_feature_introductions_display_order ON feature_introductions(display_order);
CREATE INDEX IF NOT EXISTS idx_feature_introductions_category ON feature_introductions(category);
CREATE INDEX IF NOT EXISTS idx_feature_introductions_is_active ON feature_introductions(is_active);
