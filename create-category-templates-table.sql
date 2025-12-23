-- 카테고리 템플릿 테이블 생성
CREATE TABLE IF NOT EXISTS public.category_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_category_templates_company_id ON public.category_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_category_templates_deleted_at ON public.category_templates(deleted_at);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Business owners can manage their category templates" ON public.category_templates;
DROP POLICY IF EXISTS "Platform admins can manage all category templates" ON public.category_templates;

-- RLS 정책: business_owner는 자신의 회사 템플릿 조회/생성/수정/삭제 가능
CREATE POLICY "Business owners can view their company category templates"
  ON public.category_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = category_templates.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
    OR deleted_at IS NULL
  );

CREATE POLICY "Business owners can create category templates for their company"
  ON public.category_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = category_templates.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can update their company category templates"
  ON public.category_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = category_templates.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

CREATE POLICY "Business owners can delete their company category templates"
  ON public.category_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = category_templates.company_id
        AND u.role IN ('business_owner', 'platform_admin')
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_category_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_category_templates_updated_at ON public.category_templates;

CREATE TRIGGER update_category_templates_updated_at
  BEFORE UPDATE ON public.category_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_category_templates_updated_at();

-- 코멘트 추가
COMMENT ON TABLE public.category_templates IS '카테고리 템플릿 정보';
COMMENT ON COLUMN public.category_templates.company_id IS '소속 회사 ID';
COMMENT ON COLUMN public.category_templates.name IS '템플릿 이름';
COMMENT ON COLUMN public.category_templates.category IS '카테고리 값';







