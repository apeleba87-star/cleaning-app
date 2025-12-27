-- stores 테이블에 schedule_data 컬럼 추가
-- JSON 형태로 스케줄링 정보를 저장

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS schedule_data TEXT;

-- schedule_data는 JSON 형태로 저장됩니다:
-- {
--   "type": "weekly" | "biweekly" | "monthly" | "custom",
--   "days": ["월", "수", "금"],  // weekly인 경우
--   "dayOfWeek": "월",           // biweekly인 경우
--   "startDate": "2025-01-06",   // biweekly인 경우
--   "pattern": "weekday" | "specific_days",  // monthly인 경우
--   "week": "first" | "second" | "third" | "fourth" | "last",  // monthly weekday인 경우
--   "additionalDays": [1, 15],  // monthly specific_days인 경우
--   "schedule": {                // custom인 경우
--     "2025-01": [5, 20],
--     "2025-02": [3, 18],
--     ...
--   }
-- }

COMMENT ON COLUMN stores.schedule_data IS '관리 스케줄 정보 (JSON 형태). weekly, biweekly, monthly, custom 타입 지원';

