-- expenses 테이블의 category check constraint 제거
-- 한글 카테고리 사용을 위해 제약 조건 제거

-- 1. 기존 check constraint 제거
ALTER TABLE public.expenses 
DROP CONSTRAINT IF EXISTS expenses_category_check;

-- 2. category 컬럼이 TEXT이므로 이미 자유롭게 입력 가능
-- 추가 작업 불필요

-- 확인 쿼리
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'expenses' AND constraint_type = 'CHECK';


