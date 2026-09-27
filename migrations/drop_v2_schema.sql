-- Remove MUPL V2 (v2_* tables, types, function).
-- Run only AFTER the code without V2 is deployed.
--
-- Before running:
--   1. Back up the database.
--   2. Run the checks in STEP 0 and confirm nothing important depends on V2.
--   3. Empty and delete the `v2-photos` bucket in Supabase Dashboard > Storage.
--      Direct DELETE on storage.objects is blocked by Supabase; use the Dashboard or Storage API
--      so files are actually removed and do not remain as orphans.

-- ---------------------------------------------------------------------------
-- STEP 0: checks (read-only)
-- ---------------------------------------------------------------------------
-- V2 accounts that do not exist in V1 users (these lose their V2 role)
SELECT v.id, v.role, v.name
FROM v2_users v
LEFT JOIN users u ON u.id = v.id
WHERE u.id IS NULL;

-- Homepage sites whose tenant_id points to a V2 company
SELECT s.id, s.tenant_id
FROM homepage_sites s
JOIN v2_companies c ON c.id = s.tenant_id;

-- Remaining files in the V2 photo bucket (should be 0 before dropping)
SELECT count(*) AS remaining_v2_photos
FROM storage.objects
WHERE bucket_id = 'v2-photos';

-- ---------------------------------------------------------------------------
-- STEP 1: drop
-- ---------------------------------------------------------------------------
BEGIN;

DROP FUNCTION IF EXISTS v2_current_user_row();

DROP TABLE IF EXISTS
  v2_ad_impressions_daily,
  v2_ad_creatives,
  v2_ad_campaigns,
  v2_ad_advertisers,
  v2_ad_slots,
  v2_issue_events,
  v2_photo_assets,
  v2_store_issues,
  v2_attendance,
  v2_checklist_runs,
  v2_checklist_templates,
  v2_store_notes,
  v2_store_assignments,
  v2_stores,
  v2_users,
  v2_companies
CASCADE;

DROP TYPE IF EXISTS
  v2_ad_campaign_status,
  v2_issue_type,
  v2_issue_status,
  v2_assignment_role,
  v2_user_role;

COMMIT;
