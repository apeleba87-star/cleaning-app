# 매장 필드 추가 SQL 실행 가이드

## 실행 방법

1. Supabase 대시보드 (https://supabase.com/dashboard) 접속
2. 프로젝트 선택: `vmhhkjwqifzgczrfrwxy`
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New query** 클릭
5. 아래 SQL 코드를 복사하여 붙여넣기
6. **Run** 버튼 클릭 (또는 `Ctrl + Enter`)

## 실행할 SQL

```sql
-- 매장 테이블 필드 추가
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS head_office_name TEXT DEFAULT '개인',
ADD COLUMN IF NOT EXISTS parent_store_name TEXT,
ADD COLUMN IF NOT EXISTS management_days TEXT,
ADD COLUMN IF NOT EXISTS service_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS service_active BOOLEAN DEFAULT true;

-- 기존 데이터에 기본값 설정
UPDATE public.stores
SET head_office_name = COALESCE(head_office_name, '개인'),
    service_active = COALESCE(service_active, true)
WHERE head_office_name IS NULL OR service_active IS NULL;
```

## 실행 결과 확인

실행 후 "Success. No rows returned" 또는 유사한 성공 메시지가 표시되면 정상적으로 완료된 것입니다.

## 주의사항

- 기존 데이터는 자동으로 기본값이 설정됩니다.
- `IF NOT EXISTS`를 사용했으므로 중복 실행해도 안전합니다.


