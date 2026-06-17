# MUPL V2

V1과 **로그인(Auth)만 공유**하고, 운영 데이터는 `v2_*` 테이블만 사용합니다.

## 시작

1. Supabase SQL Editor에서 순서대로 실행:
   - `migrations/v2_initial_schema.sql`
   - (선택) `migrations/v2_sample_ads.sql`

2. 로그인 후 **무플 V2** 진입: `/login?next=/v2`

3. 최초 업체관리자: `/v2/onboarding`에서 회사 등록

## 라우트

| 경로 | 대상 |
|------|------|
| `/v2/work` | 직원 앱 |
| `/v2/manage` | 업체 관리자 |
| `/v2-store-manager` | 매장 관리자 |

## API

`/api/v2/*` — V1 테이블 미사용

## 광고

무료 버전: `V2AdSlot` + `forcedDelaySeconds`로 의도적 대기 후 노출.  
캠페인 관리: `v2_ad_*` 테이블 (플랫폼 SQL 또는 추후 CMS).

## V1

`/business/*` 등 기존 경로는 동결. V2 미들웨어는 V1 DB 조회·trial·session PATCH 생략.
