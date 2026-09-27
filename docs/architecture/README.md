# 무플 현장 서비스 (Field) — 설계 문서

상태: **승인 완료, MVP 구현 중**

## MVP 범위

청소업체 대표 → 현장(Project) 등록 → 공간(Area) 추가 → Before/After 사진(PhotoPair) 촬영 → 고객에게 Report 링크 공유

MVP에 넣지 않는 것: 직원 계정, 포트폴리오 공개, 소비자 탐색/검색, 문의/견적/계약/결제/리뷰, 요금제, AI 콘텐츠, 업체 웹 관리 화면.

## 확정된 결정

| 항목 | 결정 |
|------|------|
| 저장소 | 이 저장소 (`cleaning-management-app`) |
| 모바일 | Flutter, `mobile/` 폴더 |
| 고객 Report 웹 | 기존 Next.js 앱, `/r/[token]`, 사진은 페이지 단위 로드 |
| Supabase | 기존 프로젝트 공유, 새 Postgres schema `field` 로 분리 |
| 계정 | `auth.users`만 V1과 공유. 회사/멤버 테이블은 `field` 안에 새로 만든다 |
| 역할 | MVP는 업체 대표(owner) 1인. 단 멤버 테이블 구조는 처음부터 둔다 |
| 핵심 계층 | `Company → Project → Area → PhotoPair → MediaAsset` (변경 없음) |
| 서비스 종류 | 참조 테이블 `service_types(code)` + FK. ENUM, 자유 텍스트 사용 안 함 |
| 지역 | 법정동코드 기준 시/도(2자리)·시/군/구(5자리) 코드 + 이름 스냅샷을 Project에. 상세주소는 비공개 테이블 |
| 사진 한도 | 회사별 값 또는 시스템 기본 1000장. 판단은 함수 1개 (향후 요금제 확장 지점) |
| Report token | DB에는 sha256 해시만. 원문은 대표 폰 보안 저장소에만 |
| 작업 규모 | MVP 컬럼 없음. 추가 형식(`floor_area`, `floor_area_unit`)만 확정 |
| V1 코드 | 건드리지 않는다. `middleware.ts`에 `/r/` 빠른 경로 추가만 예외 |

## 문서 구성

| 문서 | 내용 |
|------|------|
| [01-architecture.md](01-architecture.md) | A. Architecture Diagram, G. Customer Report 접근, H. Public Portfolio 확장 |
| [02-data-model.md](02-data-model.md) | B. ERD, C. Table Schema, D. RLS 설계, I. 주요 Query와 Index |
| [03-media-pipeline.md](03-media-pipeline.md) | E. Storage 구조, F. 사진 Pipeline |
| [04-checklists.md](04-checklists.md) | J. Security, K. Performance, L. Cost Checklist (사진 20/50/100/200장 시나리오) |
| [05-design-review.md](05-design-review.md) | 1차 검토 8개 항목의 결론과 근거 |

## 구현 위치

| 부분 | 경로 |
|------|------|
| DB (schema, RLS, RPC, Storage 정책) | `migrations/field_001_initial.sql` |
| 고객 Report | `app/r/[token]/route.ts`, `app/r/[token]/media/route.ts`, `lib/field/*` |
| 모바일 앱 | `mobile/` |
| 테스트 | `npm run test:field` (SQL: PGlite, Report HTML), `mobile/`: `dart test test/logic_test.dart` |

## 배포 전 준비 (1회)

1. Supabase SQL Editor 에서 `migrations/field_001_initial.sql` 실행
2. Supabase Dashboard → Project Settings → Data API → Exposed schemas 에 `field` 추가
3. Vercel 환경변수 확인: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (기존 값 그대로 사용)

## 모바일 실행

```powershell
cd mobile
flutter run `
  --dart-define=SUPABASE_URL=https://vmhhkjwqifzgczrfrwxy.supabase.co `
  --dart-define=SUPABASE_ANON_KEY=<anon key> `
  --dart-define=REPORT_BASE_URL=<Report 를 여는 웹 주소, 끝에 / 없음>
```

- Service Role Key 는 앱에 넣지 않는다.
- Windows 사용자 폴더 이름이 한글이면 Flutter 셰이더 컴파일이 실패한다. `PUB_CACHE` 를 영문 경로(예: `C:\proj\pub-cache`)로 지정한 뒤 `flutter pub get` 을 다시 실행한다.

## 다음 단계 (MVP 이후)

- 정리 Cron (`app/api/cron/field-cleanup`): pending 7일, 삭제 30일 경과 파일을 Storage API 로 삭제

## 원칙

`.cursor/rules/mupl-*.mdc` 에 요구사항 41~70번을 Rule로 등록했다. 모든 설계와 코드는 이를 따른다.
