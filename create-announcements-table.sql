-- announcements 테이블 생성
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('owner', 'staff')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- announcement_reads 테이블 생성 (읽음 표시)
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_announcements_company_id ON public.announcements(company_id);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON public.announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON public.announcement_reads(user_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS 정책: business_owner는 자신의 회사 공지사항 조회/생성/수정/삭제 가능
CREATE POLICY "Business owners can view their company announcements"
  ON public.announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = announcements.company_id
        AND u.role = 'business_owner'
    )
  );

CREATE POLICY "Business owners can create announcements for their company"
  ON public.announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = announcements.company_id
        AND u.role = 'business_owner'
    )
  );

CREATE POLICY "Business owners can update their company announcements"
  ON public.announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = announcements.company_id
        AND u.role = 'business_owner'
    )
  );

CREATE POLICY "Business owners can delete their company announcements"
  ON public.announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = announcements.company_id
        AND u.role = 'business_owner'
    )
  );

-- RLS 정책: staff는 자신의 회사 직원용 공지사항 조회 가능
CREATE POLICY "Staff can view staff announcements from their company"
  ON public.announcements
  FOR SELECT
  USING (
    type = 'staff' AND
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = announcements.company_id
        AND u.role = 'staff'
    )
  );

-- RLS 정책: manager는 자신의 회사 점주용 공지사항 조회 가능
CREATE POLICY "Managers can view owner announcements from their company"
  ON public.announcements
  FOR SELECT
  USING (
    type = 'owner' AND
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.company_id = announcements.company_id
        AND u.role = 'manager'
    )
  );

-- RLS 정책: 사용자는 자신의 읽음 표시 조회/생성 가능
CREATE POLICY "Users can view their own announcement reads"
  ON public.announcement_reads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own announcement reads"
  ON public.announcement_reads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: business_owner는 자신의 회사 공지사항의 모든 읽음 표시 조회 가능
CREATE POLICY "Business owners can view all reads for their company announcements"
  ON public.announcement_reads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.announcements a
      JOIN public.users u ON u.company_id = a.company_id
      WHERE a.id = announcement_reads.announcement_id
        AND u.id = auth.uid()
        AND u.role = 'business_owner'
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- 코멘트 추가
COMMENT ON TABLE public.announcements IS '공지사항';
COMMENT ON COLUMN public.announcements.type IS 'owner: 점주용, staff: 직원용';
COMMENT ON TABLE public.announcement_reads IS '공지사항 읽음 표시';












