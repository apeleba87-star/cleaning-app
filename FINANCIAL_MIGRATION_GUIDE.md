# 재무 관리 스키마 마이그레이션 가이드

## 개요

이 마이그레이션은 업체관리자 앱에 매출/수금/미수금/지출/인건비 관리 기능을 추가하기 위한 데이터베이스 스키마 확장입니다.

## 마이그레이션 파일

- `add-financial-management-schema.sql`: 전체 스키마 마이그레이션 파일

## 실행 방법

### 1. Supabase Dashboard에서 실행 (권장)

1. Supabase Dashboard 접속
2. SQL Editor 메뉴 선택
3. `add-financial-management-schema.sql` 파일 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭
5. 에러가 없는지 확인

### 2. Supabase CLI 사용 (선택)

```bash
# Supabase CLI가 설치되어 있는 경우
supabase db push
```

## 마이그레이션 내용

### 1. 기존 테이블 확장

#### stores 테이블
- `payment_method`: 결제방식 (계좌이체/카드/현금/기타)
- `settlement_cycle`: 정산주기 (월1회/격주/주1회/건별)
- `payment_day`: 매월 결제일 (1-31)
- `tax_invoice_required`: 세금계산서 발행 여부
- `unpaid_tracking_enabled`: 미수금 추적 여부
- `billing_memo`: 청구서/세금계산서 발행 메모
- `special_notes`: 운영 특이사항
- `access_info`: 출입 정보
- `is_active`: 활성 상태 플래그

#### users 테이블
- `pay_type`: 급여 형태 (월급/일당/도급)
- `pay_amount`: 급여 금액 (단일 필드)
- `salary_payment_method`: 급여 지급 방식
- `bank_name`: 은행명
- `account_number`: 계좌번호
- `hire_date`: 입사일
- `resignation_date`: 퇴사일
- `employment_type`: 고용 형태
- `is_active`: 활성 상태 플래그

### 2. 새 테이블 생성

#### store_files
매장 문서 통합 관리 (서비스 계약서, 도급 계약서, 기타 문서)

#### store_contacts
매장 담당자 정보 (담당자1, 담당자2, 결제 담당자)

#### user_files
직원 문서 관리 (근로계약서, 도급계약서)

#### user_sensitive
민감 정보 분리 저장 (주민등록번호 등)

#### revenues
매출/청구 정보

#### receipts
수금 히스토리

#### expenses
비용 통합 관리

#### payrolls
인건비 관리

### 3. 주요 기능

#### 수금 초과 방지
- `receipts` 테이블에 수금액이 `revenues.amount`를 초과하지 않도록 DB 레벨 검증
- 트리거를 통한 자동 검증

#### 미수금 자동 계산
- `calculate_unpaid_amount(store_id, period)`: 특정 매장의 미수금 계산
- `calculate_total_unpaid_amount(company_id, period)`: 전체/기간별 미수금 계산

#### company_id 자동 설정
- 모든 재무 테이블에 `company_id` 자동 설정 트리거
- 데이터 무결성 보장

#### RLS (Row Level Security)
- 업체관리자는 자신의 회사 데이터만 조회 가능
- 민감 정보는 관리자만 접근 가능

## 마이그레이션 후 확인 사항

### 1. 테이블 생성 확인

```sql
-- 새 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'store_files', 'store_contacts', 'user_files', 
    'user_sensitive', 'revenues', 'receipts', 
    'expenses', 'payrolls'
  );
```

### 2. 컬럼 추가 확인

```sql
-- stores 테이블 확장 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stores' 
  AND column_name IN (
    'payment_method', 'settlement_cycle', 'payment_day',
    'tax_invoice_required', 'unpaid_tracking_enabled',
    'billing_memo', 'special_notes', 'access_info', 'is_active'
  );

-- users 테이블 확장 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN (
    'pay_type', 'pay_amount', 'salary_payment_method',
    'bank_name', 'account_number', 'hire_date',
    'resignation_date', 'employment_type', 'is_active'
  );
```

### 3. 트리거 확인

```sql
-- 트리거 목록 확인
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%receipt%' OR trigger_name LIKE '%company_id%';
```

### 4. 함수 확인

```sql
-- 함수 목록 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'validate_receipt_amount',
    'update_revenue_status',
    'calculate_unpaid_amount',
    'calculate_total_unpaid_amount'
  );
```

## 주의사항

### 1. 기존 데이터 보존
- 기존 테이블에 데이터가 있어도 안전하게 마이그레이션됩니다
- `IF NOT EXISTS` 및 `ADD COLUMN IF NOT EXISTS` 사용으로 중복 실행 가능

### 2. 기존 앱 호환성
- 기존 앱 기능은 영향받지 않습니다
- 새로 추가된 필드는 모두 nullable이거나 기본값이 설정되어 있습니다

### 3. RLS 정책
- 기존 RLS 정책과 충돌하지 않도록 새 정책만 추가됩니다
- 기존 정책은 `DROP POLICY IF EXISTS`로 안전하게 처리됩니다

## 롤백 방법

마이그레이션을 롤백해야 하는 경우:

```sql
-- 주의: 이 작업은 데이터 손실을 초래할 수 있습니다
-- 백업 후 실행하세요

-- 새 테이블 삭제
DROP TABLE IF EXISTS public.payrolls CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.revenues CASCADE;
DROP TABLE IF EXISTS public.user_sensitive CASCADE;
DROP TABLE IF EXISTS public.user_files CASCADE;
DROP TABLE IF EXISTS public.store_contacts CASCADE;
DROP TABLE IF EXISTS public.store_files CASCADE;

-- stores 테이블 확장 컬럼 삭제 (주의: 데이터 손실)
ALTER TABLE public.stores 
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS settlement_cycle,
DROP COLUMN IF EXISTS payment_day,
DROP COLUMN IF EXISTS tax_invoice_required,
DROP COLUMN IF EXISTS unpaid_tracking_enabled,
DROP COLUMN IF EXISTS billing_memo,
DROP COLUMN IF EXISTS special_notes,
DROP COLUMN IF EXISTS access_info,
DROP COLUMN IF EXISTS is_active;

-- users 테이블 확장 컬럼 삭제 (주의: 데이터 손실)
ALTER TABLE public.users 
DROP COLUMN IF EXISTS pay_type,
DROP COLUMN IF EXISTS pay_amount,
DROP COLUMN IF EXISTS salary_payment_method,
DROP COLUMN IF EXISTS bank_name,
DROP COLUMN IF EXISTS account_number,
DROP COLUMN IF EXISTS hire_date,
DROP COLUMN IF EXISTS resignation_date,
DROP COLUMN IF EXISTS employment_type,
DROP COLUMN IF EXISTS is_active;
```

## 다음 단계

마이그레이션 완료 후:

1. **TypeScript 타입 업데이트**: `types/db.ts` 파일이 이미 업데이트되었습니다
2. **UI 구현**: 매장 관리 폼과 직원 관리 폼에 새 필드 추가
3. **API 구현**: 재무 데이터 CRUD API 엔드포인트 생성
4. **대시보드 구현**: 매출/수금/미수금/지출/인건비 지표 표시

## 문의

마이그레이션 중 문제가 발생하면:
1. Supabase Dashboard의 로그 확인
2. SQL 에러 메시지 확인
3. 기존 데이터 백업 확인

