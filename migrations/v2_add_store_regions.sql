-- Add normalized store region fields for V2 regional ad targeting.
-- Run in Supabase SQL Editor if v2_initial_schema.sql was already applied before these columns existed.

ALTER TABLE v2_stores
  ADD COLUMN IF NOT EXISTS region_sido TEXT,
  ADD COLUMN IF NOT EXISTS region_sigungu TEXT;

CREATE INDEX IF NOT EXISTS idx_v2_stores_region
  ON v2_stores(region_sido, region_sigungu)
  WHERE deleted_at IS NULL;
