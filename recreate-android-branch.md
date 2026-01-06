# Android 브랜치 재생성 가이드

## 단계별 실행 명령어

### 1단계: 현재 상태 확인
```bash
cd C:\Projects\cleaning-management-app
git status
git branch
```

### 2단계: main 브랜치로 전환
```bash
git checkout main
```

### 3단계: main 브랜치 최신화
```bash
git pull origin main
```

### 4단계: 기존 feature/android-conversion 삭제
```bash
# 로컬 브랜치 삭제
git branch -D feature/android-conversion

# 원격 브랜치 삭제
git push origin --delete feature/android-conversion
```

### 5단계: main 기반으로 새 브랜치 생성
```bash
git checkout -b feature/android-conversion
```

### 6단계: Android 관련 파일 추가
(아래 파일들을 추가/수정해야 함)

### 7단계: 커밋 및 푸시
```bash
git add .
git commit -m "feat: Android 앱 변환 작업 시작

- Capacitor Android 설정 추가
- 카메라 연속 촬영 기능 구현
- Android 프로젝트 구조 생성
- WebView 카메라 권한 처리 추가"

git push -u origin feature/android-conversion
```
