# Vercel 배포 가이드

## 배포 전 준비사항

### 1. 환경 변수 확인
Vercel에 다음 환경 변수를 설정해야 합니다:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anon Key

### 2. 배포 방법

#### 방법 1: Vercel CLI 사용 (터미널)
```bash
npx vercel
```

#### 방법 2: Vercel 웹 대시보드 사용 (권장)
1. https://vercel.com 접속 및 로그인
2. "Add New..." → "Project" 클릭
3. GitHub 리포지토리 연결: `apeleba87-star/cleaning-app`
4. 환경 변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`: [Supabase URL]
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: [Supabase Anon Key]
5. "Deploy" 클릭

### 3. 프로덕션 배포
```bash
npx vercel --prod
```

## 환경 변수 설정 방법

### Vercel 대시보드에서:
1. 프로젝트 선택 → Settings → Environment Variables
2. 각 변수 추가 (Production, Preview, Development 모두 선택 가능)

### CLI에서:
```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 참고사항
- Vercel은 자동으로 Next.js를 감지하여 빌드합니다
- 환경 변수는 빌드 시간에 주입됩니다
- `NEXT_PUBLIC_` 접두사가 있는 변수만 클라이언트에서 접근 가능합니다

