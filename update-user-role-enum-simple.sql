-- user_role enum 타입에 새로운 역할 추가 (간단 버전)
-- Supabase SQL Editor에서 이 두 줄을 순서대로 실행하세요

-- 1. franchise_manager 추가
ALTER TYPE user_role ADD VALUE 'franchise_manager';

-- 2. store_manager 추가  
ALTER TYPE user_role ADD VALUE 'store_manager';

-- 참고: 
-- - 이미 값이 존재하면 오류가 발생하지만, 무시하고 다음 명령을 실행하면 됩니다
-- - 각 명령을 별도로 실행하는 것이 안전합니다
-- - 실행 후 enum 타입 확인: SELECT unnest(enum_range(NULL::user_role));






