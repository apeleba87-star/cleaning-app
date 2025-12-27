-- product_photos 테이블 생성
CREATE TABLE IF NOT EXISTS public.product_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receipt', 'storage')),
  photo_type TEXT CHECK (photo_type IN ('product', 'order_sheet')),
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_product_photos_store_id ON public.product_photos(store_id);
CREATE INDEX IF NOT EXISTS idx_product_photos_user_id ON public.product_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_product_photos_type ON public.product_photos(type);
CREATE INDEX IF NOT EXISTS idx_product_photos_created_at ON public.product_photos(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.product_photos ENABLE ROW LEVEL SECURITY;

-- RLS 정책: staff는 자신이 업로드한 사진만 조회 가능
CREATE POLICY "Staff can view their own product photos"
  ON public.product_photos
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- RLS 정책: staff는 자신의 사진만 삽입 가능
CREATE POLICY "Staff can insert their own product photos"
  ON public.product_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- RLS 정책: business_owner는 자신의 회사 매장 사진 조회 가능
CREATE POLICY "Business owners can view photos from their company stores"
  ON public.product_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores s
      JOIN public.users u ON u.company_id = s.company_id
      WHERE s.id = product_photos.store_id
        AND u.id = auth.uid()
        AND u.role = 'business_owner'
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_product_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_photos_updated_at
  BEFORE UPDATE ON public.product_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_product_photos_updated_at();

-- 코멘트 추가
COMMENT ON TABLE public.product_photos IS '제품 입고 및 보관 사진';
COMMENT ON COLUMN public.product_photos.type IS 'receipt: 제품 입고, storage: 보관 사진';
COMMENT ON COLUMN public.product_photos.photo_type IS '제품 입고일 때: product(제품 사진), order_sheet(발주서 사진)';
COMMENT ON COLUMN public.product_photos.photo_urls IS '사진 URL 배열 (JSONB)';


















