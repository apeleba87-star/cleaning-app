-- user_role enum 타입에 새로운 역할 추가
-- Supabase SQL Editor에서 실행하세요

-- 주의: PostgreSQL에서 enum에 값을 추가할 때는:
-- 1. 이미 존재하는 값 뒤에만 추가할 수 있습니다
-- 2. 트랜잭션 내에서도 제한이 있습니다
-- 3. 각 명령을 별도로 실행해야 할 수 있습니다

-- 먼저 기존 enum 타입 확인 (선택사항)
-- SELECT unnest(enum_range(NULL::user_role));

-- franchise_manager 추가
-- 이미 존재하면 오류가 발생하므로, 오류를 무시하고 다음 명령을 실행하세요
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'franchise_manager' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'franchise_manager';
    END IF;
END $$;

-- store_manager 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'store_manager' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'store_manager';
    END IF;
END $$;

-- 만약 위의 DO 블록이 작동하지 않으면, 아래 명령을 직접 실행하세요:
-- ALTER TYPE user_role ADD VALUE 'franchise_manager';
-- ALTER TYPE user_role ADD VALUE 'store_manager';

