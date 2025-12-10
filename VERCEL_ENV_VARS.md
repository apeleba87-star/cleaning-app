# Vercel 환경 변수 설정 가이드

## Vercel 웹 대시보드에서 배포하기 (권장)

### 1단계: Vercel에 접속
1. https://vercel.com 접속
2. GitHub 계정으로 로그인 (또는 계정 생성)

### 2단계: 새 프로젝트 생성
1. "Add New..." 버튼 클릭
2. "Project" 선택
3. GitHub 리포지토리에서 `apeleba87-star/cleaning-app` 선택
4. "Import" 클릭

### 3단계: 환경 변수 설정 (중요!)
프로젝트 설정 화면에서 "Environment Variables" 섹션을 찾아 다음 변수를 추가하세요:

#### 변수 1: NEXT_PUBLIC_SUPABASE_URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://vmhjrwjqifzggczrfwrxy.supabase.co`
- **Environment**: Production, Preview, Development 모두 선택

#### 변수 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtaGhrandxaWZ6Z2N6cmZyd3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDQ2ODQsImV4cCI6MjA4MDgyMDY4NH0.qY8FCFyvVDS1nTBDjJ_T9Ibaf8TbEDx-XKsA-QxdY38`
- **Environment**: Production, Preview, Development 모두 선택

### 4단계: 배포
1. "Deploy" 버튼 클릭
2. 빌드가 완료될 때까지 대기 (약 2-3분)
3. 배포 완료 후 URL 확인 (예: `cleaning-app-xxx.vercel.app`)

## CLI로 배포하는 방법

### 1. 로그인
```bash
npx vercel login
```
브라우저가 열리면 인증 완료

### 2. 환경 변수 설정
```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
# 값 입력: https://vmhjrwjqifzggczrfwrxy.supabase.co

npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development
# 값 입력: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtaGhrandxaWZ6Z2N6cmZyd3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDQ2ODQsImV4cCI6MjA4MDgyMDY4NH0.qY8FCFyvVDS1nTBDjJ_T9Ibaf8TbEDx-XKsA-QxdY38
```

### 3. 배포
```bash
npx vercel --prod
```

## 배포 후 확인사항

1. 배포된 URL로 접속 테스트
2. 로그인 기능 테스트
3. Supabase 연결 확인 (`/test-connection` 페이지)
4. 콘솔 에러 확인

## 문제 해결

- **환경 변수가 적용되지 않는 경우**: 
  - 새 배포를 트리거해야 할 수 있습니다
  - Settings → Environment Variables에서 변수가 올바르게 설정되었는지 확인

- **빌드 에러가 발생하는 경우**:
  - Vercel 대시보드의 "Deployments" 탭에서 로그 확인
  - 환경 변수가 올바르게 설정되었는지 확인

