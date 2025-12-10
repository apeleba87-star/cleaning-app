-- ============================================
-- attendance 테이블 제약 조건 확인
-- ============================================

-- 1. 현재 attendance 테이블의 모든 제약 조건 확인
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.attendance'::regclass
  AND contype = 'u'  -- UNIQUE 제약 조건만
ORDER BY conname;

-- 2. attendance 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'attendance'
ORDER BY ordinal_position;

-- 3. 현재 attendance 테이블의 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'attendance';


