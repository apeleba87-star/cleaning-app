-- ============================================
-- [긴급] attendance 테이블 제약 조건 수정
-- 다중 매장 출퇴근을 위해 반드시 실행 필요
-- ============================================

-- Step 1: 기존 제약 조건 제거
ALTER TABLE public.attendance 
DROP CONSTRAINT IF EXISTS attendance_user_id_work_date_key;

-- Step 2: 다른 가능한 이름의 제약 조건도 제거
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.attendance'::regclass
          AND contype = 'u'
          AND conname LIKE '%user_id%work_date%'
    LOOP
        EXECUTE format('ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Step 3: 새로운 제약 조건 추가 (user_id, store_id, work_date)
ALTER TABLE public.attendance
DROP CONSTRAINT IF EXISTS attendance_user_store_date_unique;

ALTER TABLE public.attendance
DROP CONSTRAINT IF EXISTS attendance_user_id_store_id_work_date_key;

ALTER TABLE public.attendance
ADD CONSTRAINT attendance_user_id_store_id_work_date_key 
UNIQUE (user_id, store_id, work_date);

-- Step 4: 확인
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.attendance'::regclass
  AND contype = 'u'
ORDER BY conname;



