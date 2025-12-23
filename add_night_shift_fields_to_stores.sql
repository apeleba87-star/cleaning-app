-- stores 테이블에 야간 매장 관련 필드 추가

-- is_night_shift: 야간 매장 여부
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS is_night_shift BOOLEAN DEFAULT false;

-- work_start_hour: 근무 시작 시간 (0-23)
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS work_start_hour INTEGER DEFAULT 0;

-- work_end_hour: 근무 종료 시간 (0-23, 다음날을 의미할 수 있음)
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS work_end_hour INTEGER DEFAULT 0;

-- work_start_hour와 work_end_hour에 대한 CHECK 제약 조건 추가
ALTER TABLE stores
ADD CONSTRAINT chk_work_start_hour CHECK (work_start_hour >= 0 AND work_start_hour <= 23);

ALTER TABLE stores
ADD CONSTRAINT chk_work_end_hour CHECK (work_end_hour >= 0 AND work_end_hour <= 23);


