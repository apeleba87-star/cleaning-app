-- ============================================
-- attendance 테이블 다중 매장 출퇴근 지원을 위한 제약 조건 수정
-- ============================================

-- 1. 기존 UNIQUE 제약 조건 확인 및 제거
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- attendance_user_id_work_date_key 제약 조건 찾기 및 제거
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass
      AND conname = 'attendance_user_id_work_date_key'
      AND contype = 'u';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'Constraint attendance_user_id_work_date_key does not exist';
    END IF;

    -- 다른 가능한 이름의 제약 조건도 확인
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass
      AND pg_get_constraintdef(oid) LIKE '%user_id%work_date%'
      AND contype = 'u'
      AND conname != 'attendance_user_id_store_id_work_date_key';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END
$$;

-- 2. 새로운 UNIQUE 제약 조건 추가 (user_id, store_id, work_date)
-- 이미 존재하는 경우를 대비해 IF NOT EXISTS는 사용할 수 없으므로, 에러를 무시하도록 처리
DO $$
BEGIN
    -- 제약 조건이 이미 존재하는지 확인
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.attendance'::regclass
          AND conname = 'attendance_user_id_store_id_work_date_key'
          AND contype = 'u'
    ) THEN
        ALTER TABLE public.attendance
        ADD CONSTRAINT attendance_user_id_store_id_work_date_key 
        UNIQUE (user_id, store_id, work_date);
        RAISE NOTICE 'Added new constraint: attendance_user_id_store_id_work_date_key';
    ELSE
        RAISE NOTICE 'Constraint attendance_user_id_store_id_work_date_key already exists';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists, skipping...';
END
$$;

-- 3. 변경 사항 확인
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.attendance'::regclass
  AND contype = 'u'
ORDER BY conname;


