-- 업체관리자 매장 상태 API에서 사용하는 테이블의 인덱스 확인
-- Supabase SQL Editor에서 실행하여 현재 인덱스 상태를 확인하세요

-- 1. problem_reports 테이블 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'problem_reports'
ORDER BY indexname;

-- 2. lost_items 테이블 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'lost_items'
ORDER BY indexname;

-- 3. requests 테이블 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'requests'
ORDER BY indexname;

-- 4. attendance 테이블 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'attendance'
ORDER BY indexname;

-- 5. supply_requests 테이블 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'supply_requests'
ORDER BY indexname;

-- 6. checklist 테이블 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'checklist'
ORDER BY indexname;

-- 7. cleaning_photos 테이블 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'cleaning_photos'
ORDER BY indexname;

-- 8. product_photos 테이블 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'product_photos'
ORDER BY indexname;

-- 9. 전체 요약 (모든 관련 테이블의 인덱스 개수)
SELECT 
    tablename,
    COUNT(*) as index_count,
    STRING_AGG(indexname, ', ' ORDER BY indexname) as index_names
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'problem_reports',
        'lost_items',
        'requests',
        'attendance',
        'supply_requests',
        'checklist',
        'cleaning_photos',
        'product_photos'
    )
GROUP BY tablename
ORDER BY tablename;

-- 10. 필요한 인덱스가 있는지 확인 (store_id + created_at 조합)
SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexdef LIKE '%store_id%' AND indexdef LIKE '%created_at%' THEN '✅ 있음'
        ELSE '❌ 없음'
    END as has_store_created_index
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('problem_reports', 'lost_items', 'requests')
    AND (
        indexdef LIKE '%store_id%' OR 
        indexdef LIKE '%created_at%'
    )
ORDER BY tablename, indexname;
