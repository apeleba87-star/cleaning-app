# 견적 진단기 · 카카오톡 공유 설정 가이드

카카오톡 링크로 들어온 사용자가 **「공유하고 업계 평균 단가 보기」**를 누를 때, 카카오톡 공유 창이 뜨도록 하려면 Kakao Developers에서 앱을 만들고 JavaScript 키를 발급받아야 합니다.

---

## 1단계: Kakao Developers 로그인

1. 브라우저에서 **https://developers.kakao.com** 접속
2. **카카오 계정**으로 로그인 (카카오톡/카카오메일 계정 사용)

---

## 2단계: 앱 만들기 (이미 앱이 있으면 3단계로)

1. 로그인 후 **https://developers.kakao.com/console/app** 로 이동
2. **「애플리케이션 추가하기」** 버튼 클릭
3. **앱 이름** 입력 (예: `무플`, `무플 견적 진단기`)
4. **「저장」** 클릭  
   → 앱이 생성되고 **앱 키** 화면으로 이동합니다.

---

## 3단계: JavaScript 플랫폼 추가

1. 왼쪽 메뉴에서 **「앱 설정」** → **「플랫폼」** 클릭
2. **「Web」** 플랫폼이 있는지 확인  
   - 없으면 **「플랫폼 추가」** → **「Web」** 선택
3. **「Web」** 행의 **「사이트 도메인」** 입력란에 아래처럼 **실제 서비스 주소**를 넣습니다.

   | 환경 | 입력 예시 |
   |------|-----------|
   | 로컬 테스트 | `http://localhost:3000` |
   | 운영 사이트 | `https://www.mupl.co.kr` |
   | Vercel 기본 URL | `https://프로젝트이름.vercel.app` |

4. **여러 개** 쓰려면 **「추가」**로 줄을 더 만들어 각각 입력 (localhost, 운영 도메인, Vercel URL 등)
5. **「저장」** 클릭

> ⚠️ **주의**: 여기 넣은 도메인에서만 카카오 SDK가 동작합니다. `www.mupl.co.kr`만 쓸 경우 `https://www.mupl.co.kr`를 반드시 추가하세요.

---

## 4단계: JavaScript 키 복사

1. 왼쪽 메뉴에서 **「앱 설정」** → **「앱 키」** 클릭
2. **플랫폼**이 **JavaScript**인 행 찾기  
   - 없으면 **플랫폼** 드롭다운에서 **「JavaScript」** 선택
3. **JavaScript 키** 옆 **「복사」** 버튼 클릭  
   - 형식 예: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` (영문·숫자 조합)

이 값이 곧 **`NEXT_PUBLIC_KAKAO_JS_KEY`** 에 넣을 값입니다.

---

## 5단계: 카카오톡 공유 권한 확인 (선택)

1. 왼쪽 메뉴 **「제품 설정」** → **「카카오톡 채널」** 또는 **「카카오 로그인」** 등이 있는지 확인
2. **「카카오톡 공유」**는 별도 제품 신청 없이 **JavaScript 키 + 사이트 도메인**만 맞으면 사용 가능합니다.  
   (다른 제품은 이 가이드 범위 밖입니다.)

---

## 6단계: 프로젝트에 환경 변수 넣기

### 로컬 개발 (.env.local)

1. 프로젝트 **루트 폴더**에 `.env.local` 파일이 있는지 확인 (없으면 새로 만듦)
2. 아래 한 줄 추가 (값은 4단계에서 복사한 **JavaScript 키**로 교체):

   ```env
   NEXT_PUBLIC_KAKAO_JS_KEY=여기에_복사한_JavaScript_키_붙여넣기
   ```

   예시:

   ```env
   NEXT_PUBLIC_KAKAO_JS_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

3. 저장 후 **개발 서버 재시작**  
   - 터미널에서 서버 중지(Ctrl+C) 후 `npm run dev` 다시 실행

### Vercel 배포

1. **https://vercel.com** 접속 → 해당 프로젝트 선택
2. 상단 **「Settings」** → 왼쪽 **「Environment Variables」** 클릭
3. **「Add New」** (또는 「Add」) 클릭
4. 입력:
   - **Name**: `NEXT_PUBLIC_KAKAO_JS_KEY` (이름 정확히)
   - **Value**: 4단계에서 복사한 JavaScript 키
   - **Environment**: Production, Preview, Development **전부 체크** 권장
5. **「Save」** 클릭
6. **재배포** 한 번 실행 (Deployments → 맨 위 배포 옆 ⋮ → Redeploy)

---

## 7단계: 동작 확인

1. **카카오 Developers 사이트 도메인**에 넣은 주소로만 접속 (예: `https://www.mupl.co.kr/estimate`)
2. **카카오톡**으로 위 주소를 본인에게 보내고, 그 링크를 눌러 **인앱 브라우저**로 열기
3. 견적 입력 후 **「내 견적 분석하기」** → **「공유하고 업계 평균 단가 보기」** 클릭
4. **카카오톡 공유 창**(친구/대화 선택)이 뜨면 설정이 정상 동작한 것입니다.  
   공유 완료 시 업계 평균 단가 등 결과가 열립니다.

---

## 자주 묻는 것

**Q. JavaScript 키가 앱 키 목록에 안 보여요.**  
→ **앱 키** 페이지 상단에서 플랫폼을 **「JavaScript」**로 바꾼 뒤, 해당 키를 복사하세요.

**Q. 공유 버튼을 눌러도 아무 반응이 없어요.**  
→ ① `.env.local`에 `NEXT_PUBLIC_KAKAO_JS_KEY`가 있는지, ② **사이트 도메인**에 현재 접속한 URL(예: `https://www.mupl.co.kr`)이 들어가 있는지 확인하세요. 도메인은 **프로토콜 포함**해서 넣어야 합니다.

**Q. 로컬에서는 되는데 배포 사이트에서는 안 돼요.**  
→ Vercel에 `NEXT_PUBLIC_KAKAO_JS_KEY`를 넣었는지, 그리고 Kakao Developers **사이트 도메인**에 배포 URL(예: `https://xxx.vercel.app`)을 추가했는지 확인한 뒤 재배포하세요.

**Q. 이미 카카오 로그인용 앱이 있는데, 그 앱을 써도 되나요?**  
→ 됩니다. 같은 앱의 **앱 키** → **JavaScript 키**를 쓰고, **플랫폼**에 **Web**을 추가한 뒤 **사이트 도메인**만 위처럼 넣으면 됩니다.

---

## 요약 체크리스트

- [ ] Kakao Developers에서 앱 생성 (또는 기존 앱 선택)
- [ ] **플랫폼** → **Web** 추가 후 **사이트 도메인**에 `https://www.mupl.co.kr`, `http://localhost:3000` 등 등록
- [ ] **앱 키**에서 **JavaScript 키** 복사
- [ ] `.env.local`에 `NEXT_PUBLIC_KAKAO_JS_KEY=복사한키` 추가 후 서버 재시작
- [ ] Vercel이면 Environment Variables에 동일 키 추가 후 재배포
- [ ] 카카오톡으로 링크 보내서 인앱에서 「공유하고 업계 평균 단가 보기」로 공유 창 뜨는지 확인
