-- user_role enum 타입에 도급 역할 추가
-- PostgreSQL에서 enum 타입에 값 추가

-- 먼저 enum 타입 확인
-- SELECT enum_range(NULL::user_role);

-- enum 타입에 새 값 추가
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'subcontract_individual';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'subcontract_company';

-- 확인
-- SELECT enum_range(NULL::user_role);

