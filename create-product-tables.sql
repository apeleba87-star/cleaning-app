-- 제품 마스터 테이블
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  image_url TEXT,
  category_1 TEXT,
  category_2 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 바코드 인덱스 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name) WHERE deleted_at IS NULL;

-- 매장별 제품 위치 테이블
CREATE TABLE IF NOT EXISTS store_product_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vending_machine_number INTEGER NOT NULL,
  position_number INTEGER NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id, vending_machine_number, position_number)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_store_product_locations_store_product ON store_product_locations(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_store_product_locations_store ON store_product_locations(store_id);

-- 매장명 매핑 테이블
CREATE TABLE IF NOT EXISTS store_name_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  original_store_name TEXT NOT NULL,
  hardware_name_pattern TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(system_store_id, original_store_name)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_store_name_mappings_original ON store_name_mappings(original_store_name) WHERE is_active = TRUE;

-- RLS 정책 설정
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_product_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_name_mappings ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "직원은 제품 조회 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 생성 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 수정 가능" ON products;
DROP POLICY IF EXISTS "관리자는 제품 삭제 가능" ON products;
DROP POLICY IF EXISTS "직원은 자신의 매장 제품 위치 조회 가능" ON store_product_locations;
DROP POLICY IF EXISTS "관리자는 매장명 매핑 조회 가능" ON store_name_mappings;

-- products 테이블 RLS 정책
-- 직원은 제품 조회 가능
CREATE POLICY "직원은 제품 조회 가능" ON products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'staff'
    )
  );

-- 관리자는 제품 생성/수정/삭제 가능
CREATE POLICY "관리자는 제품 생성 가능" ON products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  );

CREATE POLICY "관리자는 제품 수정 가능" ON products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  );

CREATE POLICY "관리자는 제품 삭제 가능" ON products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('business_owner', 'platform_admin', 'admin')
    )
  );

-- store_product_locations 테이블 RLS 정책
CREATE POLICY "직원은 자신의 매장 제품 위치 조회 가능" ON store_product_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM store_assign
      WHERE store_assign.store_id = store_product_locations.store_id
      AND store_assign.user_id = (select auth.uid())
    )
  );

-- store_name_mappings 테이블 RLS 정책 (관리자만)
DROP POLICY IF EXISTS "관리자는 매장명 매핑 조회 가능" ON store_name_mappings;
DROP POLICY IF EXISTS "관리자는 매장명 매핑 관리 가능" ON store_name_mappings;

CREATE POLICY "관리자는 매장명 매핑 조회 가능" ON store_name_mappings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'business_owner', 'platform_admin')
    )
  );

CREATE POLICY "관리자는 매장명 매핑 관리 가능" ON store_name_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'business_owner', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role IN ('admin', 'business_owner', 'platform_admin')
    )
  );

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 (이미 존재하는 경우)
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_store_product_locations_updated_at ON store_product_locations;
DROP TRIGGER IF EXISTS update_store_name_mappings_updated_at ON store_name_mappings;

-- 트리거 생성
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_product_locations_updated_at
  BEFORE UPDATE ON store_product_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_name_mappings_updated_at
  BEFORE UPDATE ON store_name_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

