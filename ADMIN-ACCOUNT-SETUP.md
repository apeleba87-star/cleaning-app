# 관리자 계정 생성 가이드

## 방법 1: Supabase 대시보드에서 생성 (권장)

### 1단계: Authentication에서 사용자 생성

1. Supabase 대시보드 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** 클릭
4. **Users** 탭 선택
5. **Add user** 버튼 클릭
6. 다음 정보 입력:
   - **Email**: `apeleba@naver.com`
   - **Password**: `!!hsplyh0506`
   - **Auto Confirm User**: 체크 (자동 확인)
7. **Create user** 클릭

### 2단계: public.users 테이블에 역할 추가

1. 좌측 메뉴에서 **SQL Editor** 클릭
2. `create-admin-user.sql` 파일의 내용을 복사하여 붙여넣기
3. **Run** 클릭
4. 성공 메시지 확인

---

## 방법 2: SQL로 직접 생성

만약 위 방법이 작동하지 않으면, 아래 SQL을 수정하여 실행하세요:

```sql
-- 1. auth.users에 사용자 생성 (이미 생성되어 있다면 생략)
-- 주의: 비밀번호는 해시되어야 하므로 이 방법은 권장하지 않습니다.

-- 2. Authentication UI에서 사용자를 생성한 후 아래 SQL 실행
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = 'apeleba@naver.com';
    
    IF user_uuid IS NOT NULL THEN
        INSERT INTO public.users (id, role, name, phone)
        VALUES (user_uuid, 'admin', '최고운영자', NULL)
        ON CONFLICT (id) 
        DO UPDATE SET 
            role = 'admin',
            name = '최고운영자',
            updated_at = NOW() AT TIME ZONE 'utc';
        
        RAISE NOTICE 'Admin user created/updated successfully!';
    ELSE
        RAISE EXCEPTION 'User not found. Please create the user in Authentication first.';
    END IF;
END $$;
```

---

## 확인 방법

계정이 제대로 생성되었는지 확인:

```sql
SELECT id, email, role, name, created_at
FROM public.users
WHERE email = 'apeleba@naver.com';
```

결과에서 `role`이 `admin`으로 표시되어야 합니다.

---

## 로그인 테스트

1. 앱의 로그인 페이지 접속: `http://localhost:3000/login`
2. 다음 정보로 로그인:
   - **이메일**: `apeleba@naver.com`
   - **비밀번호**: `!!hsplyh0506`
3. 로그인 성공 시 관리자 대시보드로 리다이렉트됩니다.



