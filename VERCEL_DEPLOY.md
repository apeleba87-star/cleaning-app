# Vercel 배포 가이드

## 1. GitHub 저장소 확인
먼저 프로젝트가 GitHub에 푸시되어 있는지 확인하세요.

## 2. Vercel 계정 생성 및 로그인
1. [Vercel](https://vercel.com)에 접속
2. GitHub 계정으로 로그인

## 3. 프로젝트 배포
1. Vercel 대시보드에서 "Add New Project" 클릭
2. GitHub 저장소 선택
3. 프로젝트 설정:
   - **Framework Preset**: Next.js (자동 감지됨)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (자동 감지됨)
   - **Output Directory**: `.next` (자동 감지됨)
   - **Install Command**: `npm install` (자동 감지됨)

## 4. 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수를 추가하세요:

### 필수 환경 변수:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (서버 사이드 전용, **중요**)

### ⚠️ 중요: SUPABASE_SERVICE_ROLE_KEY 설정
**완납 처리 및 기타 서버 사이드 기능이 작동하려면 반드시 설정해야 합니다.**

### 설정 방법:
1. 프로젝트 설정 → Environment Variables
2. 각 변수 추가:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: (Supabase 프로젝트의 URL)
   - Environment: Production, Preview, Development 모두 선택
3. 동일하게 다음 변수들 추가:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (Supabase 대시보드 → Settings → API → service_role key)

### 환경 변수 확인 방법:
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 모든 환경 변수가 Production, Preview, Development에 설정되어 있는지 확인
3. 변수 이름에 오타가 없는지 확인 (대소문자 구분)

## 5. 배포 실행
1. "Deploy" 버튼 클릭
2. 배포 완료까지 대기 (약 2-3분)
3. 배포된 URL 확인

## 6. 도메인 설정 (선택사항)
1. 프로젝트 설정 → Domains
2. 원하는 도메인 추가

## 7. 자동 배포 설정
- 기본적으로 GitHub에 푸시하면 자동으로 배포됩니다
- `main` 또는 `master` 브랜치 → Production 배포
- 다른 브랜치 → Preview 배포

## 문제 해결

### 빌드 에러가 발생하는 경우:
1. 로컬에서 `npm run build` 실행하여 에러 확인
2. Vercel 배포 로그에서 에러 메시지 확인
3. 환경 변수가 제대로 설정되었는지 확인

### 환경 변수 관련 에러:
- 모든 환경 변수가 Production, Preview, Development에 모두 설정되어 있는지 확인
- 변수 이름에 오타가 없는지 확인 (대소문자 구분)
- **완납 처리 오류 발생 시**: `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인
  - Vercel 로그에서 "Server configuration error: Service role key is required" 메시지 확인
  - 환경 변수 재설정 후 재배포 필요

## 참고사항
- Vercel은 Next.js를 완벽하게 지원합니다
- Serverless Functions는 자동으로 설정됩니다
- 이미지 최적화도 자동으로 처리됩니다




