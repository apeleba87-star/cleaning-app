-- 체크리스트 updated_at 트리거 확인 및 재생성

-- 1. 기존 트리거 확인
SELECT 
    trigger_name,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'checklist'
AND trigger_schema = 'public';

-- 2. 트리거가 없으면 재생성
DROP TRIGGER IF EXISTS update_checklist_updated_at ON public.checklist;

CREATE TRIGGER update_checklist_updated_at 
BEFORE UPDATE ON public.checklist
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 3. 트리거 함수 확인
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_updated_at_column';

-- 4. 테스트: 체크리스트 업데이트 후 updated_at 확인
-- (실제 체크리스트 ID로 변경 필요)
-- SELECT id, work_date, updated_at, created_at 
-- FROM public.checklist 
-- WHERE id = 'YOUR_CHECKLIST_ID_HERE'
-- ORDER BY updated_at DESC;



