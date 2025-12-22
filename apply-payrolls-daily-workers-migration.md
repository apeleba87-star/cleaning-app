# 일당 근로자 인건비 기능 활성화

일당 근로자 인건비 저장이 실패하는 문제를 해결하기 위해 다음 SQL 마이그레이션을 실행해야 합니다.

## 실행 방법

1. Supabase Dashboard에 접속
2. SQL Editor로 이동
3. 아래 SQL을 복사하여 실행

또는 `update-payrolls-for-daily-workers.sql` 파일의 내용을 실행하세요.

## 마이그레이션 내용

- `user_id` 컬럼을 nullable로 변경 (일당 근로자는 user_id 없음)
- `worker_name` 컬럼 추가 (일당 근로자 이름)
- `resident_registration_number_encrypted` 컬럼 추가 (암호화된 주민등록번호)
- `work_days` 컬럼 추가 (근무 일수)
- `daily_wage` 컬럼 추가 (일당 금액)
- 제약조건 추가: 정규 직원 또는 일당 근로자 중 하나만 있어야 함

