# J. Security / K. Performance / L. Cost Checklist

## J. Security Threat Checklist

| # | 위협 | 대응 | 확인 방법 |
|---|------|------|-----------|
| 1 | 다른 회사 데이터 조회 (id 추측, company_id 조작) | 모든 테이블 RLS + `my_company_ids()`, 부모-자식 company_id 트리거 | 회사 2개 계정으로 교차 조회/수정 테스트 |
| 2 | 다른 회사 경로에 파일 업로드/조회 | Storage 정책이 경로의 company_id 검사 | 다른 회사 경로로 업로드 시도 → 거부 |
| 3 | 업로드 상태 위조 (파일 없이 uploaded) | `mark_asset_uploaded` 가 storage.objects 검증, 직접 UPDATE 금지 | 파일 없이 RPC 호출 → 거부 |
| 4 | Report URL 추측 | 256비트 랜덤 token, 순번/project_id URL 없음 | 코드 리뷰 |
| 5 | DB 유출로 고객 링크 유출 | token 원문 미저장, `sha256` 해시만 저장. 원문은 대표 폰 보안 저장소에만 | `report_shares` 에 원문 컬럼 없음 확인 |
| 6 | 폐기한 링크가 계속 열림 | `get_report*` 가 매 요청 status/만료 검사, 응답 `no-store` | 폐기 후 즉시 접속 → 404 |
| 7 | Report에서 고객 개인정보 노출 | 개인정보는 `project_private_details` 에만, `get_report*` 가 조회하지 않음. 공개 지역은 시/군/구까지 | 응답에 이름/전화/도로명/동호수 없음 확인 |
| 8 | 사진 위치정보 노출 | 기기에서 재인코딩으로 EXIF 제거 | 업로드된 파일 EXIF 검사 |
| 9 | Service Role Key 노출 | 서버(`lib/field`, Cron)에서만 사용, Flutter/클라이언트 번들에 없음 | 빌드 결과물과 `mobile/` 에서 key 검색 |
| 10 | 악성/대용량 파일 | Bucket MIME·크기 제한 + DB CHECK + RPC 검증 | PNG, 5MB 파일 업로드 → 거부 |
| 11 | 업로드 폭주 (앱 버그, 계정 탈취) | 현장당 사진 한도 (회사별 값 또는 기본 1000장), 사용자가 한도 수정 불가 | 한도 초과 insert → 거부, `max_photos_per_project` UPDATE → 거부 |
| 12 | SECURITY DEFINER 함수 악용 | `search_path = ''` 고정, 함수 내부 권한 검사, `get_report*` 만 anon 실행 권한 | 함수 목록과 GRANT 리뷰 |
| 13 | 로그로 민감정보 유출 | id와 오류 코드만 기록. Signed URL, token, 전화번호 금지 | 로그 코드 리뷰 |
| 14 | Private 데이터 잘못 캐시 | Report `no-store`, 앱 API는 사용자별 | 응답 헤더 확인 |
| 15 | 계정 탈취 | Supabase Auth 기본 보호, 비밀번호 정책. 향후 카카오 로그인 검토 | — |

## K. Performance Bottleneck Checklist

| # | 지점 | 위험 | 대응 |
|---|------|------|------|
| 1 | 현장 목록 | 전체 조회, N+1 | Cursor 20개, 복합 Index, 목록에 사진 개수 미표시 |
| 2 | 현장 상세 | 공간/쌍/사진 개별 조회 | 중첩 select 1회 |
| 3 | 사진 목록 | Full 이미지 로딩, 메모리 초과 | Thumbnail만, Lazy, Decode 크기 제한, 공간 단위 접기 |
| 4 | Signed URL | 목록 전체 서명 (V2의 120개 문제) | 보이는 것만 batch, 만료 전 재사용 |
| 5 | 이미지 재다운로드 | 서명 URL 변경 시 Cache miss | Cache 키를 asset_id 기준으로 |
| 6 | 촬영 흐름 | 업로드 대기로 촬영 중단 | Local Queue, 비동기 Worker |
| 7 | 현장 네트워크 | 끊김, 느린 업로드 | 파일당 150~300KB, 재시도, 동시 2개 |
| 8 | 고객 Report 첫 화면 | 고화질 동시 다운로드 | Server Component 1회 렌더, Thumbnail + lazy, 폰트/JS 최소 |
| 9 | **사진이 많은 Report (100~200장)** | Signed URL 수백 개가 HTML에 들어가 첫 로딩이 느려짐 | 첫 화면은 12쌍(24장)만, 나머지는 스크롤 시 24쌍 단위로 `get_report_media` 요청 |
| 10 | 미들웨어 | Report 요청마다 Auth/V1 처리 | `/r/` 빠른 경로 |
| 11 | RLS | 행마다 소속 함수 실행 | `(SELECT my_company_ids())` 형태, `company_members(user_id)` Index |
| 12 | 사진 한도 검사 | 업로드마다 count | `media_assets (project_id)` Partial Index, 현장당 1000장 수준에서 가벼움 |
| 13 | 사용자 10배 | DB 행은 작음. Storage 누적이 먼저 커짐 | 보관기간 정책, 사용량 측정으로 조기 감지 |

## L. Cost Checklist

**정확한 요금은 적지 않는다.** Supabase·Vercel 요금표는 자주 바뀌므로, 아래는 **사용량 추정과 비용이 발생하는 지점**만 정리한다. 실제 금액은 요금 페이지의 단가를 곱해 계산한다. 단위는 1GB = 1,000MB, 1TB = 1,000GB.

### 공통 가정

| 항목 | 값 | 비고 |
|------|----|------|
| 사진 1장 (Full) | 약 250KB | 목표 150~300KB |
| 썸네일 1장 | 약 20KB | |
| **사진 1장 저장량** | **약 270KB** | Full + 썸네일 |
| 업체 1곳 월 현장 수 | 20건 | 1인 업체 가정. 결과는 이 값에 정비례 |
| Report 조회 | 현장당 3회 | 고객, 가족 등 |
| 1회 조회 시 다운로드 | 전체 썸네일 + 사진의 10%를 Full로 확대 | 사진 1장당 평균 약 45KB (20KB + 250KB × 10%) |
| 대표 앱 조회 | 현장당 1회 분량 | 디스크 Cache로 재다운로드 최소화 |
| **현장 1건 월 Egress** | **사진 수 × 45KB × 4회** | Report 3회 + 대표 1회 |

사진 수는 **Before + After 전체 장수** 기준.

### 현장 1건 / 업체 1곳 기준

| 현장당 사진 | 현장 1건 Storage | 업체 월 신규 Storage | 업체 1년 누적 Storage | 현장 1건 Egress | 업체 월 Egress |
|------------|------------------|----------------------|-----------------------|-----------------|----------------|
| 20장 | 5.4MB | 108MB | 1.3GB | 3.6MB | 72MB |
| 50장 | 13.5MB | 270MB | 3.2GB | 9MB | 180MB |
| 100장 | 27MB | 540MB | 6.5GB | 18MB | 360MB |
| 200장 | 54MB | 1.08GB | 13GB | 36MB | 720MB |

### Storage: 규모별 증가 (누적되므로 매달 커진다)

**월 신규 Storage**

| 현장당 사진 | 100 업체 | 1,000 업체 | 10,000 업체 |
|------------|----------|------------|-------------|
| 20장 | 11GB | 108GB | 1.1TB |
| 50장 | 27GB | 270GB | 2.7TB |
| 100장 | 54GB | 540GB | 5.4TB |
| 200장 | 108GB | 1.1TB | 10.8TB |

**1년 누적 Storage** (삭제 없이 12개월)

| 현장당 사진 | 100 업체 | 1,000 업체 | 10,000 업체 |
|------------|----------|------------|-------------|
| 20장 | 130GB | 1.3TB | 13TB |
| 50장 | 324GB | 3.2TB | 32TB |
| 100장 | 648GB | 6.5TB | 65TB |
| 200장 | 1.3TB | 13TB | 130TB |

2년차에는 위 값의 2배, 3년차에는 3배가 된다. 보관기간 정책이 없으면 **Storage 비용은 매달 계단식으로 오르기만 한다.**

### Egress: 규모별 증가 (누적되지 않고 월 단위)

**월 이미지 Egress**

| 현장당 사진 | 100 업체 | 1,000 업체 | 10,000 업체 |
|------------|----------|------------|-------------|
| 20장 | 7.2GB | 72GB | 720GB |
| 50장 | 18GB | 180GB | 1.8TB |
| 100장 | 36GB | 360GB | 3.6TB |
| 200장 | 72GB | 720GB | 7.2TB |

참고: 썸네일 없이 목록에서도 Full(250KB)을 불러오면 사진 1장당 평균 다운로드가 약 45KB에서 약 250KB로 늘어나 **Egress가 약 5.5배**가 된다. 200장 × 10,000 업체 기준 월 7.2TB → 약 40TB.

### 사진 수와 무관한 항목

| 항목 | 100 업체 | 1,000 업체 | 10,000 업체 | 비고 |
|------|----------|------------|-------------|------|
| 월 현장 수 | 2천 | 2만 | 20만 | |
| 월 Report 조회 (Vercel Function 첫 요청) | 6천 | 6만 | 60만 | 사진 24장 초과 현장은 스크롤 시 추가 요청 발생 |
| 월 DB 행 증가 | 사진 수에 비례 (현장 1건 = 1 + 공간 + 쌍 + 사진 수) | | | 행이 작아 DB 용량은 Storage의 1% 미만 |

200장(100쌍) 현장이면 첫 화면 12쌍 이후 남은 88쌍을 24쌍씩 불러오므로 Report 1회에 최대 4번의 추가 요청이 생긴다. 단, 고객이 끝까지 스크롤할 때만 발생한다.

### 비용 발생 지점과 대응

| 순위 | 비용 지점 | 특징 | 대응 |
|------|-----------|------|------|
| 1 | **Storage 누적** | 삭제하지 않으면 계속 증가. 사진 수 시나리오에 정비례 | 사진 크기 목표 준수, Soft Delete 후 실제 삭제, **보관기간 정책**, 대규모 시 Object Storage 이전 |
| 2 | **이미지 Egress** | Report·앱 조회에 비례. 월 단위 | 썸네일 우선, asset_id 기준 Cache, Full은 탭할 때만, Report 페이지 단위 로딩 |
| 3 | Vercel Function | Report 조회 수에 비례 | 이미지 트래픽은 Vercel 미경유. HTML과 경로 목록만 처리 |
| 4 | Supabase Compute / DB | RLS, RPC 호출 수에 비례 | Index, 중첩 select, N+1 금지 |
| 5 | Image Transformation | **사용하지 않음** | 썸네일을 기기에서 생성 |
| 6 | Vercel Image Optimization | **사용하지 않음** | Report 이미지는 `<img>` + Signed URL 직접 |
| 7 | API Request | 업로드 1장당 insert + 파일 2개 + RPC = 요청 4회 | 규모가 커진 뒤 묶음 처리 검토 |

### 규모별 판단 포인트

- **100 업체**: 모든 시나리오에서 현재 구조로 충분. 월 1회 사용량 Query로 실제 현장당 사진 수와 평균 크기를 측정해 4개 시나리오 중 어디에 가까운지 확인.
- **1,000 업체**: 50장 이상이면 1년 누적이 수 TB. **보관기간 정책을 결정해야 하는 시점.** 예: 완료 후 N개월이 지나면 Full을 지우고 썸네일과 대표가 고른 사진만 남기기. 결정은 그때 실제 데이터로.
- **10,000 업체**: Storage(연 13~130TB)와 Egress(월 0.7~7TB)가 비용 대부분. Egress 과금 구조가 다른 Object Storage(Cloudflare R2 등) 이전 검토. Storage 추상화(`provider`, `bucket`, `storage_path`) 덕분에 Domain 구조 변경 없이 이전 가능.

### 사용량 측정 (63번)

별도 테이블 없이 SQL로 계산한다.

```sql
-- 업체별 월 현장 수, 사진 수, 현장당 평균 사진 수, 평균 크기, 신규 Storage
SELECT p.company_id,
       date_trunc('month', m.created_at)                              AS month,
       count(DISTINCT p.id)                                           AS projects,
       count(m.id)                                                    AS photos,
       round(count(m.id)::numeric / nullif(count(DISTINCT p.id), 0))  AS photos_per_project,
       avg(m.size_bytes)::int                                         AS avg_full_bytes,
       sum(m.size_bytes + m.thumb_size_bytes)                         AS new_bytes
FROM field.media_assets m
JOIN field.projects p ON p.id = m.project_id
WHERE m.status = 'uploaded'
GROUP BY 1, 2;

-- Report 조회 수
SELECT company_id, sum(view_count) FROM field.report_shares GROUP BY 1;
```

이미지 다운로드량은 Supabase 대시보드의 Egress(Cached/Uncached) 지표로 확인한다 (64번). Vercel은 Function 실행 수와 Data Transfer를 월 1회 확인한다.
