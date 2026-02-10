-- ============================================================
-- 매장 삭제 후 Supabase 데이터 정리 여부 확인
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================
-- [방법 1] 아래 [한번에 확인] 블록만 실행 → 치환 없이 "가장 최근 삭제된 매장" 기준으로 결과 확인
-- [방법 2] 특정 매장 ID로 보려면 [A] 실행 후 id 복사 → DELETED_STORE_ID 치환 후 [B]~[D] 실행

-- ========== [한번에 확인] 가장 최근 삭제된 매장 기준 (치환 불필요) ==========
WITH deleted AS (
  SELECT id AS store_id FROM stores WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 1
),
info AS (
  SELECT s.id, s.name, s.deleted_at FROM stores s JOIN deleted d ON s.id = d.store_id
)
SELECT '0_삭제된_매장_정보' AS table_name, NULL::bigint AS remaining
UNION ALL SELECT '  → id: ' || id, NULL::bigint FROM info
UNION ALL SELECT '  → name: ' || name, NULL::bigint FROM info
UNION ALL SELECT '  → deleted_at: ' || deleted_at::text, NULL::bigint FROM info
UNION ALL
SELECT 'store_assign', COUNT(*) FROM store_assign sa JOIN deleted d ON sa.store_id = d.store_id
UNION ALL SELECT 'attendance', COUNT(*) FROM attendance a JOIN deleted d ON a.store_id = d.store_id
UNION ALL SELECT 'supply_requests', COUNT(*) FROM supply_requests sr JOIN deleted d ON sr.store_id = d.store_id
UNION ALL SELECT 'requests', COUNT(*) FROM requests r JOIN deleted d ON r.store_id = d.store_id
UNION ALL SELECT 'problem_reports', COUNT(*) FROM problem_reports pr JOIN deleted d ON pr.store_id = d.store_id
UNION ALL SELECT 'lost_items', COUNT(*) FROM lost_items li JOIN deleted d ON li.store_id = d.store_id
UNION ALL SELECT 'issues', COUNT(*) FROM issues i JOIN deleted d ON i.store_id = d.store_id
UNION ALL SELECT 'checklist', COUNT(*) FROM checklist c JOIN deleted d ON c.store_id = d.store_id
UNION ALL SELECT 'cleaning_photos', COUNT(*) FROM cleaning_photos cp JOIN deleted d ON cp.store_id = d.store_id
UNION ALL SELECT 'product_photos', COUNT(*) FROM product_photos pp JOIN deleted d ON pp.store_id = d.store_id
UNION ALL SELECT 'store_files', COUNT(*) FROM store_files sf JOIN deleted d ON sf.store_id = d.store_id
UNION ALL SELECT 'store_contacts', COUNT(*) FROM store_contacts sc JOIN deleted d ON sc.store_id = d.store_id
UNION ALL SELECT 'revenues', COUNT(*) FROM revenues rev JOIN deleted d ON rev.store_id = d.store_id
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses e JOIN deleted d ON e.store_id = d.store_id
UNION ALL SELECT 'store_product_locations', COUNT(*) FROM store_product_locations spl JOIN deleted d ON spl.store_id = d.store_id
UNION ALL SELECT 'store_name_mappings', COUNT(*) FROM store_name_mappings snm JOIN deleted d ON snm.system_store_id = d.store_id
UNION ALL
SELECT 'receipts(via revenues)', COUNT(*) FROM receipts r JOIN revenues rev ON r.revenue_id = rev.id JOIN deleted d ON rev.store_id = d.store_id;

-- ========== [A] 최근 소프트 삭제된 매장 목록 (특정 id 확인용) ==========
-- SELECT id, name, deleted_at, updated_at
-- FROM stores
-- WHERE deleted_at IS NOT NULL
-- ORDER BY deleted_at DESC
-- LIMIT 10;

-- ========== [B]~[D] 특정 매장만 확인할 때: 아래 DELETED_STORE_ID를 실제 UUID로 치환 후 실행 ==========
-- [B] SELECT id, name, deleted_at FROM stores WHERE id = 'DELETED_STORE_ID'::uuid;
-- [C] SELECT 'store_assign' AS table_name, COUNT(*) AS remaining FROM store_assign WHERE store_id = 'DELETED_STORE_ID'::uuid
--     UNION ALL SELECT 'attendance', COUNT(*) FROM attendance WHERE store_id = 'DELETED_STORE_ID'::uuid
--     ... (나머지 동일)
-- [D] SELECT COUNT(*) AS receipts_linked_to_store_revenues FROM receipts r JOIN revenues rev ON r.revenue_id = rev.id WHERE rev.store_id = 'DELETED_STORE_ID'::uuid;

-- ========== Storage 확인 (Supabase Dashboard에서 수동) ==========
-- 1. Storage → cleaning-photos → stores/ 폴더 안에 해당 매장 ID 폴더가 없거나 비어 있으면 정상
-- 2. checklist-photos, issue-photos, supply-photos, selfies 등에서
--    경로에 해당 매장 ID가 포함된 파일이 없으면 정상
