-- 업체관리자 매장 상태 API에서 사용하는 인덱스 상세 확인
-- 각 테이블의 인덱스 이름과 정의를 확인하여 필요한 인덱스가 있는지 확인

-- 1. problem_reports 테이블 - store_id + created_at 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%store_id%' AND indexdef LIKE '%created_at%' THEN '✅ 필수 인덱스 있음'
        WHEN indexdef LIKE '%store_id%' OR indexdef LIKE '%created_at%' THEN '⚠️ 부분 인덱스'
        ELSE '❌ 없음'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'problem_reports'
ORDER BY 
    CASE 
        WHEN indexdef LIKE '%store_id%' AND indexdef LIKE '%created_at%' THEN 1
        WHEN indexdef LIKE '%store_id%' OR indexdef LIKE '%created_at%' THEN 2
        ELSE 3
    END,
    indexname;

-- 2. lost_items 테이블 - store_id + created_at, updated_at 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%store_id%' AND (indexdef LIKE '%created_at%' OR indexdef LIKE '%updated_at%') THEN '✅ 필수 인덱스 있음'
        WHEN indexdef LIKE '%store_id%' OR indexdef LIKE '%created_at%' OR indexdef LIKE '%updated_at%' THEN '⚠️ 부분 인덱스'
        ELSE '❌ 없음'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'lost_items'
ORDER BY 
    CASE 
        WHEN indexdef LIKE '%store_id%' AND (indexdef LIKE '%created_at%' OR indexdef LIKE '%updated_at%') THEN 1
        WHEN indexdef LIKE '%store_id%' OR indexdef LIKE '%created_at%' OR indexdef LIKE '%updated_at%' THEN 2
        ELSE 3
    END,
    indexname;

-- 3. requests 테이블 - store_id + created_at 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%store_id%' AND indexdef LIKE '%created_at%' THEN '✅ 필수 인덱스 있음'
        WHEN indexdef LIKE '%store_id%' OR indexdef LIKE '%created_at%' THEN '⚠️ 부분 인덱스'
        ELSE '❌ 없음'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'requests'
ORDER BY 
    CASE 
        WHEN indexdef LIKE '%store_id%' AND indexdef LIKE '%created_at%' THEN 1
        WHEN indexdef LIKE '%store_id%' OR indexdef LIKE '%created_at%' THEN 2
        ELSE 3
    END,
    indexname;

-- 4. attendance 테이블 - store_id + work_date, clock_in_at 인덱스 확인
SELECT 
    tablename,
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%store_id%' AND (indexdef LIKE '%work_date%' OR indexdef LIKE '%clock_in_at%') THEN '✅ 필수 인덱스 있음'
        WHEN indexdef LIKE '%store_id%' OR indexdef LIKE '%work_date%' OR indexdef LIKE '%clock_in_at%' THEN '⚠️ 부분 인덱스'
        ELSE '❌ 없음'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'attendance'
ORDER BY 
    CASE 
        WHEN indexdef LIKE '%store_id%' AND (indexdef LIKE '%work_date%' OR indexdef LIKE '%clock_in_at%') THEN 1
        WHEN indexdef LIKE '%store_id%' OR indexdef LIKE '%work_date%' OR indexdef LIKE '%clock_in_at%' THEN 2
        ELSE 3
    END,
    indexname;

-- 5. 전체 요약 - 필수 인덱스 존재 여부
SELECT 
    tablename,
    COUNT(*) FILTER (WHERE indexdef LIKE '%store_id%' AND indexdef LIKE '%created_at%') as has_store_created_index,
    COUNT(*) FILTER (WHERE indexdef LIKE '%store_id%' AND indexdef LIKE '%updated_at%') as has_store_updated_index,
    COUNT(*) FILTER (WHERE indexdef LIKE '%store_id%' AND indexdef LIKE '%work_date%') as has_store_work_date_index,
    COUNT(*) FILTER (WHERE indexdef LIKE '%store_id%' AND indexdef LIKE '%clock_in_at%') as has_store_clock_in_index,
    COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'problem_reports',
        'lost_items',
        'requests',
        'attendance'
    )
GROUP BY tablename
ORDER BY tablename;
