-- V2 photo evidence and issue request workflow additions.
-- Run in Supabase SQL Editor after v2_initial_schema.sql if the initial schema was already applied.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'v2-photos',
  'v2-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE v2_photo_assets
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES v2_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_date DATE,
  ADD COLUMN IF NOT EXISTS memo TEXT,
  ADD COLUMN IF NOT EXISTS upload_status TEXT NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_v2_photos_store_date
  ON v2_photo_assets(store_id, work_date, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_photos_issue
  ON v2_photo_assets(issue_id)
  WHERE issue_id IS NOT NULL;

ALTER TABLE v2_store_issues
  ADD COLUMN IF NOT EXISTS item_name TEXT,
  ADD COLUMN IF NOT EXISTS requested_quantity TEXT,
  ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS resolution_type TEXT;
