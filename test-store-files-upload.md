# store_files 업로드 문제 해결 가이드

## 1. SQL 마이그레이션 실행 확인

Supabase Dashboard → SQL Editor에서 다음 SQL을 실행했는지 확인하세요:

```sql
-- store_files RLS 정책 추가
ALTER TABLE public.store_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can insert their company store files" ON public.store_files;
DROP POLICY IF EXISTS "Business owners can delete their company store files" ON public.store_files;

CREATE POLICY "Business owners can insert their company store files"
  ON public.store_files
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = auth.uid()
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );

CREATE POLICY "Business owners can delete their company store files"
  ON public.store_files
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = auth.uid()
        AND role IN ('business_owner', 'platform_admin')
        AND (is_active = true OR is_active IS NULL)
    )
  );
```

## 2. 환경 변수 확인

`.env.local` 파일에 다음이 있는지 확인:
- `SUPABASE_SERVICE_ROLE_KEY` (전체 키가 있는지 확인)
- `NEXT_PUBLIC_SUPABASE_URL`

## 3. 개발 서버 재시작

환경 변수를 수정했다면 반드시 재시작:
```bash
# 터미널에서 Ctrl+C로 중지 후
npm run dev
```

## 4. 서버 로그 확인

업로드 시도 시 터미널에 다음 로그가 출력되는지 확인:
- "Inserting store file: ..."
- "Store file insert error: ..." (오류 발생 시)

## 5. Supabase 정책 확인

Supabase Dashboard → Authentication → Policies에서 `store_files` 테이블의 정책이 있는지 확인

