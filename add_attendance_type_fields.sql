-- attendance 테이블에 출근 유형 관련 필드 추가

-- attendance_type: 출근 유형 ('regular', 'rescheduled', 'emergency')
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20) DEFAULT 'regular';

-- scheduled_date: 원래 예정일 (출근일 변경 출근인 경우)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- problem_report_id: 긴급 출동인 경우 해결한 문제 ID
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS problem_report_id UUID REFERENCES problem_reports(id);

-- change_reason: 출근일 변경 사유
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- attendance_type에 대한 CHECK 제약 조건 추가
ALTER TABLE attendance
ADD CONSTRAINT chk_attendance_type CHECK (attendance_type IN ('regular', 'rescheduled', 'emergency'));

-- 기존 데이터는 모두 'regular'로 설정
UPDATE attendance
SET attendance_type = 'regular'
WHERE attendance_type IS NULL;

-- attendance_type에 NOT NULL 제약 조건 추가 (기존 데이터 업데이트 후)
ALTER TABLE attendance
ALTER COLUMN attendance_type SET NOT NULL;

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(attendance_type);
CREATE INDEX IF NOT EXISTS idx_attendance_scheduled_date ON attendance(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_problem_report_id ON attendance(problem_report_id) WHERE problem_report_id IS NOT NULL;


