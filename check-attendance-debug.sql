-- ============================================
-- 출근 기록 확인 쿼리 (디버깅용)
-- ============================================

-- 현재 로그인한 사용자의 오늘 날짜 출근 기록 확인
-- (실제 사용 시에는 user_id를 직접 지정해야 함)

-- 1. 오늘 날짜 확인 (UTC 기준)
SELECT 
    NOW() AT TIME ZONE 'UTC' as current_utc_time,
    (NOW() AT TIME ZONE 'UTC')::DATE as today_utc_date,
    NOW() AT TIME ZONE 'Asia/Seoul' as current_korea_time,
    (NOW() AT TIME ZONE 'Asia/Seoul')::DATE as today_korea_date;

-- 2. 특정 사용자의 오늘 출근 기록 확인
-- 아래 user_id를 실제 사용자 ID로 변경하세요
SELECT 
    id,
    user_id,
    store_id,
    work_date,
    clock_in_at,
    clock_out_at,
    created_at
FROM public.attendance
WHERE user_id = 'YOUR_USER_ID_HERE'  -- 여기를 실제 사용자 ID로 변경
  AND work_date = (NOW() AT TIME ZONE 'UTC')::DATE
ORDER BY clock_in_at DESC;

-- 3. 특정 사용자의 모든 최근 출근 기록 (최근 7일)
SELECT 
    id,
    user_id,
    store_id,
    work_date,
    clock_in_at,
    clock_out_at,
    created_at
FROM public.attendance
WHERE user_id = 'YOUR_USER_ID_HERE'  -- 여기를 실제 사용자 ID로 변경
  AND work_date >= (NOW() AT TIME ZONE 'UTC')::DATE - INTERVAL '7 days'
ORDER BY work_date DESC, clock_in_at DESC;



