# ngrok 모바일 테스트 가이드

## 🎯 ngrok이란?
ngrok은 로컬 서버를 인터넷에 안전하게 노출시켜 외부(모바일 기기 포함)에서 접근할 수 있게 해주는 터널링 서비스입니다.
- ✅ **HTTPS 자동 제공** (카메라 접근에 필수!)
- ✅ **방화벽 설정 불필요**
- ✅ **다른 네트워크에서도 접근 가능**

## 📋 사전 준비

### 1단계: ngrok 계정 생성
1. [ngrok 공식 사이트](https://ngrok.com/) 접속
2. **"Sign up"** 또는 **"Get started for free"** 클릭
3. 이메일로 가입 (무료 계정으로 충분)

### 2단계: ngrok 설치

**Windows (PowerShell):**
```powershell
# Chocolatey 사용 (권장)
choco install ngrok

# 또는 직접 다운로드
# https://ngrok.com/download 에서 다운로드
```

**수동 설치:**
1. [ngrok 다운로드 페이지](https://ngrok.com/download) 접속
2. Windows 버전 다운로드
3. 압축 해제 후 `ngrok.exe`를 PATH에 추가하거나 프로젝트 폴더에 복사

### 3단계: ngrok 인증 토큰 설정
1. [ngrok Dashboard](https://dashboard.ngrok.com/get-started/your-authtoken) 접속
2. **"Your Authtoken"** 복사
3. PowerShell에서 실행:
```powershell
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## 🚀 사용 방법

### 방법 1: 자동 스크립트 사용 (권장)

**`start-ngrok.bat` 파일 실행:**
1. 프로젝트 폴더에서 `start-ngrok.bat` 더블클릭
2. 자동으로 Next.js 서버와 ngrok 터널이 시작됩니다
3. 터널 URL이 콘솔에 표시됩니다 (예: `https://xxxx-xx-xxx-xxx.ngrok-free.app`)

### 방법 2: 수동 실행

**터미널 1: Next.js 서버 실행**
```powershell
npm run dev
```

**터미널 2: ngrok 터널 생성**
```powershell
ngrok http 3000
```

출력 예시:
```
Forwarding   https://xxxx-xx-xxx-xxx.ngrok-free.app -> http://localhost:3000
```

## 📱 모바일에서 접속

1. ngrok이 제공한 **HTTPS URL** 복사 (예: `https://xxxx-xx-xxx-xxx.ngrok-free.app`)
2. 모바일 브라우저에서 해당 URL 접속
3. 카메라 권한 요청 시 **"허용"** 선택

## ⚠️ 주의사항

### ngrok 무료 버전 제한
- **세션 시간 제한**: 2시간 (재연결 필요)
- **연결 수 제한**: 동시 연결 제한 있음
- **URL 변경**: 재시작 시마다 URL이 변경됨

### ngrok 경고 페이지 (중요!)
**무한 로딩의 주요 원인 중 하나입니다!**

첫 접속 시 ngrok 경고 페이지가 표시됩니다:
1. **"Visit Site"** 또는 **"Continue to Site"** 버튼을 **반드시 클릭**해야 합니다
2. 경고 페이지를 건너뛰지 않으면 무한 로딩이 발생할 수 있습니다
3. 경고 페이지가 보이지 않으면 브라우저 캐시를 삭제하고 다시 시도하세요

**경고 페이지 우회 방법:**
ngrok 실행 시 `--host-header` 옵션 사용:
```powershell
ngrok http 3001 --host-header=rewrite
```

### 보안 고려사항
- ngrok URL은 누구나 접근 가능합니다
- 테스트 중에만 사용하고, 완료 후 터널을 종료하세요
- 프로덕션 환경에서는 사용하지 마세요

## 🔧 문제 해결

### 무한 로딩 문제 해결

**1. ngrok 경고 페이지 확인**
- 모바일 브라우저에서 ngrok URL 접속 시 경고 페이지가 표시되는지 확인
- **"Visit Site"** 버튼을 반드시 클릭
- 경고 페이지를 건너뛰면 무한 로딩 발생

**2. ngrok 웹 인터페이스 확인**
- PC 브라우저에서 `http://127.0.0.1:4040` 접속
- **"HTTP Requests"** 탭에서 요청이 들어오는지 확인
- 요청이 보이면 터널은 정상, 응답 문제일 수 있음

**3. Next.js 서버 확인**
- 터미널에서 Next.js 서버 로그 확인
- 에러 메시지가 있는지 확인
- 서버가 정상적으로 시작되었는지 확인

**4. 포트 불일치 확인**
- ngrok이 포워딩하는 포트와 Next.js 서버 포트가 일치하는지 확인
- 예: ngrok이 `3001`로 포워딩하면 Next.js도 `3001`에서 실행되어야 함

**5. host-header 옵션 사용**
```powershell
ngrok http 3001 --host-header=rewrite
```

**6. 브라우저 캐시 삭제**
- 모바일 브라우저에서 캐시 및 쿠키 삭제
- 시크릿/프라이빗 모드에서 테스트

### ngrok이 실행되지 않을 때
```powershell
# ngrok 설치 확인
ngrok version

# 인증 토큰 확인
ngrok config check
```

### 포트가 이미 사용 중일 때
```powershell
# 다른 포트 사용
ngrok http 3001

# Next.js도 같은 포트로 실행
npm run dev -- -p 3001
```

### 카메라가 여전히 작동하지 않을 때
1. ✅ HTTPS로 접속 중인지 확인 (ngrok은 자동 HTTPS)
2. ✅ 모바일 브라우저에서 사이트별 카메라 권한 허용
3. ✅ ngrok 경고 페이지를 통과했는지 확인

## 💡 팁

### 고정 URL 사용 (유료 플랜)
- 유료 플랜에서는 고정 도메인 사용 가능
- 테스트 시 URL 변경 없이 사용 가능

### 로컬 네트워크와 비교
- **로컬 네트워크 (192.168.x.x)**: 같은 WiFi 필요, 방화벽 설정 필요
- **ngrok**: 인터넷 연결만 있으면 됨, HTTPS 자동 제공

## 📝 요약

1. ✅ ngrok 계정 생성 및 설치
2. ✅ 인증 토큰 설정
3. ✅ `start-ngrok.bat` 실행 또는 수동으로 `ngrok http 3000` 실행
4. ✅ 모바일에서 제공된 HTTPS URL 접속
5. ✅ 카메라 권한 허용

## 🆘 추가 도움말

- [ngrok 공식 문서](https://ngrok.com/docs)
- [ngrok Dashboard](https://dashboard.ngrok.com/)
- 프로젝트의 `카메라-권한-설정-가이드.md` 참고















