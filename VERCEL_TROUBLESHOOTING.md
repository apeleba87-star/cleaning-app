# Vercel 배포 문제 해결 가이드

## "Something went wrong" 에러 해결

### 1. 환경 변수 확인 및 설정

#### Vercel 대시보드에서:
1. 프로젝트 선택 → **Settings** → **Environment Variables**
2. 다음 변수들이 있는지 확인:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 각 변수의 **Environment**에서 다음을 모두 선택했는지 확인:
   - ☑ Production
   - ☑ Preview  
   - ☑ Development

#### 환경 변수 값:
```
NEXT_PUBLIC_SUPABASE_URL=https://vmhjrwjqifzggczrfwrxy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtaGhrandxaWZ6Z2N6cmZyd3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDQ2ODQsImV4cCI6MjA4MDgyMDY4NH0.qY8FCFyvVDS1nTBDjJ_T9Ibaf8TbEDx-XKsA-QxdY38
```

### 2. 환경 변수 설정 후 재배포 필수!

**중요**: 환경 변수를 추가/수정한 후에는 **반드시 재배포**해야 합니다!

#### 방법 1: 자동 재배포
- 환경 변수 저장 후 "Redeploy" 버튼이 나타나면 클릭
- 또는 최신 커밋을 다시 푸시하여 트리거

#### 방법 2: 수동 재배포
1. **Deployments** 탭으로 이동
2. 최신 배포 우측의 **"⋯"** 메뉴 클릭
3. **"Redeploy"** 선택
4. "Use existing Build Cache" 옵션을 **해제**하고 배포

### 3. 브라우저에서 에러 확인

1. 배포된 URL 접속
2. **F12** 또는 **우클릭 → 검사**로 개발자 도구 열기
3. **Console** 탭에서 에러 메시지 확인
4. **Network** 탭에서 실패한 요청 확인

#### 예상 에러 메시지:
```
Missing Supabase environment variables. 
Please check your .env.local file.
```

이 메시지가 보이면 환경 변수가 설정되지 않았거나 적용되지 않은 것입니다.

### 4. 배포 로그 확인

1. Vercel 대시보드 → **Deployments** 탭
2. 최신 배포 클릭
3. **Build Logs**에서 빌드 성공 여부 확인
4. **Runtime Logs**에서 런타임 에러 확인

### 5. 테스트 페이지 접속

환경 변수가 제대로 설정되었는지 확인:
```
https://[your-vercel-url]/test-connection
```

이 페이지는 Supabase 연결 상태와 환경 변수 설정 여부를 보여줍니다.

## 문제가 계속되면

1. **Vercel 캐시 삭제**: 프로젝트 설정에서 캐시 정리
2. **새 프로젝트로 재배포**: 기존 프로젝트 삭제 후 새로 생성
3. **Vercel 지원팀 문의**: https://vercel.com/support

