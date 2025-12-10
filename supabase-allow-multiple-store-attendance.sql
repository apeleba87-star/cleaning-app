-- ============================================
-- 다중 매장 출퇴근 지원: UNIQUE 제약조건 변경
-- ============================================

-- 기존 UNIQUE 제약조건 제거 (user_id, work_date)
-- 제약조건 이름 확인
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 2;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- 새로운 UNIQUE 제약조건 추가 (user_id, store_id, work_date)
-- 한 사용자가 같은 날 같은 매장에 여러 번 출근할 수 없도록
ALTER TABLE public.attendance
    ADD CONSTRAINT attendance_user_store_date_unique 
    UNIQUE (user_id, store_id, work_date);

-- 인덱스 추가 (선택사항, 성능 향상)
CREATE INDEX IF NOT EXISTS idx_attendance_user_store_date 
    ON public.attendance(user_id, store_id, work_date);

-- 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.attendance'::regclass
  AND contype = 'u';



